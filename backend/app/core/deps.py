from collections.abc import Callable
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.permissions import (
    KEYS_ROLES,
    OWNER_ROLES,
    READ_ROLES,
    WRITE_ROLES,
    roles_for,
)
from app.core.security import safe_decode_token
from app.models.organization import OrganizationMember
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> User:
    """JWT Bearer or X-API-Key (resolves to the key creator user)."""
    if x_api_key:
        from app.services.api_key_service import resolve_api_key

        _key, membership = resolve_api_key(db, x_api_key)
        user = (
            db.query(User)
            .options(joinedload(User.status), joinedload(User.memberships))
            .filter(User.user_id == membership.user_id)
            .first()
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key user not found",
            )
        if user.status and user.status.status_code != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not active",
            )
        return user

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token or X-API-Key",
        )

    payload = safe_decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    try:
        user_id = int(sub)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        ) from exc

    user = (
        db.query(User)
        .options(joinedload(User.status), joinedload(User.memberships))
        .filter(User.user_id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if user.status and user.status.status_code != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )
    return user


def get_active_membership(
    current_user: User = Depends(get_current_user),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> OrganizationMember:
    if x_api_key:
        from app.services.api_key_service import resolve_api_key

        _key, membership = resolve_api_key(db, x_api_key)
        return membership

    if current_user.is_platform_admin:
        membership = (
            db.query(OrganizationMember)
            .options(
                joinedload(OrganizationMember.role),
                joinedload(OrganizationMember.organization),
            )
            .filter(
                OrganizationMember.user_id == current_user.user_id,
                OrganizationMember.is_active.is_(True),
            )
            .first()
        )
        if membership:
            return membership
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform admin has no organization membership for this operation",
        )

    membership = (
        db.query(OrganizationMember)
        .options(
            joinedload(OrganizationMember.role),
            joinedload(OrganizationMember.organization),
        )
        .filter(
            OrganizationMember.user_id == current_user.user_id,
            OrganizationMember.is_active.is_(True),
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active organization membership",
        )
    return membership


def _role_code(membership: OrganizationMember) -> str:
    return membership.role.role_code if membership.role else ""


def require_roles(*allowed: str) -> Callable:
    """C.2 — factory: membership must have one of the given role_codes."""
    allowed_set = frozenset(allowed)

    def _dep(
        membership: OrganizationMember = Depends(get_active_membership),
    ) -> OrganizationMember:
        code = _role_code(membership)
        if code not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role: requires one of {sorted(allowed_set)} (got '{code or 'none'}')",
            )
        return membership

    return _dep


def require_action(action: str) -> Callable:
    """C.2 — enforce ROLE_MATRIX action key."""

    def _dep(
        membership: OrganizationMember = Depends(get_active_membership),
    ) -> OrganizationMember:
        allowed = roles_for(action)
        code = _role_code(membership)
        if code not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role for '{action}': requires one of {sorted(allowed)}",
            )
        return membership

    return _dep


def require_write_role(
    membership: OrganizationMember = Depends(get_active_membership),
) -> OrganizationMember:
    code = _role_code(membership)
    if code not in WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role: owner or auditor required",
        )
    return membership


def require_read_role(
    membership: OrganizationMember = Depends(get_active_membership),
) -> OrganizationMember:
    code = _role_code(membership)
    if code not in READ_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role: membership required",
        )
    return membership


def require_owner_role(
    membership: OrganizationMember = Depends(get_active_membership),
) -> OrganizationMember:
    """Members, invites, sensitive org settings."""
    code = _role_code(membership)
    if code not in OWNER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role: owner required",
        )
    return membership


def require_keys_role(
    membership: OrganizationMember = Depends(get_active_membership),
) -> OrganizationMember:
    code = _role_code(membership)
    if code not in KEYS_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role: owner required for API keys",
        )
    return membership


def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin required",
        )
    return current_user
