from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_read_role, require_write_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignListResponse, CampaignOut, CampaignRerun
from app.services import campaign_service

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.post("", response_model=CampaignOut, status_code=201)
def create_campaign(
    body: CampaignCreate,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaign_service.create_campaign(
        db, membership=membership, user_id=current_user.user_id, data=body
    )


@router.get("", response_model=CampaignListResponse)
def list_campaigns(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    items, total = campaign_service.list_campaigns(
        db, membership=membership, page=page, per_page=per_page
    )
    return CampaignListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    return campaign_service.get_campaign(db, membership=membership, campaign_id=campaign_id)


@router.post("/{campaign_id}/cancel", response_model=CampaignOut)
def cancel_campaign(
    campaign_id: int,
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    return campaign_service.cancel_campaign(db, membership=membership, campaign_id=campaign_id)

@router.post("/{campaign_id}/run", response_model=CampaignOut)
def run_campaign(
    campaign_id: int,
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    """Enqueue (or sync-run) live probes against the campaign target."""
    return campaign_service.run_campaign(
        db, membership=membership, campaign_id=campaign_id
    )



@router.get("/{campaign_id}/compare")
def compare_campaign(
    campaign_id: int,
    against_id: int | None = Query(
        None, description="Baseline campaign id (default: parent_campaign_id)"
    ),
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    """Diff findings vs parent re-run baseline (or against_id)."""
    return campaign_service.compare_campaigns(
        db,
        membership=membership,
        campaign_id=campaign_id,
        against_id=against_id,
    )

@router.post("/{campaign_id}/rerun", response_model=CampaignOut, status_code=201)
def rerun_campaign(
    campaign_id: int,
    body: CampaignRerun,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clone a campaign that has been completed; it will be placed in the queued state. Then POST .../run."""
    return campaign_service.rerun_campaign(
        db,
        membership=membership,
        user_id=current_user.user_id,
        campaign_id=campaign_id,
        data=body,
    )