from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_read_role, require_write_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.report import ReportCreate, ReportListResponse, ReportOut
from app.services import report_service

router = APIRouter(tags=["Reports"])


@router.post(
    "/campaigns/{campaign_id}/reports",
    response_model=ReportOut,
    status_code=201,
)
def create_report(
    campaign_id: int,
    body: ReportCreate,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.create_report(
        db,
        membership=membership,
        user_id=current_user.user_id,
        campaign_id=campaign_id,
        data=body,
    )


@router.get("/reports", response_model=ReportListResponse)
def list_reports(
    campaign_id: int | None = Query(None),
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    items = report_service.list_reports(
        db, membership=membership, campaign_id=campaign_id
    )
    return ReportListResponse(items=items, total=len(items))


@router.get("/reports/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    return report_service.get_report(db, membership=membership, report_id=report_id)