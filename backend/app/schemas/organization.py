from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_id: int
    name: str
    default_language: str
    is_active: bool
    created_at: datetime


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_id: int
    role_code: str
    role_name: str


class MeResponse(BaseModel):
    user_id: int
    email: str
    full_name: str | None
    is_platform_admin: bool
    organization: OrganizationOut | None
    membership: MembershipOut | None
