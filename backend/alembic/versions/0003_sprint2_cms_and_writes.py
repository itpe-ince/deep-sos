"""sprint2: cms_pages, cms_banners, issue_votes, issue_comments, password_reset_tokens

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-11 20:50:00
"""
from __future__ import annotations

import json
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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


def _uuid_pk() -> sa.Column:  # type: ignore[type-arg]
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        server_default=sa.text("gen_random_uuid()"),
        primary_key=True,
    )


# ─────────────────────────────────────────────────
# Seed data — TipTap JSON for P-02 about, P-04 guide
# ─────────────────────────────────────────────────

_ABOUT_TIPTAP = {
    "type": "doc",
    "content": [
        {
            "type": "heading",
            "attrs": {"level": 1},
            "content": [{"type": "text", "text": "SOS랩 소개"}],
        },
        {
            "type": "paragraph",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "SOS랩은 대학-지역-시민이 함께 지역 문제를 발굴하고, "
                        "리빙랩 방식으로 해결 과정을 실험하며, 그 성과를 "
                        "정책과 현장으로 확산시키는 대학 기반 사회공헌 플랫폼입니다."
                    ),
                },
            ],
        },
        {
            "type": "heading",
            "attrs": {"level": 2},
            "content": [{"type": "text", "text": "운영 주체"}],
        },
        {
            "type": "bulletList",
            "content": [
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "text": "지역사회특화센터 · ESG센터 · 국제협력센터"}
                            ],
                        }
                    ],
                },
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "text": "4개 캠퍼스(대전·공주·예산·세종) 공동 운영"}
                            ],
                        }
                    ],
                },
            ],
        },
    ],
}

_GUIDE_TIPTAP = {
    "type": "doc",
    "content": [
        {
            "type": "heading",
            "attrs": {"level": 1},
            "content": [{"type": "text", "text": "참여 가이드"}],
        },
        {
            "type": "paragraph",
            "content": [
                {
                    "type": "text",
                    "text": "누구나 5단계로 USCP에 참여할 수 있습니다. 로그인만 하면 바로 시작할 수 있어요.",
                }
            ],
        },
        {
            "type": "orderedList",
            "content": [
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "marks": [{"type": "bold"}],
                                    "text": "1. 지역 문제 발견",
                                },
                                {"type": "text", "text": " — 주변에서 발견한 문제를 제안합니다."},
                            ],
                        }
                    ],
                },
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "marks": [{"type": "bold"}], "text": "2. 공감 투표"},
                                {"type": "text", "text": " — 다른 사람의 제안에 공감하고 우선순위를 정합니다."},
                            ],
                        }
                    ],
                },
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "marks": [{"type": "bold"}],
                                    "text": "3. 리빙랩 프로젝트 참여",
                                },
                                {"type": "text", "text": " — 관심 프로젝트에 팀원으로 참여합니다."},
                            ],
                        }
                    ],
                },
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "marks": [{"type": "bold"}], "text": "4. 현장 검증"},
                                {"type": "text", "text": " — 봉사 활동과 필드 테스트에 참여합니다."},
                            ],
                        }
                    ],
                },
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "marks": [{"type": "bold"}], "text": "5. 성과 공유"},
                                {"type": "text", "text": " — 포트폴리오와 성공 사례로 기록됩니다."},
                            ],
                        }
                    ],
                },
            ],
        },
    ],
}


