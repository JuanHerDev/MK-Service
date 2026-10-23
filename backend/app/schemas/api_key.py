from datetime import datetime

from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    scopes: list[str] = Field(
        default_factory=lambda: ["read", "write"],
        description="Scopes: read, write (campaigns/targets/findings/reports)",
    )


class ApiKeyOut(BaseModel):
    api_key_id: int
    organization_id: int
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    created_by: int
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyOut):
    """Returned only on create — includes the full secret once."""

    api_key: str = Field(description="Full secret. Store it now; it will not be shown again.")


class ApiKeyListResponse(BaseModel):
    items: list[ApiKeyOut]
    total: int