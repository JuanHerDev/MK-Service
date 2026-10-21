from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    report_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("campaigns.campaign_id", ondelete="CASCADE"), nullable=False, index=True
    )
    report_type: Mapped[str] = mapped_column(String(20), nullable=False)  # executive | technical
    language: Mapped[str] = mapped_column(String(2), default="es", nullable=False)
    report_status: Mapped[str] = mapped_column(String(20), default="generating", nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    generated_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )