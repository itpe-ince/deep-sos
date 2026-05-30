"""v2: users 테이블 V2 전환 — 14세 확인·통합 동의·재동의·상태 ENUM

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-30 00:01:00

설계 근거: docs/02-design/features/uscp-v2.design.md §3.1, §3.3
- M01-02 만 14세 이상 확인 → birth_year 컬럼
- M01-03 개인정보·이용약관 통합 동의 → agreed_at + terms_version_id 컬럼
- M01-13 비밀번호 보안 정책 → failed_login_count, locked_until 컬럼
- M07-14 약관 재동의 → terms_version_id (terms_versions FK 는 0010 에서 신설)
- user_role/user_status ENUM 전환 (V1 7종 → V2 4종 매핑)

V1 → V2 user_role 매핑:
  citizen, admin → citizen / operator
  student, professor → mentor (운영자가 직접 부여)
  staff, gov_officer, enterprise → citizen (단일 시민 풀로 통합)

본 리비전 정책:
- 기존 데이터 보존: 컬럼 추가는 NULL 허용으로 시작
- ENUM cast 는 USING 절로 안전 변환 + 미매핑 값은 'citizen' 으로 fallback
- terms_version_id FK 는 0010 에서 추가 (terms_versions 테이블 신설 후)
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── 1. V2 신규 컬럼 추가 ───────────────────────────
    op.add_column(
        "users",
        sa.Column("birth_year", sa.Integer, nullable=True, comment="만 14세 확인용 (M01-02)"),
    )
    op.add_column(
        "users",
        sa.Column(
            "agreed_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="개인정보·이용약관 통합 동의 시점 (M01-03)",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "terms_version_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment="동의한 약관 버전 — 0010 에서 FK 추가",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "failed_login_count",
            sa.Integer,
            server_default=sa.text("0"),
            nullable=False,
            comment="연속 로그인 실패 횟수 (M01-13: 5회 시 잠금)",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "locked_until",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="잠금 만료 시각 (실패 5회 시 30분 잠금)",
        ),
    )

    # ── 2. user_role ENUM 전환 (V1 VARCHAR → V2 ENUM) ─
    # V1 7종 → V2 4종 매핑은 USING 절에서 처리
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role DROP DEFAULT,
        ALTER COLUMN role TYPE user_role USING (
            CASE
                WHEN role IN ('citizen', 'staff', 'gov_officer', 'enterprise') THEN 'citizen'::user_role
                WHEN role = 'admin' THEN 'operator'::user_role
                WHEN role IN ('mentor', 'professor') THEN 'mentor'::user_role
                WHEN role = 'student' THEN 'student'::user_role
                ELSE 'citizen'::user_role
            END
        ),
        ALTER COLUMN role SET DEFAULT 'citizen'::user_role
        """
    )

    # ── 3. user_status ENUM 컬럼 신설 (V1 is_active BOOL 보존) ─
    op.add_column(
        "users",
        sa.Column(
            "status",
            postgresql.ENUM(
                "active", "suspended", "withdrawn", name="user_status", create_type=False
            ),
            server_default=sa.text("'active'::user_status"),
            nullable=False,
            comment="V2 사용자 상태 (V1 is_active 와 병행, 추후 status 단일 사용)",
        ),
    )
    # is_active=false 인 기존 사용자 → status='suspended' 로 마이그레이션
    op.execute(
        """
        UPDATE users SET status = 'suspended'::user_status
        WHERE is_active = false AND status = 'active'::user_status
        """
    )

    # ── 4. 인덱스 보강 ────────────────────────────
    op.create_index("ix_users_role_status", "users", ["role", "status"])
    op.create_index("ix_users_locked_until", "users", ["locked_until"])


def downgrade() -> None:
    op.drop_index("ix_users_locked_until", table_name="users")
    op.drop_index("ix_users_role_status", table_name="users")
    op.drop_column("users", "status")

    # role ENUM → VARCHAR 환원
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role DROP DEFAULT,
        ALTER COLUMN role TYPE VARCHAR(20) USING role::text,
        ALTER COLUMN role SET DEFAULT 'citizen'
        """
    )

    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_count")
    op.drop_column("users", "terms_version_id")
    op.drop_column("users", "agreed_at")
    op.drop_column("users", "birth_year")
