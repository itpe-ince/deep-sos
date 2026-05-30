"""v2: issues 테이블 V2 전환 — stage/track ENUM + region + PostGIS location + trigram

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-30 00:02:00

설계 근거: docs/02-design/features/uscp-v2.design.md §3.1, §3.3, §5.2
- M02-19 의제 트랙 라벨 3종 → issue_track ENUM + issues.track 컬럼
- M02-20 키워드 검색 → pg_trgm + trigram 인덱스 (title, body)
- §3.3 region 필터 → region ENUM + issues.region 컬럼 (V1 campus_id 와 병행)
- §5.2 6단계 워크플로우 → issues.stage ENUM + body 컬럼 (description 보조)
- §3.1 PostGIS location → geography(POINT) 컬럼 + gist 인덱스

V1 → V2 issues.status 매핑:
  submitted     → reported
  reviewing     → reviewing
  assigned      → mentor_assigned
  progress      → in_progress
  resolved      → resolved
  rejected      → reviewing (사유 별도 보존, rejected 는 V2 에서 stage 가 아닌 별도 flag — Sprint 2 에서 정밀화)

본 리비전 정책:
- description (V1) 은 보존, body (V2) 는 별도 추가 → 향후 단일화 (Sprint 2 에서 결정)
- campus_id 도 보존 → region ENUM 으로 점진 이행
- PostGIS 가 설치되지 않은 환경은 location 컬럼 skip 처리
- rejected 데이터는 reviewing 으로 변환하되 rejection_reason 컬럼 신설로 사유 보존
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── 1. V2 신규 컬럼 추가 ───────────────────────────
    op.add_column(
        "issues",
        sa.Column(
            "region",
            postgresql.ENUM(
                "daejeon", "gongju", "yesan", "cheonan", "sejong",
                name="region", create_type=False,
            ),
            nullable=True,
            comment="V2 5개 지역 ENUM (M02 광장 필터)",
        ),
    )
    op.add_column(
        "issues",
        sa.Column(
            "track",
            postgresql.ENUM(
                "policy_reflection", "policy_reference", "citizen_autonomy",
                name="issue_track", create_type=False,
            ),
            nullable=True,
            comment="의제 트랙 라벨 3종 — 검토중 단계 진입 시 운영자가 지정 (M02-19)",
        ),
    )
    op.add_column(
        "issues",
        sa.Column(
            "body",
            sa.Text,
            nullable=True,
            comment="V2 본문 (V1 description 과 병행, 추후 단일화)",
        ),
    )
    op.add_column(
        "issues",
        sa.Column(
            "rejection_reason",
            sa.Text,
            nullable=True,
            comment="반려 사유 (M02-14, 30자 이상)",
        ),
    )

    # ── 2. issues.stage ENUM 컬럼 신설 + V1 status 데이터 마이그레이션 ──
    op.add_column(
        "issues",
        sa.Column(
            "stage",
            postgresql.ENUM(
                "reported", "reviewing", "published", "mentor_assigned",
                "in_progress", "resolved",
                name="issue_stage", create_type=False,
            ),
            server_default=sa.text("'reported'::issue_stage"),
            nullable=False,
            comment="V2 6단계 워크플로우 (V1 status 와 병행)",
        ),
    )
    op.execute(
        """
        UPDATE issues SET stage = (
            CASE status
                WHEN 'submitted' THEN 'reported'
                WHEN 'reviewing' THEN 'reviewing'
                WHEN 'assigned' THEN 'mentor_assigned'
                WHEN 'progress' THEN 'in_progress'
                WHEN 'resolved' THEN 'resolved'
                WHEN 'rejected' THEN 'reviewing'
                ELSE 'reported'
            END
        )::issue_stage
        """
    )
    # rejected 였던 의제는 rejection_reason 에 마커 저장 (사유 누락 시 placeholder)
    op.execute(
        """
        UPDATE issues
        SET rejection_reason = COALESCE(rejection_reason, '[V1 rejected — 사유 미보존]')
        WHERE status = 'rejected'
        """
    )

    # ── 3. region 데이터 마이그레이션 (campus → region) ───
    # campus.code 가 'daejeon|gongju|yesan|sejong' 이면 그대로, 아니면 NULL 유지
    op.execute(
        """
        UPDATE issues i
        SET region = c.code::region
        FROM campuses c
        WHERE i.campus_id = c.id
          AND c.code IN ('daejeon', 'gongju', 'yesan', 'sejong')
        """
    )

    # ── 4. body 마이그레이션 (description → body) ────────
    op.execute("UPDATE issues SET body = description WHERE body IS NULL")

    # ── 5. PostGIS location 컬럼 (옵션 — 확장 가용 시) ───
    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE issues ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
        EXCEPTION WHEN undefined_object THEN
            RAISE NOTICE 'postgis not available, skipping location column';
        END $$;
        """
    )
    # 기존 위경도 → location 변환 (PostGIS 가 있을 때만)
    op.execute(
        """
        DO $$ BEGIN
            UPDATE issues
            SET location = ST_SetSRID(ST_MakePoint(location_lng::float, location_lat::float), 4326)::geography
            WHERE location IS NULL
              AND location_lat IS NOT NULL
              AND location_lng IS NOT NULL;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'postgis migration skipped: %', SQLERRM;
        END $$;
        """
    )

    # ── 6. 인덱스 (V2 검색·필터 성능 보장) ─────────────
    op.create_index("ix_issues_region_stage", "issues", ["region", "stage"])
    op.create_index("ix_issues_track", "issues", ["track"])
    op.create_index("ix_issues_stage", "issues", ["stage"])

    # pg_trgm trigram 인덱스 — M02-20 키워드 검색 (title, body)
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

    # PostGIS gist 인덱스 (옵션)
    op.execute(
        """
        DO $$ BEGIN
            CREATE INDEX IF NOT EXISTS ix_issues_location_gist
            ON issues USING gist (location);
        EXCEPTION WHEN undefined_object OR undefined_column THEN
            RAISE NOTICE 'postgis gist index skipped';
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_issues_location_gist")
    op.execute("DROP INDEX IF EXISTS ix_issues_body_trgm")
    op.execute("DROP INDEX IF EXISTS ix_issues_title_trgm")
    op.drop_index("ix_issues_stage", table_name="issues")
    op.drop_index("ix_issues_track", table_name="issues")
    op.drop_index("ix_issues_region_stage", table_name="issues")

    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE issues DROP COLUMN IF EXISTS location;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """
    )

    op.drop_column("issues", "stage")
    op.drop_column("issues", "rejection_reason")
    op.drop_column("issues", "body")
    op.drop_column("issues", "track")
    op.drop_column("issues", "region")
