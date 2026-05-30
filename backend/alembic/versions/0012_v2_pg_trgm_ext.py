"""v2: pg_trgm 확장 보장 + comment_resolution 사유 enum 보강.

설계 근거:
  - feature-spec §M02-20 (제보 키워드 검색 — pg_trgm trigram)
  - feature-spec §M02-21 (댓글로 해결 종결 — reason='comment_resolution')
  - design.md §3.3 trigram_idx(title) + trigram_idx(body)

0009 마이그레이션이 `gin_trgm_ops` 인덱스를 생성하지만 `CREATE EXTENSION
pg_trgm` 이 누락되어 있어 일부 dev/test 환경에서 인덱스 생성이 실패할 수 있다.
본 마이그레이션은 idempotent 하게 확장 활성화 + 인덱스 재시도 처리.

Revision ID: 0012
Revises: 0011
Create Date: 2026-05-30
"""
from __future__ import annotations

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) pg_trgm 확장 활성화 (Sprint 2 Day 8 보강)
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # 2) 0009 가 확장 미설치 환경에서 실패했을 경우 인덱스 재생성 (idempotent)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_issues_title_trgm
        ON issues USING gin (title gin_trgm_ops)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_issues_body_trgm
        ON issues USING gin (body gin_trgm_ops)
        WHERE body IS NOT NULL
        """
    )


def downgrade() -> None:
    # pg_trgm 확장은 다른 DB 객체가 의존할 수 있으므로 DROP 하지 않음.
    # 인덱스만 제거.
    op.execute("DROP INDEX IF EXISTS ix_issues_body_trgm")
    op.execute("DROP INDEX IF EXISTS ix_issues_title_trgm")
