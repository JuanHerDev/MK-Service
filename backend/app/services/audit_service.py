from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.audit_event import AuditEvent
from app.models.user import User


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
    actor_user_id: int | None = None,
    email: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[AuditEvent]:
    q = (
        db.query(AuditEvent)
        .filter(AuditEvent.organization_id == organization_id)
        .order_by(AuditEvent.audit_event_id.desc())
    )
    if action:
        q = q.filter(AuditEvent.action == action)
    if actor_user_id is not None:
        q = q.filter(AuditEvent.actor_user_id == actor_user_id)
    if email:
        email_l = email.strip().lower()
        q = q.join(User, AuditEvent.actor_user_id == User.user_id).filter(
            User.email.ilike(f"%{email_l}%")
        )
    if date_from is not None:
        q = q.filter(AuditEvent.created_at >= date_from)
    if date_to is not None:
        q = q.filter(AuditEvent.created_at <= date_to)
    return q.limit(min(limit, 200)).all()


def list_actors(db: Session, *, organization_id: int) -> list[dict]:
    """Users who appear as actors in this org's audit log (for filters)."""
    from app.models.organization import OrganizationMember

    rows = (
        db.query(User.user_id, User.email, User.full_name, OrganizationMember.is_active)
        .join(OrganizationMember, OrganizationMember.user_id == User.user_id)
        .filter(OrganizationMember.organization_id == organization_id)
        .order_by(User.email)
        .all()
    )
    return [
        {
            "user_id": r.user_id,
            "email": r.email,
            "full_name": r.full_name,
            "is_active": r.is_active,
        }
        for r in rows
    ]


def enrich_events(db: Session, events: list[AuditEvent]) -> list[dict]:
    user_ids = {e.actor_user_id for e in events if e.actor_user_id}
    users: dict[int, User] = {}
    if user_ids:
        for u in db.query(User).filter(User.user_id.in_(user_ids)).all():
            users[u.user_id] = u
    out = []
    for e in events:
        u = users.get(e.actor_user_id) if e.actor_user_id else None
        out.append(
            {
                "audit_event_id": e.audit_event_id,
                "organization_id": e.organization_id,
                "actor_user_id": e.actor_user_id,
                "actor_email": u.email if u else None,
                "actor_name": u.full_name if u else None,
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "summary": e.summary,
                "metadata_json": e.metadata_json,
                "created_at": e.created_at,
            }
        )
    return out
