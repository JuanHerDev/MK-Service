from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_owner_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.invitation import InvitationCreate, InvitationOut
from app.services import invitation_service
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(tags=["Invitations & Members"])


class AcceptInviteNewUser(BaseModel):
    token: str = Field(min_length=10)
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None


class AcceptInviteExisting(BaseModel):
    token: str = Field(min_length=10)


@router.get("/invitations/preview")
def preview_invitation(token: str = Query(..., min_length=10), db: Session = Depends(get_db)):
    """Public: org name, role and optional locked email for the accept-invite UI."""
    return invitation_service.preview_invitation(db, token=token)


@router.post("/invitations", response_model=InvitationOut, status_code=201)
def create_invitation(
    body: InvitationCreate,
    membership: OrganizationMember = Depends(require_owner_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Owner only. Returns invite_token ONCE — store it; only hash is saved."""
    return invitation_service.create_invitation(
        db, membership=membership, user_id=current_user.user_id, data=body
    )


@router.get("/invitations", response_model=list[InvitationOut])
def list_invitations(
    active_only: bool = Query(True),
    membership: OrganizationMember = Depends(require_owner_role),
    db: Session = Depends(get_db),
):
    return invitation_service.list_invitations(
        db, membership=membership, active_only=active_only
    )


@router.post("/invitations/{invitation_id}/revoke", response_model=InvitationOut)
def revoke_invitation(
    invitation_id: int,
    membership: OrganizationMember = Depends(require_owner_role),
    db: Session = Depends(get_db),
):
    return invitation_service.revoke_invitation(
        db, membership=membership, invitation_id=invitation_id
    )


@router.post("/invitations/accept-new", status_code=201)
def accept_new(body: AcceptInviteNewUser, db: Session = Depends(get_db)):
    """Public: register user with the role embedded in the invitation."""
    return invitation_service.accept_invitation_new_user(
        db,
        token=body.token,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
    )


@router.post("/invitations/accept")
def accept_existing(
    body: AcceptInviteExisting,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authenticated user joins org with invite role."""
    return invitation_service.accept_invitation_existing_user(
        db, token=body.token, user=current_user
    )


@router.get("/members")
def list_members(
    membership: OrganizationMember = Depends(require_owner_role),
    db: Session = Depends(get_db),
):
    """Owner: list organization members and their roles."""
    return {"items": invitation_service.list_members(db, membership=membership)}


class MemberRoleUpdate(BaseModel):
    role_code: str = Field(pattern="^(owner|auditor|viewer)$")
    password: str | None = Field(default=None, description="Required when founding owner grants owner")
    request_reason: str | None = Field(default=None, description="Required when child owner requests owner grant")


class OwnerRequestReview(BaseModel):
    approve: bool
    password: str = Field(min_length=1)
    review_note: str | None = None


class MemberActiveUpdate(BaseModel):
    is_active: bool


@router.patch("/members/{member_id}/role")
def update_member_role(
    member_id: int,
    body: MemberRoleUpdate,
    membership: OrganizationMember = Depends(require_owner_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change a member role. Cannot demote the last owner."""
    return invitation_service.update_member_role(
        db,
        membership=membership,
        member_id=member_id,
        new_role_code=body.role_code,
        actor_user_id=current_user.user_id,
        password=body.password,
        request_reason=body.request_reason,
    )


@router.patch("/members/{member_id}/active")
def set_member_active(
    member_id: int,
    body: MemberActiveUpdate,
    membership: OrganizationMember = Depends(require_owner_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Activate / deactivate member. Cannot deactivate last owner or yourself."""
    return invitation_service.set_member_active(
        db,
        membership=membership,
        member_id=member_id,
        is_active=body.is_active,
        actor_user_id=current_user.user_id,
    )


@router.get("/owner-role-requests")
def list_owner_requests(
    membership: OrganizationMember = Depends(require_owner_role),
    db: Session = Depends(get_db),
):
    return {"items": invitation_service.list_owner_role_requests(db, membership=membership)}


@router.post("/owner-role-requests/{request_id}/review")
def review_owner_request(
    request_id: int,
    body: OwnerRequestReview,
    membership: OrganizationMember = Depends(require_owner_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return invitation_service.review_owner_role_request(
        db,
        membership=membership,
        request_id=request_id,
        actor_user_id=current_user.user_id,
        approve=body.approve,
        password=body.password,
        review_note=body.review_note,
    )
