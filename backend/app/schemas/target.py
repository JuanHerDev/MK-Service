from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


class TargetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    mode: Literal["basic", "complete"] = "basic"
    chat_endpoint: str = Field(min_length=8, max_length=500)
    upload_endpoint: str | None = Field(default=None, max_length=500)
    auth_type: Literal["bearer", "api_key", "none"] = "bearer"
    auth_value: str | None = Field(default=None, max_length=500)
    headers_extra: dict[str, Any] | None = None
    rate_limit_rpm: int | None = Field(default=None, gt=0)

    @field_validator("chat_endpoint", "upload_endpoint")
    @classmethod
    def must_be_http_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @model_validator(mode="after")
    def complete_requires_upload(self) -> "TargetCreate":
        if self.mode == "complete" and not self.upload_endpoint:
            raise ValueError("upload_endpoint is required when mode is complete")
        if self.auth_type != "none" and not self.auth_value:
            raise ValueError("auth_value is required when auth_type is not none")
        return self


class TargetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    mode: Literal["basic", "complete"] | None = None
    chat_endpoint: str | None = Field(default=None, min_length=8, max_length=500)
    upload_endpoint: str | None = Field(default=None, max_length=500)
    auth_type: Literal["bearer", "api_key", "none"] | None = None
    auth_value: str | None = Field(default=None, max_length=500)
    headers_extra: dict[str, Any] | None = None
    rate_limit_rpm: int | None = Field(default=None, gt=0)
    is_active: bool | None = None

    @field_validator("chat_endpoint", "upload_endpoint")
    @classmethod
    def must_be_http_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class TargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_id: int
    organization_id: int
    name: str
    description: str | None
    mode: str
    chat_endpoint: str
    upload_endpoint: str | None
    auth_type: str
    rate_limit_rpm: int | None
    headers_extra: dict[str, Any] | None = None
    model: str | None = None
    connection_status: str
    last_test_at: datetime | None
    last_test_ok: bool | None
    last_test_message: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TargetTestResult(BaseModel):
    target_id: int
    connection_status: str
    last_test_ok: bool
    last_test_message: str
    last_test_at: datetime


class TargetListResponse(BaseModel):
    items: list[TargetOut]
    total: int
    page: int
    per_page: int
