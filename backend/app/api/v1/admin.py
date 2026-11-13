from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import require_platform_admin
from app.models.organization import Organization, OrganizationMember
from app.models.role import Role
from app.models.user import User
from app.services import audit_service

router = APIRouter(prefix="/admin", tags=["Platform admin"])


class AdminOrgOut(BaseModel):
    organization_id: int
    name: str
    default_language: str | None = None
    is_active: bool
    member_count: int
    created_at: str | None = None

    model_config = {"from_attributes": True}


class AdminMemberOut(BaseModel):
    organization_member_id: int
    user_id: int
    email: str
    full_name: str | None
    role_code: str
    role_name: str
    is_active: bool
    is_platform_admin: bool


class AdminMemberPatch(BaseModel):
    role_code: str | None = Field(default=None, pattern="^(owner|auditor|viewer)$")
    is_active: bool | None = None


@router.get("/organizations", response_model=list[AdminOrgOut])
def list_organizations(
    q: str | None = Query(None),
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Organization).order_by(Organization.organization_id.desc())
    if q and q.strip():
        query = query.filter(Organization.name.ilike(f"%{q.strip()}%"))
    orgs = query.limit(200).all()
    out: list[AdminOrgOut] = []
    for o in orgs:
        count = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == o.organization_id)
            .count()
        )
        out.append(
            AdminOrgOut(
                organization_id=o.organization_id,
                name=o.name,
                default_language=getattr(o, "default_language", None),
                is_active=bool(o.is_active),
                member_count=count,
                created_at=o.created_at.isoformat() if getattr(o, "created_at", None) else None,
            )
        )
    return out


@router.get("/organizations/{organization_id}/members", response_model=list[AdminMemberOut])
def list_org_members(
    organization_id: int,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.organization_id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    rows = (
        db.query(OrganizationMember)
        .options(joinedload(OrganizationMember.user), joinedload(OrganizationMember.role))
        .filter(OrganizationMember.organization_id == organization_id)
        .order_by(OrganizationMember.organization_member_id)
        .all()
    )
    result: list[AdminMemberOut] = []
    for m in rows:
        u = m.user
        r = m.role
        result.append(
            AdminMemberOut(
                organization_member_id=m.organization_member_id,
                user_id=m.user_id,
                email=u.email if u else "?",
                full_name=u.full_name if u else None,
                role_code=r.role_code if r else "?",
                role_name=r.role_name if r else "?",
                is_active=bool(m.is_active),
                is_platform_admin=bool(u.is_platform_admin) if u else False,
            )
        )
    return result


@router.patch("/organizations/{organization_id}/members/{organization_member_id}", response_model=AdminMemberOut)
def patch_member(
    organization_id: int,
    organization_member_id: int,
    body: AdminMemberPatch,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    m = (
        db.query(OrganizationMember)
        .options(joinedload(OrganizationMember.user), joinedload(OrganizationMember.role))
        .filter(
            OrganizationMember.organization_member_id == organization_member_id,
            OrganizationMember.organization_id == organization_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Membership not found")

    if body.role_code:
        role = db.query(Role).filter(Role.role_code == body.role_code).first()
        if not role:
            raise HTTPException(status_code=400, detail="Unknown role")
        m.role_id = role.role_id
    if body.is_active is not None:
        m.is_active = body.is_active

    audit_service.log_event(
        db,
        action="admin.member_patched",
        actor_user_id=current_user.user_id,
        organization_id=organization_id,
        resource_type="membership",
        resource_id=organization_member_id,
        summary=f"Platform admin patched membership {organization_member_id}",
        metadata=body.model_dump(exclude_none=True),
        commit=False,
    )
    db.commit()
    db.refresh(m)
    u = m.user
    r = m.role
    return AdminMemberOut(
        organization_member_id=m.organization_member_id,
        user_id=m.user_id,
        email=u.email if u else "?",
        full_name=u.full_name if u else None,
        role_code=r.role_code if r else "?",
        role_name=r.role_name if r else "?",
        is_active=bool(m.is_active),
        is_platform_admin=bool(u.is_platform_admin) if u else False,
    )
