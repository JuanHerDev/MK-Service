"""add campaigns and campaign_statuses

Revision ID: 0fe15f26c890
Revises: e5f8b2685e03
Create Date: 2026-10-19 14:34:28.704901

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0fe15f26c890'
down_revision: Union[str, None] = 'e5f8b2685e03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaign_statuses",
        sa.Column("campaign_status_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("status_code", sa.String(30), nullable=False),
        sa.Column("status_name", sa.String(80), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("campaign_status_id"),
        sa.UniqueConstraint("status_code"),
    )
    op.create_table(
        "campaigns",
        sa.Column("campaign_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("connection_mode_id", sa.Integer(), nullable=False),
        sa.Column("campaign_status_id", sa.Integer(), nullable=False),
        sa.Column("scope_prompt_injection", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("scope_data_leakage", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("config_json", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parent_campaign_id", sa.Integer(), nullable=True),
        sa.Column("progress_percent", sa.SmallInteger(), server_default="0", nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.organization_id"]),
        sa.ForeignKeyConstraint(["target_id"], ["targets.target_id"]),
        sa.ForeignKeyConstraint(["connection_mode_id"], ["connection_modes.connection_mode_id"]),
        sa.ForeignKeyConstraint(["campaign_status_id"], ["campaign_statuses.campaign_status_id"]),
        sa.ForeignKeyConstraint(["parent_campaign_id"], ["campaigns.campaign_id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("campaign_id"),
    )
    op.create_index("ix_campaigns_organization_id", "campaigns", ["organization_id"])
    op.create_index("ix_campaigns_target_id", "campaigns", ["target_id"])
    op.create_index("ix_campaigns_campaign_status_id", "campaigns", ["campaign_status_id"])


def downgrade() -> None:
    op.drop_table("campaigns")
    op.drop_table("campaign_statuses")
