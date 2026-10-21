from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CampaignStatus(Base):
    __tablename__ = "campaign_statuses"

    campaign_status_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    status_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    status_name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    campaigns = relationship("Campaign", back_populates="status")


class Campaign(Base):
    __tablename__ = "campaigns"

    campaign_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.organization_id"), nullable=False, index=True
    )
    target_id: Mapped[int] = mapped_column(ForeignKey("targets.target_id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    connection_mode_id: Mapped[int] = mapped_column(
        ForeignKey("connection_modes.connection_mode_id"), nullable=False
    )
    campaign_status_id: Mapped[int] = mapped_column(
        ForeignKey("campaign_statuses.campaign_status_id"), nullable=False, index=True
    )
    scope_prompt_injection: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scope_data_leakage: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    parent_campaign_id: Mapped[int | None] = mapped_column(
        ForeignKey("campaigns.campaign_id"), nullable=True, index=True
    )
    progress_percent: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    status = relationship("CampaignStatus", back_populates="campaigns")
    parent = relationship("Campaign", remote_side="Campaign.campaign_id")
    target = relationship("Target")