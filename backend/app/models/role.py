from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Role(Base):
    __tablename__ = "roles"

    role_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    role_name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_platform: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    memberships = relationship("OrganizationMember", back_populates="role")