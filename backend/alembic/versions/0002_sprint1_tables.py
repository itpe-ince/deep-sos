"""sprint1: issues + livinglab_projects + volunteers + success_cases

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-11 11:00:00
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _uuid_col(name: str = "id", primary: bool = True) -> sa.Column:  # type: ignore[type-arg]
    return sa.Column(
        name,
        postgresql.UUID(as_uuid=True),
        server_default=sa.text("gen_random_uuid()") if primary else None,
        primary_key=primary,
    )


def _timestamps() -> tuple[sa.Column, sa.Column]:  # type: ignore[type-arg]
    return (
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def upgrade() -> None:
    # ── issues ─────────────────────────────────
    op.create_table(
        "issues",
        _uuid_col(),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="submitted"),
        sa.Column("priority", sa.String(10), nullable=False, server_default="normal"),
        sa.Column(
            "campus_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("campuses.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "assignee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("location_lat", sa.Numeric(10, 8)),
        sa.Column("location_lng", sa.Numeric(11, 8)),
        sa.Column("location_address", sa.Text),
        sa.Column("image_urls", postgresql.ARRAY(sa.String)),
        sa.Column("vote_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("view_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("comment_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_anonymous", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("linked_project_id", postgresql.UUID(as_uuid=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_issues_status", "issues", ["status"])
    op.create_index("ix_issues_campus", "issues", ["campus_id"])

    # ── livinglab_projects ─────────────────────
    op.create_table(
        "livinglab_projects",
        _uuid_col(),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("phase", sa.String(20), nullable=False, server_default="discover"),
        sa.Column("maker_stage", sa.String(20)),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "campus_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("campuses.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "leader_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("target_sdgs", postgresql.ARRAY(sa.Integer)),
        sa.Column("start_date", sa.Date),
        sa.Column("end_date", sa.Date),
        sa.Column("budget", sa.Numeric(12, 2)),
        sa.Column("member_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("partner_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("progress", sa.Integer, nullable=False, server_default="0"),
        sa.Column("outcome_summary", sa.Text),
        sa.Column("cover_image_url", sa.String(500)),
        *_timestamps(),
    )
    op.create_index("ix_projects_phase", "livinglab_projects", ["phase"])
    op.create_index("ix_projects_campus", "livinglab_projects", ["campus_id"])

    # ── volunteer_activities ───────────────────
    op.create_table(
        "volunteer_activities",
        _uuid_col(),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("activity_type", sa.String(30)),
        sa.Column(
            "campus_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("campuses.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="SET NULL"),
        ),
        sa.Column("location", sa.Text),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_participants", sa.Integer),
        sa.Column("current_participants", sa.Integer, nullable=False, server_default="0"),
        sa.Column("volunteer_hours", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="upcoming"),
        *_timestamps(),
    )
    op.create_index("ix_volunteers_status", "volunteer_activities", ["status"])

    # ── success_cases ──────────────────────────
    op.create_table(
        "success_cases",
        _uuid_col(),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("livinglab_projects.id", ondelete="SET NULL"),
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("problem_summary", sa.Text, nullable=False),
        sa.Column("process_summary", sa.Text, nullable=False),
        sa.Column("result_summary", sa.Text, nullable=False),
        sa.Column("impact_summary", sa.Text),
        sa.Column("sdg_goals", postgresql.ARRAY(sa.Integer)),
        sa.Column(
            "campus_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("campuses.id", ondelete="SET NULL"),
        ),
        sa.Column("policy_linked", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("policy_detail", sa.Text),
        sa.Column(
            "global_transfer_candidate",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("view_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("cover_image_url", sa.String(500)),
        *_timestamps(),
    )
    op.create_index("ix_cases_published", "success_cases", ["is_published"])

    # ── Seed: 샘플 데이터 ─────────────────────
    op.execute(
        """
        WITH c AS (SELECT id, code FROM campuses)
        INSERT INTO issues (title, description, category, status, priority, campus_id,
                            location_lat, location_lng, location_address, vote_count, view_count, comment_count)
        SELECT
            t.title, t.description, t.category, t.status, t.priority,
            c.id, t.lat, t.lng, t.addr, t.votes, t.views, t.cmts
        FROM c
        JOIN (VALUES
            ('공주캠퍼스 앞 횡단보도 신호 대기 시간이 너무 깁니다',
             '아침 통학 시간에 공주캠퍼스 앞 횡단보도 신호가 너무 길어 학생들의 안전이 우려됩니다. 특히 비 오는 날에는 우산을 쓴 채로 오래 서있어야 해서 위험합니다.',
             'safety', 'progress', 'high', 36.46580000, 126.93000000, '공주캠퍼스 정문 앞', 142, 856, 23, 'GJ'),
            ('대전캠퍼스 도서관 주변 쓰레기 무단 투기 심각',
             '대전캠퍼스 중앙도서관 뒤편에 쓰레기가 계속 쌓이고 있습니다. 분리수거함 설치와 정기적인 청소가 필요합니다.',
             'environment', 'assigned', 'normal', 36.37230000, 127.36160000, '대전캠퍼스 중앙도서관', 89, 432, 12, 'DJ'),
            ('예산 지역 고령자 디지털 교육 수요 증가',
             '예산 지역 어르신들이 키오스크, 스마트폰 사용에 어려움을 겪고 있습니다. 정기적인 디지털 교육 프로그램이 필요합니다.',
             'welfare', 'resolved', 'high', 36.68030000, 126.84490000, '예산군 종합복지관', 203, 1254, 45, 'YS'),
            ('세종시 대중교통 배차 간격 개선 요청',
             '세종캠퍼스 통학 버스 배차 간격이 길어 학생들 이동이 불편합니다. 출퇴근 시간대 증편이 필요합니다.',
             'transport', 'reviewing', 'normal', 36.48000000, 127.28900000, '세종캠퍼스 버스정류장', 67, 321, 8, 'SJ'),
            ('대전 원도심 청년 문화공간 부족',
             '대전 원도심 지역에 청년들이 자유롭게 이용할 수 있는 문화공간이 부족합니다. 도시 유휴공간을 활용한 청년 문화공간 조성이 필요합니다.',
             'culture', 'submitted', 'normal', 36.33500000, 127.41200000, '대전 원도심', 34, 178, 4, 'DJ'),
            ('공주 백제문화권 청년 창업 지원 부족',
             '백제문화권 특성을 살린 청년 창업 지원 프로그램이 부족합니다. 역사·문화 자원과 연계된 창업 인프라 구축이 필요합니다.',
             'culture', 'assigned', 'normal', 36.44700000, 127.11900000, '공주시 일대', 78, 456, 15, 'GJ')
        ) AS t(title, description, category, status, priority, lat, lng, addr, votes, views, cmts, code)
          ON c.code = t.code;
        """
    )

    op.execute(
        """
        WITH c AS (SELECT id, code FROM campuses)
        INSERT INTO livinglab_projects (title, description, phase, maker_stage, status,
                                         campus_id, target_sdgs, start_date, end_date,
                                         budget, member_count, partner_count, progress)
        SELECT
            t.title, t.description, t.phase, t.maker_stage, 'active',
            c.id, t.sdgs::int[], t.start_date::date, t.end_date::date,
            t.budget, t.members, t.partners, t.progress
        FROM c
        JOIN (VALUES
            ('청년 일자리 경험 플랫폼 대전잡스',
             'ICT 기반 청년 일자리 실험 및 농촌형 주거·일·경험 플랫폼 개발. 지역 청년들이 다양한 일 경험을 통해 진로를 탐색할 수 있도록 지원합니다.',
             'execute', 'proof', '{4,8,11}', '2026-03-01', '2026-12-31', 45000000, 12, 4, 35, 'DJ'),
            ('백제문화권 청년 문화기획자 양성',
             '공주의 백제문화 자원을 활용한 청년 문화기획자 양성 프로그램. 유휴공간을 활용한 문화 창업 랩 운영.',
             'develop', 'idea', '{4,8,11}', '2026-02-15', '2026-11-30', 38000000, 8, 3, 60, 'GJ'),
            ('예산 고령자 돌봄테크 리빙랩',
             '원격진료 부스, 건강 모니터링, 디지털 역량 강화 플랫폼을 통한 고령자 돌봄 서비스 구축.',
             'verify', 'policy', '{3,9,10}', '2026-01-10', '2026-10-30', 65000000, 15, 6, 80, 'YS'),
            ('세종 자율주행 모빌리티 실증',
             '자율주행 차량 공유 서비스를 통한 세종시 교통 문제 해결. 스마트 모빌리티 플랫폼 구축 및 실증.',
             'discover', 'idea', '{9,11,13}', '2026-03-20', '2027-03-19', 120000000, 20, 8, 15, 'SJ')
        ) AS t(title, description, phase, maker_stage, sdgs, start_date, end_date, budget, members, partners, progress, code)
          ON c.code = t.code;
        """
    )

    op.execute(
        """
        WITH c AS (SELECT id, code FROM campuses)
        INSERT INTO volunteer_activities (title, description, activity_type, campus_id,
                                          location, start_datetime, end_datetime,
                                          max_participants, current_participants, volunteer_hours, status)
        SELECT
            t.title, t.description, t.activity_type, c.id,
            t.location, t.start_dt::timestamptz, t.end_dt::timestamptz,
            t.max_p, t.curr_p, t.hours, t.status
        FROM c
        JOIN (VALUES
            ('지역아동센터 학습 멘토링', '대전 서구 지역아동센터 초등학생 대상 학습 멘토링 봉사활동입니다.',
             'education', '대전 서구 지역아동센터',
             '2026-04-15 14:00', '2026-04-15 18:00', 15, 12, 4.0, 'upcoming', 'DJ'),
            ('갑천 환경정화 봉사활동', '대전 갑천 일대 환경 정화 활동. 쓰레기 줍기 및 수질 조사.',
             'environment', '대전 갑천 둔산대교 일대',
             '2026-04-20 09:00', '2026-04-20 14:00', 30, 18, 5.0, 'upcoming', 'DJ'),
            ('예산 어르신 디지털 역량 교실', '예산 지역 어르신 대상 스마트폰·키오스크 사용법 교육.',
             'welfare', '예산군 종합복지관',
             '2026-04-17 09:30', '2026-04-17 12:30', 20, 15, 3.0, 'upcoming', 'YS'),
            ('공주 전통시장 환경 개선', '공주 중동시장 환경 개선 활동. 청소 및 상인회 지원.',
             'culture', '공주 중동시장',
             '2026-04-22 13:00', '2026-04-22 19:00', 12, 10, 6.0, 'upcoming', 'GJ'),
            ('세종시 버스정류장 안전 점검', '세종시 버스정류장 안전 시설 점검 및 개선 제안.',
             'safety', '세종시 일원',
             '2026-04-18 10:00', '2026-04-18 14:00', 12, 3, 4.0, 'upcoming', 'SJ'),
            ('다문화가정 한국어 교실', '공주시 다문화가정 대상 한국어 멘토링. 리빙랩 연계.',
             'education', '공주시 다문화지원센터',
             '2026-04-19 10:00', '2026-04-19 14:00', 10, 8, 4.0, 'upcoming', 'GJ')
        ) AS t(title, description, activity_type, location, start_dt, end_dt, max_p, curr_p, hours, status, code)
          ON c.code = t.code;
        """
    )

    op.execute(
        """
        WITH c AS (SELECT id, code FROM campuses)
        INSERT INTO success_cases (title, problem_summary, process_summary, result_summary,
                                    impact_summary, sdg_goals, campus_id, policy_linked,
                                    global_transfer_candidate, is_published, view_count)
        SELECT
            t.title, t.problem, t.process, t.result,
            t.impact, t.sdgs::int[], c.id, t.policy,
            t.global_t, true, t.views
        FROM c
        JOIN (VALUES
            ('예산 고령자 디지털 교육 프로그램',
             '예산군 고령자의 디지털 기기 사용 어려움으로 일상생활 불편과 정보 격차 심화.',
             '시민 제보 → 리빙랩 프로젝트 전환 → 3개월 파일럿 운영 → 예산군 공식 정책 채택.',
             '예산군 16개 행정복지센터 도입, 고령자 1,280명 교육 이수, 만족도 4.8/5.0.',
             '지역 디지털 격차 해소 및 고령자 삶의 질 개선. 타 지자체 벤치마킹 사례 3건 확보.',
             '{4,10,11}', true, true, 4182, 'YS'),
            ('지역 스마트 빗물 관리 시스템',
             '대전 저지대 침수 피해 반복 및 집중호우 시 주민 안전 위협.',
             '한국수자원공사 협력 → 센서 12곳 설치 → 실시간 침수 예측 시스템 구축.',
             '침수 예측 정확도 92% 달성, 주민 대피 시간 평균 15분 단축.',
             '기후변화 대응 정책에 반영, 타 지역 확산 논의 진행 중.',
             '{6,11,13}', true, false, 2345, 'DJ'),
            ('공주 전통시장 디지털화 프로젝트',
             '공주 중동시장 상인회의 매출 감소 및 청년 고객 유입 부족.',
             'QR 결제 시스템 + 온라인 주문 플랫폼 구축 + 마케팅 지원.',
             '매출 32% 증대, 청년 방문객 2.4배 증가, 상인 만족도 4.6/5.0.',
             '지역 상권 활성화 모델로 주목, 사회적기업 전환 검토 중.',
             '{8,11,17}', false, false, 1892, 'GJ')
        ) AS t(title, problem, process, result, impact, sdgs, policy, global_t, views, code)
          ON c.code = t.code;
        """
    )


def downgrade() -> None:
    op.drop_index("ix_cases_published", table_name="success_cases")
    op.drop_table("success_cases")
    op.drop_index("ix_volunteers_status", table_name="volunteer_activities")
    op.drop_table("volunteer_activities")
    op.drop_index("ix_projects_campus", table_name="livinglab_projects")
    op.drop_index("ix_projects_phase", table_name="livinglab_projects")
    op.drop_table("livinglab_projects")
    op.drop_index("ix_issues_campus", table_name="issues")
    op.drop_index("ix_issues_status", table_name="issues")
    op.drop_table("issues")
