from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_read_role, require_write_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.target import TargetCreate, TargetListResponse, TargetOut, TargetUpdate
from app.services import target_service

router = APIRouter(prefix="/targets", tags=["Targets"])


@router.post("", response_model=TargetOut, status_code=201)
def create_target(
    body: TargetCreate,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea el target y ejecuta prueba de conectividad (active | error)."""
    return target_service.create_target(
        db, membership=membership, user_id=current_user.user_id, data=body
    )


@router.get("", response_model=TargetListResponse)
def list_targets(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    active_only: bool = Query(True),
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    items, total = target_service.list_targets(
        db, membership=membership, page=page, per_page=per_page, active_only=active_only
    )
    return TargetListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/{target_id}", response_model=TargetOut)
def get_target(
    target_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    return target_service.get_target(db, membership=membership, target_id=target_id)


@router.patch("/{target_id}", response_model=TargetOut)
def update_target(
    target_id: int,
    body: TargetUpdate,
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    return target_service.update_target(
        db, membership=membership, target_id=target_id, data=body
    )


@router.delete("/{target_id}", status_code=204)
def delete_target(
    target_id: int,
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    target_service.delete_target(db, membership=membership, target_id=target_id)
    return None


@router.post("/{target_id}/test", response_model=TargetOut)
def test_target(
    target_id: int,
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    """Re-ejecuta la prueba de conectividad contra el chat_endpoint."""
    return target_service.test_target(db, membership=membership, target_id=target_id)
