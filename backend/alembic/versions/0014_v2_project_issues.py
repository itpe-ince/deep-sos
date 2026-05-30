"""v2 project_issues join table — 의제↔리빙랩 N:M 연결 (M03-14)

Revision ID: 0014
Revises: 0013

H01 해소: M03-14 의제(제보)↔리빙랩 프로젝트 연결을 1:1 단일 FK 에서
N:M join table 로 전환한다.

배경:
- 기존: `livinglab_projects.source_issue_id` (단일 FK, 단 어느 마이그레이션에서도
  생성되지 않아 코드는 broad-except 로 부재를 흡수) + `issues.linked_project_id`
  (0010 에서 생성됨, FK→livinglab_projects, ondelete SET NULL).
- 변경: `project_issues(project_id, issue_id, linked_by, linked_at)` 단일 진실원천.
  UNIQUE(project_id, issue_id) 로 동일 쌍 중복만 차단 — 의제 다중 프로젝트 연결 허용 (N:M).

idempotent: information_schema / inspector 체크 후 생성·백필·drop.
백필은 두 레거시 컬럼이 존재하는 경우에만 수행한다.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | Sequence[str] | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())

    # 1) project_issues join table 신설 (idempotent)
    if "project_issues" not in tables:
        op.create_table(
            "project_issues",
            sa.Column(
                "id",
                sa.UUID(as_uuid=True),
                primary_key=True,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column(
                "project_id",
                sa.UUID(as_uuid=True),
                sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "issue_id",
                sa.UUID(as_uuid=True),
                sa.ForeignKey("issues.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "linked_by",
                sa.UUID(as_uuid=True),
                nullable=True,
                comment="연결을 수행한 운영자 user id",
            ),
            sa.Column(
                "linked_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.UniqueConstraint(
                "project_id", "issue_id", name="uq_project_issues_project_issue"
            ),
            comment="M03-14 의제↔리빙랩 N:M 연결 (단일 진실원천)",
        )
        op.create_index(
            "ix_project_issues_project", "project_issues", ["project_id"]
        )
        op.create_index("ix_project_issues_issue", "project_issues", ["issue_id"])

    # 2) 레거시 단일 FK 데이터 백필 (컬럼 존재 시에만)
    proj_cols = {c["name"] for c in insp.get_columns("livinglab_projects")}
    issue_cols = {c["name"] for c in insp.get_columns("issues")}

    if "source_issue_id" in proj_cols:
        conn.execute(
            sa.text(
                """
                INSERT INTO project_issues (project_id, issue_id)
                SELECT p.id, p.source_issue_id
                FROM livinglab_projects p
                WHERE p.source_issue_id IS NOT NULL
                ON CONFLICT (project_id, issue_id) DO NOTHING
                """
            )
        )

    if "linked_project_id" in issue_cols:
        conn.execute(
            sa.text(
                """
                INSERT INTO project_issues (project_id, issue_id)
                SELECT i.linked_project_id, i.id
                FROM issues i
                WHERE i.linked_project_id IS NOT NULL
                ON CONFLICT (project_id, issue_id) DO NOTHING
                """
            )
        )

    # 3) 레거시 단일 FK 컬럼 제거 (존재 시에만)
    if "source_issue_id" in proj_cols:
        op.drop_column("livinglab_projects", "source_issue_id")
    if "linked_project_id" in issue_cols:
        # 0010 에서 FK(ondelete SET NULL) 로 생성됨 — 컬럼 drop 시 FK 동반 제거됨
        op.drop_column("issues", "linked_project_id")


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    proj_cols = {c["name"] for c in insp.get_columns("livinglab_projects")}
    issue_cols = {c["name"] for c in insp.get_columns("issues")}
    tables = set(insp.get_table_names())

    # 1) 레거시 단일 FK 컬럼 복원
    if "source_issue_id" not in proj_cols:
        op.add_column(
            "livinglab_projects",
            sa.Column("source_issue_id", sa.UUID(as_uuid=True), nullable=True),
        )
    if "linked_project_id" not in issue_cols:
        op.add_column(
            "issues",
            sa.Column(
                "linked_project_id",
                sa.UUID(as_uuid=True),
                sa.ForeignKey("livinglab_projects.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )

    # 2) join table → 단일 FK 역백필 (프로젝트·의제별 최신 1건만 복원)
    if "project_issues" in tables:
        conn.execute(
            sa.text(
                """
                UPDATE livinglab_projects p
                SET source_issue_id = sub.issue_id
                FROM (
                    SELECT DISTINCT ON (project_id) project_id, issue_id
                    FROM project_issues
                    ORDER BY project_id, linked_at DESC
                ) sub
                WHERE p.id = sub.project_id
                """
            )
        )
        conn.execute(
            sa.text(
                """
                UPDATE issues i
                SET linked_project_id = sub.project_id
                FROM (
                    SELECT DISTINCT ON (issue_id) issue_id, project_id
                    FROM project_issues
                    ORDER BY issue_id, linked_at DESC
                ) sub
                WHERE i.id = sub.issue_id
                """
            )
        )
        op.drop_index("ix_project_issues_issue", table_name="project_issues")
        op.drop_index("ix_project_issues_project", table_name="project_issues")
        op.drop_table("project_issues")


# end of migration
