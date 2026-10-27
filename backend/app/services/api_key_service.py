from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_token
from app.models.api_key import ApiKey
from app.models.organization import OrganizationMember
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyOut
from app.services import audit_service

PREFIX = "mk_live_"
ALLOWED_SCOPES = frozenset({"read", "write"})


def _scopes_list(raw: str | None) -> list[str]:
    if not raw:
        return ["read"]
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x) for x in data]
    except json.JSONDecodeError:
        pass
    return ["read"]


def _to_out(row: ApiKey) -> ApiKeyOut:
    return ApiKeyOut(
        api_key_id=row.api_key_id,
        organization_id=row.organization_id,
        name=row.name,
        key_prefix=row.key_prefix,
        scopes=_scopes_list(row.scopes_json),
        is_active=row.is_active,
        created_by=row.created_by,
        last_used_at=row.last_used_at,
        created_at=row.created_at,
    )


def create_api_key(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    data: ApiKeyCreate,
) -> ApiKeyCreated:
    scopes = [s for s in data.scopes if s in ALLOWED_SCOPES]
    if not scopes:
        scopes = ["read"]

    secret = PREFIX + secrets.token_urlsafe(32)
    key_hash = hash_token(secret)
    key_prefix = secret[:12]  # mk_live_xxxx

    row = ApiKey(
        organization_id=membership.organization_id,
        name=data.name.strip(),
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes_json=json.dumps(scopes),
        is_active=True,
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    audit_service.log_event(
        db,
        action="api_key.created",
        actor_user_id=user_id,
        organization_id=membership.organization_id,
        resource_type="api_key",
        resource_id=row.api_key_id,
        summary=f"API key created: {data.name.strip()}",
        metadata={"name": data.name.strip(), "prefix": key_prefix},
    )
    db.commit()
    db.refresh(row)

    base = _to_out(row)
    return ApiKeyCreated(**base.model_dump(), api_key=secret)


def list_api_keys(
    db: Session,
    *,
    membership: OrganizationMember,
    active_only: bool = False,
) -> list[ApiKeyOut]:
    q = db.query(ApiKey).filter(ApiKey.organization_id == membership.organization_id)
    if active_only:
        q = q.filter(ApiKey.is_active.is_(True))
    rows = q.order_by(ApiKey.api_key_id.desc()).all()
    return [_to_out(r) for r in rows]


def revoke_api_key(
    db: Session,
    *,
    membership: OrganizationMember,
    api_key_id: int,
) -> ApiKeyOut:
    row = (
        db.query(ApiKey)
        .filter(
            ApiKey.api_key_id == api_key_id,
            ApiKey.organization_id == membership.organization_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="API key not found")
    if not row.is_active:
        return _to_out(row)
    row.is_active = False
    audit_service.log_event(
        db,
        action="api_key.revoked",
        actor_user_id=membership.user_id,
        organization_id=membership.organization_id,
        resource_type="api_key",
        resource_id=row.api_key_id,
        summary=f"API key revoked: {row.name}",
        metadata={"name": row.name, "prefix": row.key_prefix},
    )
    db.commit()
    db.refresh(row)
    return _to_out(row)


def resolve_api_key(db: Session, raw_key: str) -> tuple[ApiKey, OrganizationMember]:
    """Validate X-API-Key and return key row + membership of the creator in that org."""
    from sqlalchemy.orm import joinedload

    if not raw_key or not raw_key.startswith(PREFIX):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    key_hash = hash_token(raw_key)
    row = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True))
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )

    membership = (
        db.query(OrganizationMember)
        .options(
            joinedload(OrganizationMember.role),
            joinedload(OrganizationMember.organization),
        )
        .filter(
            OrganizationMember.organization_id == row.organization_id,
            OrganizationMember.user_id == row.created_by,
            OrganizationMember.is_active.is_(True),
        )
        .first()
    )
    if not membership:
        # Fallback: any active owner/auditor in the org
        membership = (
            db.query(OrganizationMember)
            .options(
                joinedload(OrganizationMember.role),
                joinedload(OrganizationMember.organization),
            )
            .filter(
                OrganizationMember.organization_id == row.organization_id,
                OrganizationMember.is_active.is_(True),
            )
            .first()
        )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key organization has no active membership",
        )

    row.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return row, membership
