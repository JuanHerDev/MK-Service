from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    finding_id: int
    campaign_id: int
    title: str
    description: str | None
    recommendation: str | None
    severity: str
    status: str
    category: str
    priority_order: int
    canary_found: bool
    query_used: str | None
    response_excerpt: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class FindingUpdate(BaseModel):
    status: str | None = Field(default=None, description="open|in_progress|resolved|false_positive|accepted_risk")
    recommendation: str | None = None
    priority_order: int | None = Field(default=None, ge=1)
    assigned_to: int | None = None


class FindingCommentCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class FindingCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    comment_id: int
    finding_id: int
    user_id: int
    message: str
    created_at: datetime


class FindingListResponse(BaseModel):
    items: list[FindingOut]
    total: int
    page: int
    per_page: int