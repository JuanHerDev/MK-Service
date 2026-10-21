from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_read_role, require_write_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.attack_document import (
    AttackDocumentCreate,
    AttackDocumentListResponse,
    AttackDocumentOut,
)
from app.services import attack_document_service

router = APIRouter(prefix="/attack-documents", tags=["Attack documents"])


@router.get("", response_model=AttackDocumentListResponse)
def list_attack_documents(
    scope: str | None = Query(None, pattern="^(global|organization)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    items, total = attack_document_service.list_documents(
        db, membership=membership, scope=scope, page=page, per_page=per_page
    )
    return AttackDocumentListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("", response_model=AttackDocumentOut, status_code=201)
def create_attack_document(
    body: AttackDocumentCreate,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return attack_document_service.create_document(
        db, membership=membership, user=current_user, data=body
    )


@router.get("/{document_id}", response_model=AttackDocumentOut)
def get_attack_document(
    document_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    return attack_document_service.get_document(
        db, membership=membership, document_id=document_id
    )


@router.delete("/{document_id}", status_code=204)
def delete_attack_document(
    document_id: int,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attack_document_service.deactivate_document(
        db, membership=membership, user=current_user, document_id=document_id
    )
    return None