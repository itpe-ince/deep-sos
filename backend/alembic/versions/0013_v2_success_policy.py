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
    """M03-12 정책반영 메타 컬럼 추가 (성과지표 보고 활용).

    멱등(idempotent) 처리: 0010_v2_new_tables 가 `policy_name` 을 이미 추가하므로
    중복 ADD COLUMN 충돌을 피하려 `IF NOT EXISTS` 가드를 사용한다.
    앱 코드(`models/success_case.py`, `application/success_story_service.py`)가
    정본 컬럼명이며, 표준 컬럼은 `policy_name` + `effective_date` 다.
    (0010 이 별도로 만든 `policy_effective_date`/`policy_detail_body` 는 앱 미사용 orphan.)
    """
    op.execute(
        "ALTER TABLE success_cases "
        "ADD COLUMN IF NOT EXISTS policy_name VARCHAR(200)"
    )
    op.execute(
        "ALTER TABLE success_cases "
        "ADD COLUMN IF NOT EXISTS effective_date DATE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE success_cases DROP COLUMN IF EXISTS effective_date")
    op.execute("ALTER TABLE success_cases DROP COLUMN IF EXISTS policy_name")
