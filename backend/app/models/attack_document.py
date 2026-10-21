from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, BigInteger, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AttackDocument(Base):
    __tablename__ = "attack_documents"

    attack_document_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.organization_id"), nullable=True, index=True
    )
    attack_category_id: Mapped[int] = mapped_column(
        ForeignKey("attack_categories.attack_category_id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    technique: Mapped[str | None] = mapped_column(String(100), nullable=True)
    scope: Mapped[str] = mapped_column(String(20), nullable=False)  # global | organization
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    doc_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    category = relationship("AttackCategory")