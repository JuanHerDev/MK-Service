from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_write_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyListResponse, ApiKeyOut
from app.services import api_key_service

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.post("", response_model=ApiKeyCreated, status_code=201)
def create_api_key(
    body: ApiKeyCreate,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an API key. The full secret is returned only in this response."""
    return api_key_service.create_api_key(
        db, membership=membership, user_id=current_user.user_id, data=body
    )


@router.get("", response_model=ApiKeyListResponse)
def list_api_keys(
    active_only: bool = Query(False),
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    items = api_key_service.list_api_keys(
        db, membership=membership, active_only=active_only
    )
    return ApiKeyListResponse(items=items, total=len(items))


@router.post("/{api_key_id}/revoke", response_model=ApiKeyOut)
def revoke_api_key(
    api_key_id: int,
    membership: OrganizationMember = Depends(require_write_role),
    db: Session = Depends(get_db),
):
    """Soft-revoke: is_active = false. The secret can no longer authenticate."""
    return api_key_service.revoke_api_key(
        db, membership=membership, api_key_id=api_key_id
    )