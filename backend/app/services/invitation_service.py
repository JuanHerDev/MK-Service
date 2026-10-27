from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password, hash_token
from app.models.invitation import Invitation
from app.models.organization import OrganizationMember
from app.models.role import Role
from app.models.user import User, UserStatus
from app.schemas.invitation import InvitationCreate, InvitationOut


INVITEABLE_ROLES = frozenset({"owner", "auditor", "viewer"})


def _role_by_code(db: Session, code: str) -> Role:
    role = db.query(Role).filter(Role.role_code == code, Role.is_active.is_(True)).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Role '{code}' not found")
    return role


def _status(db: Session, code: str) -> UserStatus:
    row = db.query(UserStatus).filter(UserStatus.status_code == code).first()
    if not row:
        raise HTTPException(status_code=500, detail=f"User status '{code}' not seeded")
    return row


def _to_out(inv: Invitation, *, raw_token: str | None = None) -> InvitationOut:
    role_code = inv.role.role_code if inv.role else ""
    return InvitationOut(
        invitation_id=inv.invitation_id,
        organization_id=inv.organization_id,
        email=inv.email,
        role_code=role_code,
        token_prefix=inv.token_prefix,
        expires_at=inv.expires_at,
        accepted_at=inv.accepted_at,
        revoked_at=inv.revoked_at,
        is_active=inv.is_active,
        created_at=inv.created_at,
        invite_token=raw_token,
        invite_url_path=f"/accept-invite?token={raw_token}" if raw_token else None,
    )


def create_invitation(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    data: InvitationCreate,
) -> InvitationOut:
    if data.role_code not in INVITEABLE_ROLES:
        raise HTTPException(status_code=400, detail="role_code must be owner, auditor or viewer")

    role = _role_by_code(db, data.role_code)
    raw = "mk_inv_" + secrets.token_urlsafe(32)
    token_hash = hash_token(raw)
    prefix = raw[:12]
    expires = datetime.now(timezone.utc) + timedelta(hours=data.expires_hours)

    inv = Invitation(
        organization_id=membership.organization_id,
        role_id=role.role_id,
        email=data.email.lower() if data.email else None,
        token_hash=token_hash,
        token_prefix=prefix,
        invited_by=user_id,
        expires_at=expires,
        is_active=True,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    inv = (
        db.query(Invitation)
        .options(joinedload(Invitation.role))
        .filter(Invitation.invitation_id == inv.invitation_id)
        .first()
    )
    return _to_out(inv, raw_token=raw)


def list_invitations(
    db: Session,
    *,
    membership: OrganizationMember,
    active_only: bool = True,
) -> list[InvitationOut]:
    q = (
        db.query(Invitation)
        .options(joinedload(Invitation.role))
        .filter(Invitation.organization_id == membership.organization_id)
        .order_by(Invitation.invitation_id.desc())
    )
    if active_only:
        q = q.filter(Invitation.is_active.is_(True), Invitation.accepted_at.is_(None))
    rows = q.limit(100).all()
    return [_to_out(r) for r in rows]


def revoke_invitation(
    db: Session,
    *,
    membership: OrganizationMember,
    invitation_id: int,
) -> InvitationOut:
    inv = (
        db.query(Invitation)
        .options(joinedload(Invitation.role))
        .filter(
            Invitation.invitation_id == invitation_id,
            Invitation.organization_id == membership.organization_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    inv.is_active = False
    inv.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inv)
    return _to_out(inv)


def _load_valid_invite(db: Session, raw_token: str) -> Invitation:
    th = hash_token(raw_token)
    inv = (
        db.query(Invitation)
        .options(joinedload(Invitation.role), joinedload(Invitation.organization))
        .filter(Invitation.token_hash == th)
        .first()
    )
    if not inv or not inv.is_active:
        raise HTTPException(status_code=400, detail="Invalid or revoked invitation")
    if inv.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Invitation already used")
    exp = inv.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")
    return inv


def accept_invitation_new_user(
    db: Session,
    *,
    token: str,
    email: str,
    password: str,
    full_name: str | None,
) -> dict:
    """Public: create user + membership from invite."""
    inv = _load_valid_invite(db, token)
    email_l = email.lower().strip()
    if inv.email and inv.email != email_l:
        raise HTTPException(
            status_code=400,
            detail=f"This invitation is restricted to {inv.email}",
        )
    if db.query(User).filter(User.email == email_l).first():
        raise HTTPException(
            status_code=409,
            detail="Email already registered; log in and use accept-existing endpoint",
        )

    active = _status(db, "active")
    user = User(
        email=email_l,
        password_hash=hash_password(password),
        full_name=full_name,
        is_platform_admin=False,
        user_status_id=active.user_status_id,
        is_verified=True,
    )
    db.add(user)
    db.flush()

    existing_mem = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == inv.organization_id,
            OrganizationMember.user_id == user.user_id,
        )
        .first()
    )
    if existing_mem:
        existing_mem.role_id = inv.role_id
        existing_mem.is_active = True
    else:
        db.add(
            OrganizationMember(
                organization_id=inv.organization_id,
                user_id=user.user_id,
                role_id=inv.role_id,
                is_active=True,
            )
        )

    inv.accepted_at = datetime.now(timezone.utc)
    inv.accepted_by = user.user_id
    inv.is_active = False
    db.commit()

    return {
        "user_id": user.user_id,
        "email": user.email,
        "organization_id": inv.organization_id,
        "role_code": inv.role.role_code if inv.role else None,
        "message": "Account created and invitation accepted. You can log in.",
    }


