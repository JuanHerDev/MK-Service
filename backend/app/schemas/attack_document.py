from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AttackDocumentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    technique: str | None = Field(default=None, max_length=100)
    category_code: Literal[
        "prompt_injection_direct",
        "prompt_injection_indirect",
        "data_leakage",
    ]
    scope: Literal["global", "organization"] = "organization"
    file_name: str = Field(min_length=1, max_length=255)
    storage_path: str = Field(min_length=1, max_length=500)
    size_bytes: int | None = Field(default=None, ge=0)
    doc_version: str | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def global_only_admin_later(self) -> "AttackDocumentCreate":
        # organization docs always need org from membership; global reserved for platform admin
        return self


class AttackDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    attack_document_id: int
    organization_id: int | None
    name: str
    description: str | None
    technique: str | None
    category: str
    scope: str
    file_name: str
    storage_path: str
    size_bytes: int | None
    doc_version: str | None
    is_active: bool
    created_at: datetime


class AttackDocumentListResponse(BaseModel):
    items: list[AttackDocumentOut]
    total: int
    page: int
    per_page: int