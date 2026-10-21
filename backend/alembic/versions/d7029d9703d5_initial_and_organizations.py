"""initial auth and organizations

Revision ID: d7029d9703d5
Revises:
Create Date: 2026-10-09 23:57:51.690884
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d7029d9703d5"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("role_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("role_code", sa.String(length=30), nullable=False),
        sa.Column("role_name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("is_platform", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("role_id"),
        sa.UniqueConstraint("role_code"),
        sa.UniqueConstraint("role_name"),
    )

    op.create_table(
        "user_statuses",
        sa.Column("user_status_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("status_code", sa.String(length=30), nullable=False),
        sa.Column("status_name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("user_status_id"),
        sa.UniqueConstraint("status_code"),
    )

    op.create_table(
        "organizations",
        sa.Column("organization_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("default_language", sa.String(length=2), nullable=False, server_default="es"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("organization_id"),
    )

    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=True),
        sa.Column("is_platform_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("user_status_id", sa.Integer(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_status_id"], ["user_statuses.user_status_id"]),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "organization_members",
        sa.Column("organization_member_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.organization_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.role_id"]),
        sa.PrimaryKeyConstraint("organization_member_id"),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_org_members_user"),
    )
    op.create_index("ix_organization_members_organization_id", "organization_members", ["organization_id"])
    op.create_index("ix_organization_members_user_id", "organization_members", ["user_id"])

    op.create_table(
        "refresh_tokens",
        sa.Column("refresh_token_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("refresh_token_id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("organization_members")
    op.drop_table("users")
    op.drop_table("organizations")
    op.drop_table("user_statuses")
    op.drop_table("roles")