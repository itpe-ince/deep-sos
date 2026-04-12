"""initial: campuses + users

Revision ID: 0001
Revises:
Create Date: 2026-04-11 10:00:00

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Extensions ─────────────────────────────
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis"')

    # ── campuses ───────────────────────────────
    op.create_table(
        "campuses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("code", sa.String(10), nullable=False, unique=True),
        sa.Column("livinglab_type", sa.String(100)),
        sa.Column("region", sa.String(100)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ── users ──────────────────────────────────
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(255)),
        sa.Column("role", sa.String(20), nullable=False, server_default="citizen"),
        sa.Column(
            "campus_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("campuses.id", ondelete="SET NULL"),
        ),
        sa.Column("department", sa.String(100)),
        sa.Column("student_number", sa.String(20)),
        sa.Column("organization", sa.String(200)),
        sa.Column("expertise", postgresql.ARRAY(sa.String)),
        sa.Column("oauth_provider", sa.String(20)),
        sa.Column("oauth_id", sa.String(255)),
        sa.Column("profile_image_url", sa.String(500)),
        sa.Column("level", sa.String(20), nullable=False, server_default="newcomer"),
        sa.Column("points", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("email_verified", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_oauth", "users", ["oauth_provider", "oauth_id"])

    # ── Seed: 4개 캠퍼스 ──────────────────────
    op.execute(
        """
        INSERT INTO campuses (name, code, livinglab_type, region) VALUES
          ('대전', 'DJ', '청년정착', '대전광역시'),
          ('공주', 'GJ', '문화재생', '공주시'),
          ('예산', 'YS', '고령자돌봄', '예산군'),
          ('세종', 'SJ', '모빌리티', '세종특별자치시');
        """
    )


def downgrade() -> None:
    op.drop_index("ix_users_oauth", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("campuses")
