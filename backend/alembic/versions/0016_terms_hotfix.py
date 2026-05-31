"""Hotfix: terms_versions·user_term_agreements·terms_kind·users.terms_version_id 결손 멱등 보강.

설계 근거:
  - docs/02-design/features/terms-admin-editor.design.md §7 (Database Migration Recovery)
  - docs/01-plan/features/terms-admin-editor.plan.md FR-08
  - 메모리 규율 [project_migration-discipline]: 앱 코드가 정본, ADD COLUMN IF NOT EXISTS 필수
  - Open Question Q5 해결안: 다른 V2 마이그레이션(0011~0015)과 독립적으로 적용 가능

배경:
  본 환경의 alembic_version 이 0006 에 정체된 상태에서도, 그리고 향후 0007~0015 가 정상 적용된
  환경에서도 충돌 없이 두 번 실행 가능(IF NOT EXISTS / DO $$ guard)하도록 작성한다.

  - 0007 (terms_kind ENUM), 0008 (users.terms_version_id 컬럼+FK), 0010 (terms_versions·
    user_term_agreements 테이블) 의 핵심분을 모두 멱등 포함.
  - 만약 0007~0010 이 이미 적용된 환경에서 본 마이그레이션이 추가로 실행되어도 NO-OP.

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-01
"""
from __future__ import annotations

from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. terms_kind ENUM (0007 의 잔재 보강) ───────────────────
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'terms_kind') THEN
                CREATE TYPE terms_kind AS ENUM ('privacy', 'service');
            END IF;
        END $$;
        """
    )

    # ── 2. users.terms_version_id 컬럼 (0008 의 잔재 보강 — FK 는 4 단계에서) ─
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version_id UUID")

    # ── 3. terms_versions 테이블 (0010 의 잔재 보강) ────────────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS terms_versions (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            kind              terms_kind NOT NULL,
            version           VARCHAR(20) NOT NULL,
            body              TEXT NOT NULL,
            effective_at      TIMESTAMPTZ NOT NULL,
            require_reconsent BOOLEAN NOT NULL DEFAULT FALSE,
            published_at      TIMESTAMPTZ,
            published_by      UUID,
            created_at        TIMESTAMPTZ NOT NULL,
            updated_at        TIMESTAMPTZ NOT NULL
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_terms_versions_effective_at "
        "ON terms_versions(effective_at)"
    )

    # published_by FK (users) — terms_versions 가 새로 생성된 경우만 생성
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'terms_versions'
                  AND constraint_name = 'fk_terms_versions_published_by'
            ) THEN
                ALTER TABLE terms_versions ADD CONSTRAINT fk_terms_versions_published_by
                    FOREIGN KEY (published_by) REFERENCES users(id);
            END IF;
        END $$;
        """
    )

    # ── 4. users.terms_version_id FK → terms_versions(id) ─────
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'users'
                  AND constraint_name = 'fk_users_terms_version'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT fk_users_terms_version
                    FOREIGN KEY (terms_version_id) REFERENCES terms_versions(id);
            END IF;
        END $$;
        """
    )

    # ── 5. user_term_agreements 테이블 (0010 의 잔재 보강) ──────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_term_agreements (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            terms_version_id UUID NOT NULL REFERENCES terms_versions(id) ON DELETE CASCADE,
            agreed_at        TIMESTAMPTZ NOT NULL,
            UNIQUE (user_id, terms_version_id)
        )
        """
    )


def downgrade() -> None:
    """주의: 발행본/동의 이력 데이터가 있는 경우 downgrade 는 데이터 손실을 발생시킨다."""
    op.execute("DROP TABLE IF EXISTS user_term_agreements")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_terms_version")
    op.execute("ALTER TABLE terms_versions DROP CONSTRAINT IF EXISTS fk_terms_versions_published_by")
    op.execute("DROP TABLE IF EXISTS terms_versions")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS terms_version_id")
    op.execute("DROP TYPE IF EXISTS terms_kind")
