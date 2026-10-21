from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_read_role, require_write_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.finding import (
    FindingCommentCreate,
    FindingCommentOut,
    FindingListResponse,
    FindingOut,
    FindingUpdate,
)
from app.services import finding_service

router = APIRouter(prefix="/findings", tags=["Findings"])


@router.get("", response_model=FindingListResponse)
def list_findings(
    campaign_id: int | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    items, total = finding_service.list_findings(
        db, membership=membership, campaign_id=campaign_id, page=page, per_page=per_page
    )
    return FindingListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/{finding_id}", response_model=FindingOut)
def get_finding(
    finding_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    return finding_service.get_finding(db, membership=membership, finding_id=finding_id)


@router.patch("/{finding_id}", response_model=FindingOut)
def update_finding(
    finding_id: int,
    body: FindingUpdate,
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    return finding_service.update_finding(
        db, membership=membership, finding_id=finding_id, data=body
    )


@router.get("/{finding_id}/comments", response_model=list[FindingCommentOut])
def list_comments(
    finding_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    return finding_service.list_comments(db, membership=membership, finding_id=finding_id)


@router.post("/{finding_id}/comments", response_model=FindingCommentOut, status_code=201)
def add_comment(
    finding_id: int,
    body: FindingCommentCreate,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return finding_service.add_comment(
        db,
        membership=membership,
        user_id=current_user.user_id,
        finding_id=finding_id,
        message=body.message,
    )