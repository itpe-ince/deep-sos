"""sprint5: performance indexes

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-12 11:40:00
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 이슈 필터 쿼리 가속 (campus + status + 정렬)
    op.create_index(
        "idx_issues_campus_status",
        "issues",
        ["campus_id", "status"],
    )
    op.create_index(
        "idx_issues_created_at",
        "issues",
        ["created_at"],
        postgresql_using="btree",
    )
    op.create_index(
        "idx_issues_category",
        "issues",
        ["category"],
    )

    # 프로젝트 상태/phase 필터
    op.create_index(
        "idx_projects_status_phase",
        "livinglab_projects",
        ["status", "phase"],
    )
    op.create_index(
        "idx_projects_campus",
        "livinglab_projects",
        ["campus_id"],
    )

    # 봉사활동 상태 + 시작일 정렬
    op.create_index(
        "idx_volunteers_status_start",
        "volunteer_activities",
        ["status", "start_datetime"],
    )

    # 성공사례 공개 + 최신순
    op.create_index(
        "idx_success_cases_published",
        "success_cases",
        ["is_published", "created_at"],
    )

    # CMS 배너 active + position
    op.create_index(
        "idx_cms_banners_active_position",
        "cms_banners",
        ["is_active", "position", "order_index"],
    )


def downgrade() -> None:
    op.drop_index("idx_cms_banners_active_position", table_name="cms_banners")
    op.drop_index("idx_success_cases_published", table_name="success_cases")
    op.drop_index("idx_volunteers_status_start", table_name="volunteer_activities")
    op.drop_index("idx_projects_campus", table_name="livinglab_projects")
    op.drop_index("idx_projects_status_phase", table_name="livinglab_projects")
    op.drop_index("idx_issues_category", table_name="issues")
    op.drop_index("idx_issues_created_at", table_name="issues")
    op.drop_index("idx_issues_campus_status", table_name="issues")
