"""v2 community 게시판 — 협력 네트워크 커뮤니티 (M05-07/08)

Revision ID: 0015
Revises: 0014

설계 근거:
  - feature-spec §M05-07 (커뮤니티 게시글 작성·수정 — 운영자, 상단 고정)
  - feature-spec §M05-08 (커뮤니티 댓글 관리 — 작성=시민+, 조정=운영자)
  - design.md §4.2 M05 (`GET /network/community` 공개 + admin)

테이블:
  - community_posts: 운영자 작성 활동소식·모임 안내 (TipTap body, is_pinned, soft delete)
  - community_post_comments: 시민 회원 작성, 운영자 조정 (is_hidden 숨김 + soft delete)

project_posts/project_post_comments(0010) 패턴 복제. idempotent 가드.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0015"
down_revision: str | Sequence[str] | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())

    if "community_posts" not in tables:
        op.create_table(
            "community_posts",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                server_default=sa.text("gen_random_uuid()"),
                primary_key=True,
            ),
            sa.Column(
                "author_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
                comment="운영자 작성자",
            ),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("body", sa.Text, nullable=False, comment="TipTap HTML"),
            sa.Column(
                "is_pinned",
                sa.Boolean,
                server_default=sa.text("false"),
                nullable=False,
                comment="M05-07 상단 고정",
            ),
            sa.Column("view_count", sa.Integer, server_default=sa.text("0"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True)),
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
        op.create_index(
            "ix_community_posts_pinned_created",
            "community_posts",
            ["is_pinned", "created_at"],
        )

    if "community_post_comments" not in tables:
        op.create_table(
            "community_post_comments",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                server_default=sa.text("gen_random_uuid()"),
                primary_key=True,
            ),
            sa.Column(
                "post_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("community_posts.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "author_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
                comment="시민 회원 작성자",
            ),
            sa.Column("body", sa.Text, nullable=False),
            sa.Column(
                "is_hidden",
                sa.Boolean,
                server_default=sa.text("false"),
                nullable=False,
                comment="M05-08 운영자 숨김 조정",
            ),
            sa.Column("deleted_at", sa.DateTime(timezone=True)),
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
        op.create_index(
            "ix_community_comments_post_created",
            "community_post_comments",
            ["post_id", "created_at"],
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())

    if "community_post_comments" in tables:
        op.drop_index(
            "ix_community_comments_post_created", table_name="community_post_comments"
        )
        op.drop_table("community_post_comments")
    if "community_posts" in tables:
        op.drop_index("ix_community_posts_pinned_created", table_name="community_posts")
        op.drop_table("community_posts")
