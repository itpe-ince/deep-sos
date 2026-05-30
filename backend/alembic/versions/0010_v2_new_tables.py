"""v2: V2 신규 테이블 17개 일괄 신설

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-30 00:03:00

설계 근거: docs/02-design/features/uscp-v2.design.md §3.1, §3.3, §4.2
- M02-15  issue_stage_history (6단계 진행 이력 자동 기록)
- M03-08  timeline_entries (활동 타임라인)
- M03-09  deliverables (산출물)
- M03-15~18 project_posts + project_post_comments (멤버 전용 게시판)
- M04-01~07 mentors + student_teams + team_members + matchings + matching_activities
- M05-01~05 organizations + mous
- M05-06    programs (Design D02 보강분)
- M06-07    contents (notice/event 통합)
- M06-08    attachments (자료실)
- M06-01~05 kpi_indicators + performance_records
- M07-12~14 terms_versions + user_term_agreements
- M08-04~09 audit_logs

본 리비전 정책:
- 모든 테이블은 UUID PK + timestamp + soft delete (deleted_at) 표준
- success_stories 의 policy 분리 (Design D01 보강분): policy_linked BOOL + policy_name + effective_date + policy_detail
- terms_version_id FK 는 users 테이블에 본 리비전에서 추가
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# ── 공통 헬퍼 ──────────────────────────────────────────
def _uuid_pk() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        server_default=sa.text("gen_random_uuid()"),
        primary_key=True,
    )


def _timestamps() -> list[sa.Column]:
    return [
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
    ]


def _user_fk(name: str, *, nullable: bool = True, on_delete: str = "SET NULL") -> sa.Column:
    return sa.Column(
        name,
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete=on_delete),
        nullable=nullable,
    )


# ── upgrade ────────────────────────────────────────────
def upgrade() -> None:
    # ============================================================
    # M07-12~14 terms_versions + user_term_agreements
    # (users.terms_version_id FK 를 본 테이블 신설 후 추가)
    # ============================================================
    op.create_table(
        "terms_versions",
        _uuid_pk(),
        sa.Column(
            "kind",
            postgresql.ENUM("privacy", "service", name="terms_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "require_reconsent",
            sa.Boolean,
            server_default=sa.text("false"),
            nullable=False,
            comment="M07-14 — 새 버전 발행 시 활성 회원 재동의 강제",
        ),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        _user_fk("published_by"),
        *_timestamps(),
        sa.UniqueConstraint("kind", "version", name="uq_terms_kind_version"),
    )
    op.create_index("ix_terms_versions_effective_at", "terms_versions", ["effective_at"])

    # users.terms_version_id FK 추가
    op.create_foreign_key(
        "fk_users_terms_version",
        "users",
        "terms_versions",
        ["terms_version_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "user_term_agreements",
        _uuid_pk(),
        _user_fk("user_id", nullable=False, on_delete="CASCADE"),
        sa.Column(
            "terms_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("terms_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "agreed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "terms_version_id", name="uq_user_terms"),
    )

    # ============================================================
    # M02-15 issue_stage_history (6단계 전환 자동 기록)
    # ============================================================
    op.create_table(
        "issue_stage_history",
        _uuid_pk(),
        sa.Column(
            "issue_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("issues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "prev_stage",
            postgresql.ENUM(
                "reported", "reviewing", "published", "mentor_assigned",
                "in_progress", "resolved",
                name="issue_stage", create_type=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "next_stage",
            postgresql.ENUM(
                "reported", "reviewing", "published", "mentor_assigned",
                "in_progress", "resolved",
                name="issue_stage", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "track",
            postgresql.ENUM(
                "policy_reflection", "policy_reference", "citizen_autonomy",
                name="issue_track", create_type=False,
            ),
            nullable=True,
            comment="reviewing 진입 시 지정된 트랙 (M02-09·19)",
        ),
        _user_fk("actor_id", on_delete="SET NULL"),
        sa.Column("reason", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_issue_stage_history_issue_created",
        "issue_stage_history",
        ["issue_id", "created_at"],
    )

    # ============================================================
    # M04-01~03 mentors
    # ============================================================
    op.create_table(
        "mentors",
        _uuid_pk(),
        _user_fk("user_id", nullable=False, on_delete="CASCADE"),
        sa.Column("affiliation", sa.String(200), comment="소속 (예: 공주대 도시공학과)"),
        sa.Column("expertise", postgresql.ARRAY(sa.String), comment="전문분야 태그"),
        sa.Column(
            "is_active",
            sa.Boolean,
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        _user_fk("granted_by"),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        *_timestamps(),
        sa.UniqueConstraint("user_id", name="uq_mentors_user"),
    )

    # ============================================================
    # M04-04~05 student_teams + team_members
    # ============================================================
    op.create_table(
        "student_teams",
        _uuid_pk(),
        sa.Column("name", sa.String(100), nullable=False),
        _user_fk("leader_id", nullable=False, on_delete="RESTRICT"),
        sa.Column(
            "is_active",
            sa.Boolean,
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("disbanded_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_table(
        "team_members",
        _uuid_pk(),
        sa.Column(
            "team_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("student_teams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        _user_fk("user_id", nullable=False, on_delete="CASCADE"),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_user"),
    )

    # ============================================================
    # M04-06~07 matchings (project ↔ mentor ↔ team)
    # ============================================================
    op.create_table(
        "matchings",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
            comment="V1 livinglab_projects 참조 (V2 projects 단일화는 Sprint 2 에서 결정)",
        ),
        sa.Column(
            "mentor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mentors.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "team_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("student_teams.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "matched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("notified_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(20), server_default=sa.text("'active'"), nullable=False),
        _user_fk("matched_by"),
        *_timestamps(),
    )
    op.create_index("ix_matchings_project", "matchings", ["project_id"])
    op.create_index("ix_matchings_mentor", "matchings", ["mentor_id"])
    op.create_index("ix_matchings_team", "matchings", ["team_id"])

    # ============================================================
    # M04-08 matching_activities (멘토단 활동 기록)
    # ============================================================
    op.create_table(
        "matching_activities",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        _user_fk("author_id", nullable=False, on_delete="SET NULL"),
        sa.Column("activity_date", sa.Date, nullable=False),
        sa.Column(
            "activity_type",
            sa.String(20),
            nullable=False,
            comment="meeting / advice / review",
        ),
        sa.Column("summary", sa.Text, nullable=False),
        *_timestamps(),
    )
    op.create_index(
        "ix_matching_activities_project_date",
        "matching_activities",
        ["project_id", "activity_date"],
    )

    # ============================================================
    # M03-08 timeline_entries (활동 타임라인)
    # ============================================================
    op.create_table(
        "timeline_entries",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entry_date", sa.Date, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text),
        _user_fk("created_by", nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_timeline_project_date", "timeline_entries", ["project_id", "entry_date"])

    # ============================================================
    # M03-09~10 deliverables (산출물)
    # ============================================================
    op.create_table(
        "deliverables",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("stage", sa.String(30), comment="단계별 분류 (자유 입력)"),
        sa.Column("tags", postgresql.ARRAY(sa.String)),
        sa.Column("minio_key", sa.String(500), nullable=False),
        sa.Column("file_size", sa.BigInteger),
        sa.Column("content_type", sa.String(100)),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'"), nullable=False),
        _user_fk("uploaded_by", nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_deliverables_project_stage", "deliverables", ["project_id", "stage"])

    # ============================================================
    # M03-15~18 project_posts + project_post_comments (멤버 전용 게시판)
    # ============================================================
    op.create_table(
        "project_posts",
        _uuid_pk(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        _user_fk("author_id", nullable=False, on_delete="SET NULL"),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("attachment_key", sa.String(500), comment="MinIO key (게시글당 1개, 20MB)"),
        sa.Column("attachment_filename", sa.String(255)),
        sa.Column("is_pinned", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_project_posts_project_created", "project_posts", ["project_id", "created_at"])

    op.create_table(
        "project_post_comments",
        _uuid_pk(),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("project_posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        _user_fk("author_id", nullable=False, on_delete="SET NULL"),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index(
        "ix_project_post_comments_post_created",
        "project_post_comments",
        ["post_id", "created_at"],
    )

    # ============================================================
    # M05-01~05 organizations + mous
    # ============================================================
    op.create_table(
        "organizations",
        _uuid_pk(),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "public", "industry", "academic", "government",
                name="organization_category", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "region",
            postgresql.ENUM(
                "daejeon", "gongju", "yesan", "cheonan", "sejong",
                name="region", create_type=False,
            ),
        ),
        sa.Column("contact", sa.String(200)),
        sa.Column("intro", sa.Text),
        sa.Column(
            "is_active",
            sa.Boolean,
            server_default=sa.text("true"),
            nullable=False,
            comment="M05-09 활성·비활성 토글 (FK 보호)",
        ),
        *_timestamps(),
    )
    op.create_index("ix_organizations_category", "organizations", ["category"])
    op.create_index("ix_organizations_region", "organizations", ["region"])

    op.create_table(
        "mous",
        _uuid_pk(),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
            comment="M05-01 — 활성 MOU 보유 기관은 삭제 차단 (RESTRICT)",
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("signed_at", sa.Date, nullable=False),
        sa.Column("expires_at", sa.Date, nullable=False),
        sa.Column("body", sa.Text),
        sa.Column("attachment_key", sa.String(500)),
        sa.Column(
            "expire_notification_sent_at",
            sa.DateTime(timezone=True),
            comment="M05-04 만료 임박 알림 1회 발송 추적",
        ),
        *_timestamps(),
        sa.CheckConstraint("expires_at > signed_at", name="ck_mous_dates"),
    )
    op.create_index("ix_mous_expires_at", "mous", ["expires_at"])

    # ============================================================
    # M05-06 programs (Design D02 보강분)
    # ============================================================
    op.create_table(
        "programs",
        _uuid_pk(),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column(
            "linked_project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "linked_mentor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mentors.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "linked_team_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("student_teams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "linked_organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        *_timestamps(),
    )

    # ============================================================
    # M06-07 contents (notice/event 통합 게시판)
    # ============================================================
    op.create_table(
        "contents",
        _uuid_pk(),
        sa.Column(
            "category",
            postgresql.ENUM(
                "notice", "event",
                name="content_category", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text, nullable=False, comment="Tiptap WYSIWYG output (DOMPurify 적용)"),
        sa.Column("is_pinned", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("event_at", sa.DateTime(timezone=True), comment="이벤트 일자 (M07-03)"),
        _user_fk("author_id"),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_contents_category_published", "contents", ["category", "published_at"])

    # ============================================================
    # M06-08, M07-15/16 attachments (자료실)
    # ============================================================
    op.create_table(
        "attachments",
        _uuid_pk(),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "guide", "template", "toolkit", "etc",
                name="resource_category", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("tags", postgresql.ARRAY(sa.String)),
        sa.Column("minio_key", sa.String(500), nullable=False),
        sa.Column("file_size", sa.BigInteger),
        sa.Column("content_type", sa.String(100)),
        sa.Column(
            "download_count",
            sa.Integer,
            server_default=sa.text("0"),
            nullable=False,
            comment="M07-16 다운로드 카운트 (atomic UPDATE)",
        ),
        _user_fk("uploaded_by"),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_attachments_category", "attachments", ["category"])
    op.create_index(
        "ix_attachments_download_count",
        "attachments",
        [sa.text("download_count DESC")],
    )

    # ============================================================
    # M06-01~05 kpi_indicators + performance_records
    # ============================================================
    op.create_table(
        "kpi_indicators",
        _uuid_pk(),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("formula", sa.Text),
        sa.Column("unit", sa.String(20)),
        sa.Column("target_value", sa.Numeric(12, 2)),
        sa.Column(
            "auto_count_source",
            sa.String(50),
            comment="자동 집계 source (예: 'resolved_issue')",
        ),
        *_timestamps(),
    )

    op.create_table(
        "performance_records",
        _uuid_pk(),
        sa.Column(
            "kpi_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("kpi_indicators.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("period", sa.String(10), nullable=False, comment="YYYY-MM or YYYY-Q1"),
        sa.Column("value", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "auto_count_source_id",
            postgresql.UUID(as_uuid=True),
            comment="자동 집계 트리거된 객체 ID (예: issue.id)",
        ),
        *_timestamps(),
        sa.UniqueConstraint("kpi_id", "period", "auto_count_source_id", name="uq_perf_record"),
    )
    op.create_index("ix_perf_records_kpi_period", "performance_records", ["kpi_id", "period"])

    # ============================================================
    # M08-04~09 audit_logs (1년 보관 필수)
    # ============================================================
    op.create_table(
        "audit_logs",
        _uuid_pk(),
        _user_fk("actor_id"),
        sa.Column(
            "action",
            postgresql.ENUM(
                "login", "logout", "create", "update", "delete",
                "view_pii", "stage_change",
                name="audit_action", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("target_type", sa.String(50), comment="예: 'user', 'issue', 'mou'"),
        sa.Column("target_id", postgresql.UUID(as_uuid=True)),
        sa.Column("ip", sa.String(45)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("metadata", postgresql.JSONB, comment="action-specific 추가 정보"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index("ix_audit_logs_actor", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_target", "audit_logs", ["target_type", "target_id"])

    # ============================================================
    # success_cases 보강 — Design D01 보강분 (정책 반영 기록 분리)
    # ============================================================
    op.add_column(
        "success_cases",
        sa.Column(
            "policy_name",
            sa.String(200),
            nullable=True,
            comment="M03-12 반영된 정책 이름 (Design D01 분리)",
        ),
    )
    op.add_column(
        "success_cases",
        sa.Column(
            "policy_effective_date",
            sa.Date,
            nullable=True,
            comment="M03-12 정책 시행일",
        ),
    )
    op.add_column(
        "success_cases",
        sa.Column(
            "policy_detail_body",
            sa.Text,
            nullable=True,
            comment="M03-12 정책 반영 본문 (기존 policy_detail 컬럼과 별개로 V2 표준화)",
        ),
    )

    # ============================================================
    # cms_banners 보강 — Design D03 보강분 (URL protocol 검증 트리거)
    # CHECK 제약으로 javascript: 차단 (DB 레벨 1차 방어, 앱 레벨 2차 방어 필수)
    # ============================================================
    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE cms_banners
            ADD CONSTRAINT ck_cms_banners_link_url_protocol
            CHECK (
                link_url IS NULL
                OR link_url ~* '^(https?|mailto):'
                OR link_url ~ '^/'
            );
        EXCEPTION WHEN duplicate_object OR undefined_table OR undefined_column THEN
            RAISE NOTICE 'cms_banners CHECK constraint skipped (table/column missing)';
        END $$;
        """
    )


