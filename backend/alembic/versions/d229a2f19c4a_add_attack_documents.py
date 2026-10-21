"""add attack_documents

Revision ID: d229a2f19c4a
Revises: 4a2a1ee30497
Create Date: 2026-10-20 10:49:48.047159

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd229a2f19c4a'
down_revision: Union[str, None] = '4a2a1ee30497'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attack_documents",
        sa.Column("attack_document_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("attack_category_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("technique", sa.String(100), nullable=True),
        sa.Column("scope", sa.String(20), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("doc_version", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.organization_id"]),
        sa.ForeignKeyConstraint(["attack_category_id"], ["attack_categories.attack_category_id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("attack_document_id"),
    )
    op.create_index("ix_attack_documents_organization_id", "attack_documents", ["organization_id"])


def downgrade() -> None:
    op.drop_table("attack_documents")