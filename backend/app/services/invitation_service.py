"""Invitations, members, founding-owner rules and owner-role requests."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password, hash_token, verify_password
from app.models.invitation import Invitation
from app.models.organization import Organization, OrganizationMember, OwnerRoleRequest
from app.models.role import Role
from app.models.user import User, UserStatus
from app.schemas.invitation import InvitationCreate, InvitationOut
from app.services import audit_service

# Invitations never grant owner
INVITEABLE_ROLES = frozenset({"auditor", "viewer"})
ASSIGNABLE_ROLES = frozenset({"owner", "auditor", "viewer"})


def _founding_user_id(db: Session, organization_id: int) -> int | None:
    org = db.query(Organization).filter(Organization.organization_id == organization_id).first()
    if org and org.founding_user_id:
        return org.founding_user_id
    row = (
        db.query(OrganizationMember)
        .options(joinedload(OrganizationMember.role))
        .join(Role, OrganizationMember.role_id == Role.role_id)
        .filter(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.is_active.is_(True),
            Role.role_code == "owner",
        )
        .order_by(OrganizationMember.organization_member_id.asc())
        .first()
    )
    return row.user_id if row else None


def _is_founding_owner(db: Session, organization_id: int, user_id: int) -> bool:
    fid = _founding_user_id(db, organization_id)
    return fid is not None and fid == user_id


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
        raise HTTPException(
            status_code=400,
            detail="Las invitaciones solo permiten roles auditor o viewer (no owner)",
        )

    role = _role_by_code(db, data.role_code)
    raw = "mk_inv_" + secrets.token_urlsafe(32)
    inv = Invitation(
        organization_id=membership.organization_id,
        role_id=role.role_id,
        email=data.email.lower() if data.email else None,
        token_hash=hash_token(raw),
        token_prefix=raw[:12],
        invited_by=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=data.expires_hours),
        is_active=True,
    )
    db.add(inv)
    db.flush()
    audit_service.log_event(
        db,
        action="invite.created",
        actor_user_id=user_id,
        organization_id=membership.organization_id,
        resource_type="invitation",
        resource_id=inv.invitation_id,
        summary=f"Invitation created for role={data.role_code}",
        metadata={"email": data.email, "role_code": data.role_code, "expires_hours": data.expires_hours},
    )
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
    return [_to_out(r) for r in q.limit(100).all()]


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
    audit_service.log_event(
        db,
        action="invite.revoked",
        actor_user_id=membership.user_id,
        organization_id=membership.organization_id,
        resource_type="invitation",
        resource_id=inv.invitation_id,
        summary="Invitation revoked",
    )
    db.commit()
    db.refresh(inv)
    return _to_out(inv)


def _load_valid_invite(db: Session, raw_token: str) -> Invitation:
    inv = (
        db.query(Invitation)
        .options(joinedload(Invitation.role), joinedload(Invitation.organization))
        .filter(Invitation.token_hash == hash_token(raw_token))
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
    inv = _load_valid_invite(db, token)
    email_l = email.lower().strip()
    if inv.email and inv.email != email_l:
        raise HTTPException(status_code=400, detail=f"This invitation is restricted to {inv.email}")
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
    audit_service.log_event(
        db,
        action="invite.accepted",
        actor_user_id=user.user_id,
        organization_id=inv.organization_id,
        resource_type="invitation",
        resource_id=inv.invitation_id,
        summary="Invitation accepted (new user)",
        metadata={"email": user.email},
    )
    db.commit()
    return {
        "user_id": user.user_id,
        "email": user.email,
        "organization_id": inv.organization_id,
        "role_code": inv.role.role_code if inv.role else None,
        "message": "Account created and invitation accepted. You can log in.",
    }


def accept_invitation_existing_user(db: Session, *, token: str, user: User) -> dict:
    inv = _load_valid_invite(db, token)
    if inv.email and inv.email != user.email.lower():
        raise HTTPException(status_code=400, detail=f"This invitation is restricted to {inv.email}")

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
        .options(joinedload(OrganizationMember.user), joinedload(OrganizationMember.role))
        .filter(OrganizationMember.organization_id == membership.organization_id)
        .order_by(OrganizationMember.organization_member_id)
        .all()
    )
    founding = _founding_user_id(db, membership.organization_id)
    return [
        {
            "organization_member_id": m.organization_member_id,
            "user_id": m.user_id,
            "email": m.user.email if m.user else None,
            "full_name": m.user.full_name if m.user else None,
            "role_code": m.role.role_code if m.role else None,
            "role_name": m.role.role_name if m.role else None,
            "is_active": m.is_active,
            "created_at": m.created_at,
            "is_founding_owner": bool(founding and m.user_id == founding),
        }
        for m in rows
    ]


def update_member_role(
    db: Session,
    *,
    membership: OrganizationMember,
    member_id: int,
    new_role_code: str,
    actor_user_id: int,
    password: str | None = None,
    request_reason: str | None = None,
) -> dict:
    if new_role_code not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail="Rol no válido")

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
        raise HTTPException(status_code=404, detail="Miembro no encontrado")

    old = target.role.role_code if target.role else None
    if old == new_role_code:
        return {
            "organization_member_id": target.organization_member_id,
            "user_id": target.user_id,
            "email": target.user.email if target.user else None,
            "role_code": old,
            "is_active": target.is_active,
            "updated_by": actor_user_id,
            "status": "unchanged",
        }

    org_id = membership.organization_id
    founding_id = _founding_user_id(db, org_id)
    actor_is_founder = founding_id is not None and actor_user_id == founding_id
    target_is_founder = founding_id is not None and target.user_id == founding_id

    if target_is_founder:
        raise HTTPException(
            status_code=400,
            detail="El responsable inicial de la organización no puede perder el rol de owner",
        )

    if not actor_is_founder and old == "owner":
        raise HTTPException(
            status_code=403,
            detail="Solo el owner inicial puede modificar el rol de otros owners",
        )

    if new_role_code == "owner":
        if actor_is_founder:
            if not password:
                raise HTTPException(
                    status_code=400,
                    detail="Debes confirmar con tu contraseña para otorgar el rol owner",
                )
            actor = db.query(User).filter(User.user_id == actor_user_id).first()
            # IMPORTANT: 403 (not 401) so the frontend does not clear the session
            if not actor or not verify_password(password, actor.password_hash):
                raise HTTPException(status_code=403, detail="Contraseña incorrecta")
        else:
            reason = (request_reason or "").strip()
            if len(reason) < 20:
                raise HTTPException(
                    status_code=400,
                    detail="Indica el motivo (mínimo 20 caracteres) para solicitar el rol owner",
                )
            pending = (
                db.query(OwnerRoleRequest)
                .filter(
                    OwnerRoleRequest.organization_id == org_id,
                    OwnerRoleRequest.target_member_id == member_id,
                    OwnerRoleRequest.status == "pending",
                )
                .first()
            )
            if pending:
                raise HTTPException(
                    status_code=409,
                    detail="Ya hay una solicitud pendiente para este miembro",
                )
            req = OwnerRoleRequest(
                organization_id=org_id,
                target_member_id=member_id,
                target_user_id=target.user_id,
                requested_by_user_id=actor_user_id,
                reason=reason,
                status="pending",
            )
            db.add(req)
            audit_service.log_event(
                db,
                action="owner_request.created",
                actor_user_id=actor_user_id,
                organization_id=org_id,
                resource_type="owner_role_request",
                resource_id=None,
                summary=f"Solicitud de owner para user_id={target.user_id}",
                metadata={"target_user_id": target.user_id, "reason": reason[:200]},
            )
            db.commit()
            db.refresh(req)
            return {
                "status": "pending_approval",
                "request_id": req.request_id,
                "message": "Solicitud enviada al owner inicial para aprobación",
                "target_user_id": target.user_id,
            }

    if old == "owner" and new_role_code != "owner":
        if not actor_is_founder:
            raise HTTPException(
                status_code=403,
                detail="Solo el owner inicial puede quitar el rol owner",
            )
        owners = (
            db.query(OrganizationMember)
            .join(Role, OrganizationMember.role_id == Role.role_id)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.is_active.is_(True),
                Role.role_code == "owner",
            )
            .count()
        )
        if owners <= 1:
            raise HTTPException(status_code=400, detail="No se puede dejar la organización sin owners")

    role = _role_by_code(db, new_role_code)
    target.role_id = role.role_id
    audit_service.log_event(
        db,
        action="member.role_changed",
        actor_user_id=actor_user_id,
        organization_id=org_id,
        resource_type="organization_member",
        resource_id=target.organization_member_id,
        summary=f"Rol {old} -> {new_role_code}",
        metadata={"user_id": target.user_id, "from": old, "to": new_role_code},
    )
    db.commit()
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
        "status": "applied",
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

    if _is_founding_owner(db, membership.organization_id, target.user_id) and not is_active:
        raise HTTPException(
            status_code=400,
            detail="No se puede desactivar al owner inicial de la organización",
        )
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
            raise HTTPException(status_code=400, detail="Cannot deactivate the last active owner")

    target.is_active = is_active
    audit_service.log_event(
        db,
        action="member.activated" if is_active else "member.deactivated",
        actor_user_id=actor_user_id,
        organization_id=membership.organization_id,
        resource_type="organization_member",
        resource_id=target.organization_member_id,
        summary=f"Member is_active={is_active}",
        metadata={"user_id": target.user_id},
    )
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


def preview_invitation(db: Session, *, token: str) -> dict:
    inv = _load_valid_invite(db, token)
    return {
        "email_locked": inv.email,
        "role_code": inv.role.role_code if inv.role else None,
        "role_name": inv.role.role_name if inv.role else None,
        "organization_name": inv.organization.name if inv.organization else None,
        "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
        "token_prefix": inv.token_prefix,
    }


def list_owner_role_requests(db: Session, *, membership: OrganizationMember) -> list[dict]:
    rows = (
        db.query(OwnerRoleRequest)
        .filter(OwnerRoleRequest.organization_id == membership.organization_id)
        .order_by(OwnerRoleRequest.request_id.desc())
        .limit(100)
        .all()
    )
    out = []
    for r in rows:
        target_u = db.query(User).filter(User.user_id == r.target_user_id).first()
        req_u = db.query(User).filter(User.user_id == r.requested_by_user_id).first()
        out.append(
            {
                "request_id": r.request_id,
                "status": r.status,
                "reason": r.reason,
                "target_user_id": r.target_user_id,
                "target_email": target_u.email if target_u else None,
                "target_member_id": r.target_member_id,
                "requested_by_user_id": r.requested_by_user_id,
                "requested_by_email": req_u.email if req_u else None,
                "created_at": r.created_at,
                "reviewed_at": r.reviewed_at,
                "review_note": r.review_note,
            }
        )
    return out


def review_owner_role_request(
    db: Session,
    *,
    membership: OrganizationMember,
    request_id: int,
    actor_user_id: int,
    approve: bool,
    password: str,
    review_note: str | None = None,
) -> dict:
    if not _is_founding_owner(db, membership.organization_id, actor_user_id):
        raise HTTPException(
            status_code=403,
            detail="Solo el owner inicial puede aprobar o rechazar estas solicitudes",
        )

    actor = db.query(User).filter(User.user_id == actor_user_id).first()
    # IMPORTANT: 403 (not 401) so the frontend does not clear the session
    if not actor or not verify_password(password, actor.password_hash):
        raise HTTPException(status_code=403, detail="Contraseña incorrecta")

    req = (
        db.query(OwnerRoleRequest)
        .filter(
            OwnerRoleRequest.request_id == request_id,
            OwnerRoleRequest.organization_id == membership.organization_id,
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"La solicitud ya está {req.status}")

    req.reviewed_by_user_id = actor_user_id
    req.reviewed_at = datetime.now(timezone.utc)
    req.review_note = review_note
    req.status = "approved" if approve else "rejected"

    if approve:
        role = _role_by_code(db, "owner")
        member = (
            db.query(OrganizationMember)
            .options(joinedload(OrganizationMember.role))
            .filter(OrganizationMember.organization_member_id == req.target_member_id)
            .first()
        )
        if not member:
            raise HTTPException(status_code=404, detail="Miembro destino no encontrado")
        if _is_founding_owner(db, membership.organization_id, member.user_id):
            raise HTTPException(status_code=400, detail="Operación no aplicable al owner inicial")
        old_role = member.role.role_code if member.role else None
        member.role_id = role.role_id
        audit_service.log_event(
            db,
            action="owner_request.approved",
            actor_user_id=actor_user_id,
            organization_id=membership.organization_id,
            resource_type="owner_role_request",
            resource_id=req.request_id,
            summary=f"Aprobada promoción a owner user_id={member.user_id}",
            metadata={"from": old_role, "to": "owner"},
        )
    else:
        audit_service.log_event(
            db,
            action="owner_request.rejected",
            actor_user_id=actor_user_id,
            organization_id=membership.organization_id,
            resource_type="owner_role_request",
            resource_id=req.request_id,
            summary=f"Rechazada solicitud owner request_id={req.request_id}",
        )

    db.commit()
    return {"request_id": req.request_id, "status": req.status}
