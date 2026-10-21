from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ConnectionMode(Base):
    __tablename__ = "connection_modes"

    connection_mode_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mode_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    mode_name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    targets = relationship("Target", back_populates="connection_mode")


class Target(Base):
    __tablename__ = "targets"

    target_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.organization_id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    connection_mode_id: Mapped[int] = mapped_column(
        ForeignKey("connection_modes.connection_mode_id"), nullable=False
    )
    chat_endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    upload_endpoint: Mapped[str | None] = mapped_column(String(500), nullable=True)
    auth_type: Mapped[str] = mapped_column(String(30), default="bearer", nullable=False)
    auth_value_encrypted: Mapped[str | None] = mapped_column(String(500), nullable=True)
    headers_extra_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    rate_limit_rpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    connection_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )
    last_test_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_test_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    last_test_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    connection_mode = relationship("ConnectionMode", back_populates="targets")
