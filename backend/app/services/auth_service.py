from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    safe_decode_token,
    verify_password,
)
from app.models.organization import Organization, OrganizationMember
from app.models.role import Role
from app.models.user import RefreshToken, User, UserStatus
from app.schemas.auth import TokenResponse


def _get_status(db: Session, code: str) -> UserStatus:
    status_row = db.query(UserStatus).filter(UserStatus.status_code == code).first()
    if not status_row:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User status '{code}' not seeded",
        )
    return status_row


def _get_role(db: Session, code: str) -> Role:
    role = db.query(Role).filter(Role.role_code == code).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{code}' not seeded",
        )
    return role


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    access = create_access_token(
        subject=str(user.user_id),
        extra={"email": user.email, "is_platform_admin": user.is_platform_admin},
    )
    refresh = create_refresh_token(subject=str(user.user_id))
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        RefreshToken(
            user_id=user.user_id,
            token_hash=hash_token(refresh),
            expires_at=expires,
            revoked=False,
        )
    )
    db.commit()
    return TokenResponse(access_token=access, refresh_token=refresh)


def register_owner(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str | None,
    organization_name: str,
) -> TokenResponse:
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    active = _get_status(db, "active")
    owner_role = _get_role(db, "owner")

    org = Organization(name=organization_name, default_language="es", is_active=True)
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        full_name=full_name,
        is_platform_admin=False,
        user_status_id=active.user_status_id,
        is_verified=True,
    )
    db.add(org)
    db.add(user)
    db.flush()

    db.add(
        OrganizationMember(
            organization_id=org.organization_id,
            user_id=user.user_id,
            role_id=owner_role.role_id,
            is_active=True,
        )
    )
    db.commit()
    db.refresh(user)
    return _issue_tokens(db, user)


def login(db: Session, *, email: str, password: str) -> TokenResponse:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    status_row = db.query(UserStatus).filter(UserStatus.user_status_id == user.user_status_id).first()
    if status_row and status_row.status_code != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )
    return _issue_tokens(db, user)


def refresh_tokens(db: Session, *, refresh_token: str) -> TokenResponse:
    payload = safe_decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    token_row = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hash_token(refresh_token),
            RefreshToken.revoked.is_(False),
        )
        .first()
    )
    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked or unknown",
        )
    if token_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user = db.query(User).filter(User.user_id == token_row.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    status_row = db.query(UserStatus).filter(UserStatus.user_status_id == user.user_status_id).first()
    if status_row and status_row.status_code != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    # Rotate: revoke old refresh
    token_row.revoked = True
    db.commit()
    return _issue_tokens(db, user)


def logout(db: Session, *, refresh_token: str) -> None:
    token_row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(refresh_token))
        .first()
    )
    if token_row and not token_row.revoked:
        token_row.revoked = True
        db.commit()
