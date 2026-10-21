"""add findings feature

Revision ID: 4a2a1ee30497
Revises: 0fe15f26c890
Create Date: 2026-10-20 09:57:10.191813

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a2a1ee30497'
down_revision: Union[str, None] = '0fe15f26c890'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "severities",
        sa.Column("severity_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("severity_code", sa.String(20), nullable=False),
        sa.Column("severity_name", sa.String(50), nullable=False),
        sa.Column("level", sa.SmallInteger(), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("severity_id"),
        sa.UniqueConstraint("severity_code"),
        sa.UniqueConstraint("level"),
    )
    op.create_table(
        "finding_statuses",
        sa.Column("finding_status_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("status_code", sa.String(30), nullable=False),
        sa.Column("status_name", sa.String(80), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("finding_status_id"),
        sa.UniqueConstraint("status_code"),
    )
    op.create_table(
        "attack_categories",
        sa.Column("attack_category_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_code", sa.String(40), nullable=False),
        sa.Column("category_name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("attack_category_id"),
        sa.UniqueConstraint("category_code"),
    )
    op.create_table(
        "findings",
        sa.Column("finding_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("attack_category_id", sa.Integer(), nullable=False),
        sa.Column("severity_id", sa.Integer(), nullable=False),
        sa.Column("finding_status_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("priority_order", sa.Integer(), server_default="100", nullable=False),
        sa.Column("query_used", sa.Text(), nullable=True),
        sa.Column("response_excerpt", sa.Text(), nullable=True),
        sa.Column("canary_found", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("assigned_to", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.campaign_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["attack_category_id"], ["attack_categories.attack_category_id"]),
        sa.ForeignKeyConstraint(["severity_id"], ["severities.severity_id"]),
        sa.ForeignKeyConstraint(["finding_status_id"], ["finding_statuses.finding_status_id"]),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("finding_id"),
    )
    op.create_index("ix_findings_campaign_id", "findings", ["campaign_id"])
    op.create_index("ix_findings_severity_id", "findings", ["severity_id"])
    op.create_index("ix_findings_finding_status_id", "findings", ["finding_status_id"])

    op.create_table(
        "finding_comments",
        sa.Column("comment_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("finding_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["finding_id"], ["findings.finding_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("comment_id"),
    )
    op.create_index("ix_finding_comments_finding_id", "finding_comments", ["finding_id"])


def downgrade() -> None:
    op.drop_table("finding_comments")
    op.drop_table("findings")
    op.drop_table("attack_categories")
    op.drop_table("finding_statuses")
    op.drop_table("severities")
