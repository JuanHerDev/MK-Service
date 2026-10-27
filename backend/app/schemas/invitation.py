from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class InvitationCreate(BaseModel):
    email: EmailStr | None = None
    role_code: str = Field(default="auditor", pattern="^(owner|auditor|viewer)$")
    expires_hours: int = Field(default=72, ge=1, le=168)


class InvitationOut(BaseModel):
    invitation_id: int
    organization_id: int
    email: str | None
    role_code: str
    token_prefix: str
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None
    is_active: bool
    created_at: datetime
    # only on create:
    invite_token: str | None = None
    invite_url_path: str | None = None

    model_config = {"from_attributes": True}
