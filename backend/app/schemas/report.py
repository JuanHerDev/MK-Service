from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ReportCreate(BaseModel):
    report_type: Literal["executive", "technical"] = "technical"
    language: Literal["es", "en"] = "es"


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: int
    campaign_id: int
    report_type: str
    language: str
    report_status: str
    file_path: str | None
    size_bytes: int | None
    generated_by: int | None
    generated_at: datetime | None
    expires_at: datetime | None
    created_at: datetime


class ReportListResponse(BaseModel):
    items: list[ReportOut]
    total: int