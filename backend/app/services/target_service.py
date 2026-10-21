import json
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.organization import OrganizationMember
from app.models.target import ConnectionMode, Target
from app.schemas.target import TargetCreate, TargetOut, TargetUpdate


def _mode_by_code(db: Session, code: str) -> ConnectionMode:
    mode = db.query(ConnectionMode).filter(ConnectionMode.mode_code == code).first()
    if not mode:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection mode '{code}' not seeded. Run seed for connection_modes.",
        )
    return mode


def _to_out(target: Target) -> TargetOut:
    mode_code = target.connection_mode.mode_code if target.connection_mode else "basic"
    return TargetOut(
        target_id=target.target_id,
        organization_id=target.organization_id,
        name=target.name,
        description=target.description,
        mode=mode_code,
        chat_endpoint=target.chat_endpoint,
        upload_endpoint=target.upload_endpoint,
        auth_type=target.auth_type,
        rate_limit_rpm=target.rate_limit_rpm,
        connection_status=target.connection_status,
        last_test_at=target.last_test_at,
        last_test_ok=target.last_test_ok,
        last_test_message=target.last_test_message,
        is_active=target.is_active,
        created_at=target.created_at,
        updated_at=target.updated_at,
    )


def run_connectivity_test(target: Target) -> tuple[bool, str]:
    """Probe chat_endpoint. Returns (ok, message). Does not persist."""
    headers: dict[str, str] = {"Accept": "application/json"}
    if target.headers_extra_json:
        try:
            extra = json.loads(target.headers_extra_json)
            if isinstance(extra, dict):
                headers.update({str(k): str(v) for k, v in extra.items()})
        except json.JSONDecodeError:
            pass

    if target.auth_type == "bearer" and target.auth_value_encrypted:
        headers["Authorization"] = f"Bearer {target.auth_value_encrypted}"
    elif target.auth_type == "api_key" and target.auth_value_encrypted:
        headers["X-API-Key"] = target.auth_value_encrypted

    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            # Prefer lightweight methods; many RAG APIs reject GET — try OPTIONS then GET.
            response = client.options(target.chat_endpoint, headers=headers)
            if response.status_code in (404, 405, 501):
                response = client.get(target.chat_endpoint, headers=headers)
            # 2xx–4xx (except connection failure) means the host answered
            if response.status_code >= 500:
                return False, f"Server error HTTP {response.status_code}"
            return True, f"Reachable HTTP {response.status_code}"
    except httpx.TimeoutException:
        return False, "Connection timed out after 10s"
    except httpx.ConnectError as exc:
        return False, f"Connection failed: {exc!s}"[:480]
    except httpx.HTTPError as exc:
        return False, f"HTTP error: {exc!s}"[:480]


def create_target(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    data: TargetCreate,
) -> TargetOut:
    mode = _mode_by_code(db, data.mode)
    headers_json = json.dumps(data.headers_extra) if data.headers_extra else None

    target = Target(
        organization_id=membership.organization_id,
        name=data.name,
        description=data.description,
        connection_mode_id=mode.connection_mode_id,
        chat_endpoint=data.chat_endpoint,
        upload_endpoint=data.upload_endpoint,
        auth_type=data.auth_type,
        auth_value_encrypted=data.auth_value,  # MVP: store as provided; encrypt later
        headers_extra_json=headers_json,
        rate_limit_rpm=data.rate_limit_rpm,
        connection_status="pending",
        is_active=True,
        created_by=user_id,
    )
    db.add(target)
    db.flush()

    ok, message = run_connectivity_test(target)
    target.last_test_at = datetime.now(timezone.utc)
    target.last_test_ok = ok
    target.last_test_message = message
    target.connection_status = "active" if ok else "error"

    db.commit()
    db.refresh(target)
    target = (
        db.query(Target)
        .options(joinedload(Target.connection_mode))
        .filter(Target.target_id == target.target_id)
        .one()
    )
    return _to_out(target)


def list_targets(
    db: Session,
    *,
    membership: OrganizationMember,
    page: int = 1,
    per_page: int = 20,
    active_only: bool = True,
) -> tuple[list[TargetOut], int]:
    q = db.query(Target).options(joinedload(Target.connection_mode)).filter(
        Target.organization_id == membership.organization_id
    )
    if active_only:
        q = q.filter(Target.is_active.is_(True))
    total = q.count()
    rows = (
        q.order_by(Target.target_id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [_to_out(t) for t in rows], total


def get_target(
    db: Session,
    *,
    membership: OrganizationMember,
    target_id: int,
) -> TargetOut:
    target = (
        db.query(Target)
        .options(joinedload(Target.connection_mode))
        .filter(
            Target.target_id == target_id,
            Target.organization_id == membership.organization_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
    return _to_out(target)


def update_target(
    db: Session,
    *,
    membership: OrganizationMember,
    target_id: int,
    data: TargetUpdate,
) -> TargetOut:
    target = (
        db.query(Target)
        .options(joinedload(Target.connection_mode))
        .filter(
            Target.target_id == target_id,
            Target.organization_id == membership.organization_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")

    payload = data.model_dump(exclude_unset=True)
    if "mode" in payload and payload["mode"] is not None:
        mode = _mode_by_code(db, payload.pop("mode"))
        target.connection_mode_id = mode.connection_mode_id
    if "auth_value" in payload:
        target.auth_value_encrypted = payload.pop("auth_value")
    if "headers_extra" in payload:
        extra = payload.pop("headers_extra")
        target.headers_extra_json = json.dumps(extra) if extra is not None else None

    for key, value in payload.items():
        setattr(target, key, value)

    target.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(target)
    target = (
        db.query(Target)
        .options(joinedload(Target.connection_mode))
        .filter(Target.target_id == target.target_id)
        .one()
    )
    return _to_out(target)


def delete_target(
    db: Session,
    *,
    membership: OrganizationMember,
    target_id: int,
) -> None:
    target = (
        db.query(Target)
        .filter(
            Target.target_id == target_id,
            Target.organization_id == membership.organization_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
    target.is_active = False
    target.connection_status = "inactive"
    target.updated_at = datetime.now(timezone.utc)
    db.commit()


def test_target(
    db: Session,
    *,
    membership: OrganizationMember,
    target_id: int,
) -> TargetOut:
    target = (
        db.query(Target)
        .options(joinedload(Target.connection_mode))
        .filter(
            Target.target_id == target_id,
            Target.organization_id == membership.organization_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")

    ok, message = run_connectivity_test(target)
    target.last_test_at = datetime.now(timezone.utc)
    target.last_test_ok = ok
    target.last_test_message = message
    target.connection_status = "active" if ok else "error"
    target.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(target)
    return _to_out(target)