def upgrade() -> None:
    # ── cms_pages ──
    op.create_table(
        "cms_pages",
        _uuid_pk(),
        sa.Column("slug", sa.String(50), unique=True, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content_json", postgresql.JSONB, nullable=False),
        sa.Column("content_html", sa.Text),
        sa.Column("status", sa.String(20), server_default="published", nullable=False),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        *_timestamps(),
    )

    # ── cms_banners ──
    op.create_table(
        "cms_banners",
        _uuid_pk(),
        sa.Column("position", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("subtitle", sa.Text),
        sa.Column("image_url", sa.String(500)),
        sa.Column("link_url", sa.String(500)),
        sa.Column("order_index", sa.Integer, server_default="0", nullable=False),
        sa.Column(
            "is_active", sa.Boolean, server_default=sa.text("true"), nullable=False
        ),
        sa.Column("start_at", sa.DateTime(timezone=True)),
        sa.Column("end_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )

    # ── issue_votes ──
    op.create_table(
        "issue_votes",
        _uuid_pk(),
        sa.Column(
            "issue_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("issues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        *_timestamps(),
        sa.UniqueConstraint("issue_id", "user_id", name="uq_issue_votes_issue_user"),
    )
    op.create_index("idx_issue_votes_issue", "issue_votes", ["issue_id"])

    # ── issue_comments ──
    op.create_table(
        "issue_comments",
        _uuid_pk(),
        sa.Column(
            "issue_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("issues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("issue_comments.id", ondelete="CASCADE"),
        ),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "is_deleted", sa.Boolean, server_default=sa.text("false"), nullable=False
        ),
        *_timestamps(),
    )
    op.create_index(
        "idx_issue_comments_issue",
        "issue_comments",
        ["issue_id", "created_at"],
    )

    # ── password_reset_tokens ──
    op.create_table(
        "password_reset_tokens",
        _uuid_pk(),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index(
        "idx_password_reset_user", "password_reset_tokens", ["user_id"]
    )

    # ── Seed: CMS pages ──
    op.execute(
        sa.text(
            """
            INSERT INTO cms_pages (slug, title, content_json, content_html, status)
            VALUES (:slug, :title, CAST(:content_json AS JSONB), :content_html, 'published')
            """
        ).bindparams(
            slug="about",
            title="SOS랩 소개",
            content_json=json.dumps(_ABOUT_TIPTAP, ensure_ascii=False),
            content_html=(
                "<h1>SOS랩 소개</h1><p>SOS랩은 대학-지역-시민이 함께 지역 문제를 발굴하고, "
                "리빙랩 방식으로 해결 과정을 실험하며, 그 성과를 정책과 현장으로 "
                "확산시키는 대학 기반 사회공헌 플랫폼입니다.</p>"
                "<h2>운영 주체</h2><ul>"
                "<li>지역사회특화센터 · ESG센터 · 국제협력센터</li>"
                "<li>4개 캠퍼스(대전·공주·예산·세종) 공동 운영</li></ul>"
            ),
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO cms_pages (slug, title, content_json, content_html, status)
            VALUES (:slug, :title, CAST(:content_json AS JSONB), :content_html, 'published')
            """
        ).bindparams(
            slug="guide",
            title="참여 가이드",
            content_json=json.dumps(_GUIDE_TIPTAP, ensure_ascii=False),
            content_html=(
                "<h1>참여 가이드</h1><p>누구나 5단계로 USCP에 참여할 수 있습니다. "
                "로그인만 하면 바로 시작할 수 있어요.</p>"
                "<ol>"
                "<li><strong>1. 지역 문제 발견</strong> — 주변에서 발견한 문제를 제안합니다.</li>"
                "<li><strong>2. 공감 투표</strong> — 다른 사람의 제안에 공감하고 우선순위를 정합니다.</li>"
                "<li><strong>3. 리빙랩 프로젝트 참여</strong> — 관심 프로젝트에 팀원으로 참여합니다.</li>"
                "<li><strong>4. 현장 검증</strong> — 봉사 활동과 필드 테스트에 참여합니다.</li>"
                "<li><strong>5. 성과 공유</strong> — 포트폴리오와 성공 사례로 기록됩니다.</li>"
                "</ol>"
            ),
        )
    )

    # ── Seed: CMS banners ──
    op.execute(
        sa.text(
            """
            INSERT INTO cms_banners (position, title, subtitle, order_index, is_active)
            VALUES
                ('hero', '지역 문제, 함께 풀어요', '대학-지역-시민 사회공헌 플랫폼 SOS랩', 0, true),
                ('sub', '리빙랩 프로젝트 참여', '전국 4개 캠퍼스 진행 중', 0, true)
            """
        )
    )


def downgrade() -> None:
    op.drop_index("idx_password_reset_user", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_index("idx_issue_comments_issue", table_name="issue_comments")
    op.drop_table("issue_comments")
    op.drop_index("idx_issue_votes_issue", table_name="issue_votes")
    op.drop_table("issue_votes")
    op.drop_table("cms_banners")
    op.drop_table("cms_pages")
