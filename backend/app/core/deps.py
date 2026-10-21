from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import safe_decode_token
from app.models.organization import OrganizationMember
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=True)

# Roles that can mutate targets / campaigns
WRITE_ROLES = frozenset({"owner", "auditor", "admin"})
READ_ROLES = frozenset({"owner", "auditor", "viewer", "admin"})


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
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
    db: Session = Depends(get_db),
) -> OrganizationMember:
    if current_user.is_platform_admin:
        # Platform admin may not have a tenant membership; callers should handle org_id explicitly.
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


def require_write_role(
    membership: OrganizationMember = Depends(get_active_membership),
) -> OrganizationMember:
    code = membership.role.role_code if membership.role else ""
    if code not in WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role: owner or auditor required",
        )
    return membership


def require_read_role(
    membership: OrganizationMember = Depends(get_active_membership),
) -> OrganizationMember:
    code = membership.role.role_code if membership.role else ""
    if code not in READ_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role",
        )
    return membership
