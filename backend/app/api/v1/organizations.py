from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.organization import MeResponse, MembershipOut, OrganizationOut

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/me", response_model=MeResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(OrganizationMember)
        .options(
            joinedload(OrganizationMember.organization),
            joinedload(OrganizationMember.role),
        )
        .filter(
            OrganizationMember.user_id == current_user.user_id,
            OrganizationMember.is_active.is_(True),
        )
        .first()
    )

    org_out = None
    mem_out = None
    if membership and membership.organization:
        org_out = OrganizationOut.model_validate(membership.organization)
        if membership.role:
            mem_out = MembershipOut(
                organization_id=membership.organization_id,
                role_code=membership.role.role_code,
                role_name=membership.role.role_name,
            )

    if not current_user.is_platform_admin and not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active organization membership",
        )

    return MeResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_platform_admin=current_user.is_platform_admin,
        organization=org_out,
        membership=mem_out,
    )
