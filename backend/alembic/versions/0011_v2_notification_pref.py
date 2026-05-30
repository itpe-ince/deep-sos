"""v2: users.notification_email_enabled 컬럼 추가 (CR-6, M01-09).

설계 근거:
  - feature-spec §M01-09 (이메일 알림 수신 설정)
  - design.md §5.5 6단계 ↔ 알림 매핑
  - Sprint 1 분석 v3.0 CR-6: localStorage → DB 컬럼 마이그레이션

기본값: TRUE — 가입 직후부터 단계 변경 알림 수신 (사용자가 명시적으로 OFF 가능).
법적 의무 발송 (비밀번호 재설정·약관 개정·계정 잠금) 은 본 플래그와 무관.

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-30
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """users.notification_email_enabled 컬럼 추가 + 인덱스 불필요 (단순 토글)."""
    op.add_column(
        "users",
        sa.Column(
            "notification_email_enabled",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("TRUE"),
            comment=(
                "M01-09: 이메일 단계 변경 알림 수신 토글. "
                "비밀번호 재설정·약관 개정 등 의무 발송은 본 플래그와 무관."
            ),
        ),
    )

    # 기존 사용자도 모두 TRUE 로 설정 (가입 시 동의 흐름 거친 것으로 간주)
    op.execute(
        "UPDATE users SET notification_email_enabled = TRUE "
        "WHERE notification_email_enabled IS NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "notification_email_enabled")
