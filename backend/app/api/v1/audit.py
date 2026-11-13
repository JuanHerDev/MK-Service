from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.organization import OrganizationMember
from app.services import audit_service

router = APIRouter(prefix="/audit-events", tags=["Audit"])


class AuditEventOut(BaseModel):
    audit_event_id: int
    organization_id: int | None
    actor_user_id: int | None
    actor_email: str | None = None
    actor_name: str | None = None
    action: str
    resource_type: str | None
    resource_id: str | None
    summary: str | None
    metadata_json: dict | None
    created_at: datetime


class AuditActorOut(BaseModel):
    user_id: int
    email: str
    full_name: str | None
    is_active: bool


@router.get("", response_model=list[AuditEventOut])
def list_audit_events(
    limit: int = Query(100, ge=1, le=200),
    action: str | None = Query(None),
    actor_user_id: int | None = Query(None),
    email: str | None = Query(None, description="Filter by actor email (partial)"),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    resource_type: str | None = Query(None),
    q: str | None = Query(None, description="Free-text search in action/summary/resource"),
    membership: OrganizationMember = Depends(require_roles("owner", "auditor", "admin")),
    db: Session = Depends(get_db),
):
    """History of the organization. Owner / auditor / admin."""
    rows = audit_service.list_events(
        db,
        organization_id=membership.organization_id,
        limit=limit,
        action=action,
        actor_user_id=actor_user_id,
        email=email,
        date_from=date_from,
        date_to=date_to,
        resource_type=resource_type,
        q=q,
    )
    return audit_service.enrich_events(db, rows)


@router.get("/actors", response_model=list[AuditActorOut])
def list_audit_actors(
    membership: OrganizationMember = Depends(require_roles("owner", "auditor", "admin")),
    db: Session = Depends(get_db),
):
    """Usuarios de la org para el filtro del historial."""
    return audit_service.list_actors(db, organization_id=membership.organization_id)