# ── downgrade ──────────────────────────────────────────
def downgrade() -> None:
    op.execute(
        "ALTER TABLE cms_banners DROP CONSTRAINT IF EXISTS ck_cms_banners_link_url_protocol"
    )
    op.drop_column("success_cases", "policy_detail_body")
    op.drop_column("success_cases", "policy_effective_date")
    op.drop_column("success_cases", "policy_name")

    op.drop_index("ix_audit_logs_target", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor", table_name="audit_logs")
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_perf_records_kpi_period", table_name="performance_records")
    op.drop_table("performance_records")
    op.drop_table("kpi_indicators")

    op.drop_index("ix_attachments_download_count", table_name="attachments")
    op.drop_index("ix_attachments_category", table_name="attachments")
    op.drop_table("attachments")

    op.drop_index("ix_contents_category_published", table_name="contents")
    op.drop_table("contents")

    op.drop_table("programs")

    op.drop_index("ix_mous_expires_at", table_name="mous")
    op.drop_table("mous")

    op.drop_index("ix_organizations_region", table_name="organizations")
    op.drop_index("ix_organizations_category", table_name="organizations")
    op.drop_table("organizations")

    op.drop_index("ix_project_post_comments_post_created", table_name="project_post_comments")
    op.drop_table("project_post_comments")

    op.drop_index("ix_project_posts_project_created", table_name="project_posts")
    op.drop_table("project_posts")

    op.drop_index("ix_deliverables_project_stage", table_name="deliverables")
    op.drop_table("deliverables")

    op.drop_index("ix_timeline_project_date", table_name="timeline_entries")
    op.drop_table("timeline_entries")

    op.drop_index("ix_matching_activities_project_date", table_name="matching_activities")
    op.drop_table("matching_activities")

    op.drop_index("ix_matchings_team", table_name="matchings")
    op.drop_index("ix_matchings_mentor", table_name="matchings")
    op.drop_index("ix_matchings_project", table_name="matchings")
    op.drop_table("matchings")

    op.drop_table("team_members")
    op.drop_table("student_teams")
    op.drop_table("mentors")

    op.drop_index(
        "ix_issue_stage_history_issue_created", table_name="issue_stage_history"
    )
    op.drop_table("issue_stage_history")

    op.drop_table("user_term_agreements")

    op.drop_constraint("fk_users_terms_version", "users", type_="foreignkey")
    op.drop_index("ix_terms_versions_effective_at", table_name="terms_versions")
    op.drop_table("terms_versions")
