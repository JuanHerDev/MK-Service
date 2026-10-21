from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Severity(Base):
    __tablename__ = "severities"

    severity_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    severity_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    severity_name: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[int] = mapped_column(SmallInteger, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class FindingStatus(Base):
    __tablename__ = "finding_statuses"

    finding_status_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    status_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    status_name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AttackCategory(Base):
    __tablename__ = "attack_categories"

    attack_category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    category_name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Finding(Base):
    __tablename__ = "findings"

    finding_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("campaigns.campaign_id", ondelete="CASCADE"), nullable=False, index=True
    )
    attack_category_id: Mapped[int] = mapped_column(
        ForeignKey("attack_categories.attack_category_id"), nullable=False
    )
    severity_id: Mapped[int] = mapped_column(ForeignKey("severities.severity_id"), nullable=False, index=True)
    finding_status_id: Mapped[int] = mapped_column(
        ForeignKey("finding_statuses.finding_status_id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority_order: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    query_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    canary_found: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    severity = relationship("Severity")
    status = relationship("FindingStatus")
    category = relationship("AttackCategory")
    comments = relationship("FindingComment", back_populates="finding", cascade="all, delete-orphan")


class FindingComment(Base):
    __tablename__ = "finding_comments"

    comment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    finding_id: Mapped[int] = mapped_column(
        ForeignKey("findings.finding_id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    finding = relationship("Finding", back_populates="comments")