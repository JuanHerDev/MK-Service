from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    target_id: int
    scope_prompt_injection: bool = False
    scope_data_leakage: bool = False
    document_ids: list[int] = Field(default_factory=list)
    config: dict[str, Any] | None = None
    scheduled_at: datetime | None = None  # null = execute immediately, otherwise schedule for later
    run_now: bool = True

    @model_validator(mode="after")
    def at_least_one_scope(self) -> "CampaignCreate":
        if not self.scope_prompt_injection and not self.scope_data_leakage:
            raise ValueError("At least one of scope_prompt_injection or scope_data_leakage must be true")
        return self


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    campaign_id: int
    organization_id: int
    target_id: int
    name: str
    mode: str
    status: str
    scope_prompt_injection: bool
    scope_data_leakage: bool
    progress_percent: int
    scheduled_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    parent_campaign_id: int | None
    created_by: int
    created_at: datetime


class CampaignListResponse(BaseModel):
    items: list[CampaignOut]
    total: int
    page: int
    per_page: int

class CampaignRerun(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    scope_prompt_injection: bool | None = None
    scope_data_leakage: bool | None = None
    document_ids: list[int] | None = None
    config: dict[str, Any] | None = None
    change_config: bool = False  # if false, copy config from parent campaign; if true, use provided config

class CampaignDocumentBrief(BaseModel):
    attack_document_id: int
    name: str
    technique: str | None = None
    category: str | None = None
    scope: str | None = None


class CampaignRef(BaseModel):
    campaign_id: int
    name: str
    status: str
    created_at: datetime | None = None


class CampaignDetailOut(CampaignOut):
    """Full campaign view for UI detail modal."""
    target_name: str | None = None
    created_by_email: str | None = None
    created_by_name: str | None = None
    document_ids: list[int] = Field(default_factory=list)
    documents: list[CampaignDocumentBrief] = Field(default_factory=list)
    findings_count: int = 0
    parent: CampaignRef | None = None
    children: list[CampaignRef] = Field(default_factory=list)
    config: dict[str, Any] | None = None
