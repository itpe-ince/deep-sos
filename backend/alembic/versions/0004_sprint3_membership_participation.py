"""sprint3: project_members/milestones/applications + volunteer_participations

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-11 21:30:00
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_pk() -> sa.Column:  # type: ignore[type-arg]
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        server_default=sa.text("gen_random_uuid()"),
        primary_key=True,
    )


def _timestamps() -> tuple[sa.Column, sa.Column]:  # type: ignore[type-arg]
    return (
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def upgrade() -> None:
    # ── project_members ──
    op.create_table(
        "project_members",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), server_default="member", nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        *_timestamps(),
        sa.UniqueConstraint(
            "project_id", "user_id", name="uq_project_members_project_user"
        ),
    )
    op.create_index("idx_project_members_project", "project_members", ["project_id"])
    op.create_index("idx_project_members_user", "project_members", ["user_id"])

    # ── project_milestones ──
    op.create_table(
        "project_milestones",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("due_date", sa.Date),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("order_index", sa.Integer, server_default="0", nullable=False),
        *_timestamps(),
    )
    op.create_index(
        "idx_project_milestones_project", "project_milestones", ["project_id", "order_index"]
    )

    # ── project_applications ──
    op.create_table(
        "project_applications",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.Text),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column(
            "decided_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        *_timestamps(),
        sa.UniqueConstraint(
            "project_id", "user_id", name="uq_project_applications_project_user"
        ),
    )
    op.create_index(
        "idx_project_applications_project",
        "project_applications",
        ["project_id", "status"],
    )

    # ── volunteer_participations ──
    op.create_table(
        "volunteer_participations",
        _uuid_pk(),
        sa.Column(
            "activity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("volunteer_activities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), server_default="applied", nullable=False),
        sa.Column(
            "applied_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("confirmed_at", sa.DateTime(timezone=True)),
        sa.Column("confirmed_hours", sa.Numeric(4, 1)),
        sa.Column("note", sa.Text),
        *_timestamps(),
        sa.UniqueConstraint(
            "activity_id", "user_id", name="uq_volunteer_part_activity_user"
        ),
    )
    op.create_index(
        "idx_volunteer_part_user", "volunteer_participations", ["user_id"]
    )
    op.create_index(
        "idx_volunteer_part_activity", "volunteer_participations", ["activity_id"]
    )


def downgrade() -> None:
    op.drop_index("idx_volunteer_part_activity", table_name="volunteer_participations")
    op.drop_index("idx_volunteer_part_user", table_name="volunteer_participations")
    op.drop_table("volunteer_participations")
    op.drop_index("idx_project_applications_project", table_name="project_applications")
    op.drop_table("project_applications")
    op.drop_index("idx_project_milestones_project", table_name="project_milestones")
    op.drop_table("project_milestones")
    op.drop_index("idx_project_members_user", table_name="project_members")
    op.drop_index("idx_project_members_project", table_name="project_members")
    op.drop_table("project_members")
