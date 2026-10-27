from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent


def log_event(
    db: Session,
    *,
    action: str,
    actor_user_id: int | None = None,
    organization_id: int | None = None,
    resource_type: str | None = None,
    resource_id: str | int | None = None,
    summary: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
    commit: bool = False,
) -> AuditEvent:
    """Append an audit row. Default: no commit (caller owns the transaction)."""
    event = AuditEvent(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        summary=summary,
        metadata_json=metadata,
        ip_address=ip_address,
    )
    db.add(event)
    if commit:
        db.commit()
        db.refresh(event)
    else:
        db.flush()
    return event


def list_events(
    db: Session,
    *,
    organization_id: int,
    limit: int = 50,
    action: str | None = None,
) -> list[AuditEvent]:
    q = (
        db.query(AuditEvent)
        .filter(AuditEvent.organization_id == organization_id)
        .order_by(AuditEvent.audit_event_id.desc())
    )
    if action:
        q = q.filter(AuditEvent.action == action)
    return q.limit(min(limit, 200)).all()
