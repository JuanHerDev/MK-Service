from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    organization_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    default_language: Mapped[str] = mapped_column(String(2), default="es", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    members = relationship("OrganizationMember", back_populates="organization")


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_members_user"),
    )

    organization_member_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.organization_id"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.role_id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")
    role = relationship("Role", back_populates="memberships")