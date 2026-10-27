from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_owner_role
from app.models.organization import OrganizationMember
from app.services import audit_service

router = APIRouter(prefix="/audit-events", tags=["Audit"])


class AuditEventOut(BaseModel):
    audit_event_id: int
    organization_id: int | None
    actor_user_id: int | None
    action: str
    resource_type: str | None
    resource_id: str | None
    summary: str | None
    metadata_json: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AuditEventOut])
def list_audit_events(
    limit: int = Query(50, ge=1, le=200),
    action: str | None = Query(None),
    membership: OrganizationMember = Depends(require_owner_role),
    db: Session = Depends(get_db),
):
    """E.1/E.2 — Owner: recent security-relevant events for the organization."""
    rows = audit_service.list_events(
        db,
        organization_id=membership.organization_id,
        limit=limit,
        action=action,
    )
    return [AuditEventOut.model_validate(r) for r in rows]
