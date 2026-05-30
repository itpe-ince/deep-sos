"""v2: success_cases 정책반영 컬럼 보강 (M03-12, 분석 D01 결정).

설계 근거:
  - feature-spec §M03-12 (정책 반영 기록 — 정책명·시행일·반영 내용)
  - design.md §3 success_stories policy 분리 보강분
  - 분석문서 D01: success_cases 재사용 + policy_name/effective_date ALTER 추가

기존 success_cases (V1, 0002) 에 이미 존재하는 컬럼:
  - policy_linked BOOL, policy_detail TEXT (정책 반영 내용 본문)
본 마이그레이션 추가분 (M03-12 보강):
  - policy_name VARCHAR(200): 반영된 정책 이름
  - effective_date DATE: 정책 시행일

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-30
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """M03-12 정책반영 메타 컬럼 추가 (성과지표 보고 활용)."""
    op.add_column(
        "success_cases",
        sa.Column(
            "policy_name",
            sa.String(200),
            nullable=True,
            comment="M03-12: 반영된 정책 이름 (글로컬대학 성과지표 보고용)",
        ),
    )
    op.add_column(
        "success_cases",
        sa.Column(
            "effective_date",
            sa.Date,
            nullable=True,
            comment="M03-12: 정책 시행일",
        ),
    )


def downgrade() -> None:
    op.drop_column("success_cases", "effective_date")
    op.drop_column("success_cases", "policy_name")