def accept_invitation_existing_user(
    db: Session,
    *,
    token: str,
    user: User,
) -> dict:
    inv = _load_valid_invite(db, token)
    if inv.email and inv.email != user.email.lower():
        raise HTTPException(
            status_code=400,
            detail=f"This invitation is restricted to {inv.email}",
        )

    mem = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == inv.organization_id,
            OrganizationMember.user_id == user.user_id,
        )
        .first()
    )
    if mem:
        mem.role_id = inv.role_id
        mem.is_active = True
    else:
        db.add(
            OrganizationMember(
                organization_id=inv.organization_id,
                user_id=user.user_id,
                role_id=inv.role_id,
                is_active=True,
            )
        )

    inv.accepted_at = datetime.now(timezone.utc)
    inv.accepted_by = user.user_id
    inv.is_active = False
    db.commit()

    return {
        "user_id": user.user_id,
        "email": user.email,
        "organization_id": inv.organization_id,
        "role_code": inv.role.role_code if inv.role else None,
        "message": "Invitation accepted",
    }


def list_members(db: Session, *, membership: OrganizationMember) -> list[dict]:
    rows = (
        db.query(OrganizationMember)
        .options(
            joinedload(OrganizationMember.user),
            joinedload(OrganizationMember.role),
        )
        .filter(OrganizationMember.organization_id == membership.organization_id)
        .order_by(OrganizationMember.organization_member_id)
        .all()
    )
    out = []
    for m in rows:
        out.append(
            {
                "organization_member_id": m.organization_member_id,
                "user_id": m.user_id,
                "email": m.user.email if m.user else None,
                "full_name": m.user.full_name if m.user else None,
                "role_code": m.role.role_code if m.role else None,
                "role_name": m.role.role_name if m.role else None,
                "is_active": m.is_active,
                "created_at": m.created_at,
            }
        )
    return out


def update_member_role(
    db: Session,
    *,
    membership: OrganizationMember,
    member_id: int,
    new_role_code: str,
    actor_user_id: int,
) -> dict:
    if new_role_code not in INVITEABLE_ROLES:
        raise HTTPException(status_code=400, detail="role_code must be owner, auditor or viewer")

    target = (
        db.query(OrganizationMember)
        .options(joinedload(OrganizationMember.user), joinedload(OrganizationMember.role))
        .filter(
            OrganizationMember.organization_member_id == member_id,
            OrganizationMember.organization_id == membership.organization_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    # Cannot demote the last active owner
    if target.role and target.role.role_code == "owner" and new_role_code != "owner":
        owners = (
            db.query(OrganizationMember)
            .join(Role, OrganizationMember.role_id == Role.role_id)
            .filter(
                OrganizationMember.organization_id == membership.organization_id,
                OrganizationMember.is_active.is_(True),
                Role.role_code == "owner",
            )
            .count()
        )
        if owners <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last active owner of the organization",
            )

    role = _role_by_code(db, new_role_code)
    target.role_id = role.role_id
    db.commit()
    db.refresh(target)
    target = (
        db.query(OrganizationMember)
        .options(joinedload(OrganizationMember.user), joinedload(OrganizationMember.role))
        .filter(OrganizationMember.organization_member_id == member_id)
        .first()
    )
    return {
        "organization_member_id": target.organization_member_id,
        "user_id": target.user_id,
        "email": target.user.email if target.user else None,
        "role_code": target.role.role_code if target.role else None,
        "is_active": target.is_active,
        "updated_by": actor_user_id,
    }


def set_member_active(
    db: Session,
    *,
    membership: OrganizationMember,
    member_id: int,
    is_active: bool,
    actor_user_id: int,
) -> dict:
    target = (
        db.query(OrganizationMember)
        .options(joinedload(OrganizationMember.user), joinedload(OrganizationMember.role))
        .filter(
            OrganizationMember.organization_member_id == member_id,
            OrganizationMember.organization_id == membership.organization_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    if target.user_id == actor_user_id and not is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    if not is_active and target.role and target.role.role_code == "owner":
        owners = (
            db.query(OrganizationMember)
            .join(Role, OrganizationMember.role_id == Role.role_id)
            .filter(
                OrganizationMember.organization_id == membership.organization_id,
                OrganizationMember.is_active.is_(True),
                Role.role_code == "owner",
            )
            .count()
        )
        if owners <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot deactivate the last active owner",
            )

    target.is_active = is_active
    db.commit()
    db.refresh(target)
    return {
        "organization_member_id": target.organization_member_id,
        "user_id": target.user_id,
        "email": target.user.email if target.user else None,
        "role_code": target.role.role_code if target.role else None,
        "is_active": target.is_active,
        "updated_by": actor_user_id,
    }
