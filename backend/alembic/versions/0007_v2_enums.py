"""v2: PostgreSQL ENUM 11종 신설 (USCP V2 전환)

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-30 00:00:00

설계 근거: docs/02-design/features/uscp-v2.design.md §3.2
- 9개 모듈·116기능 V2 합의 (2026-05-16) 대응
- V1 VARCHAR(20) 컬럼들을 V2 ENUM 으로 점진 전환하기 위한 사전 정의
- 본 리비전은 ENUM 타입만 신설. 컬럼 타입 cast 는 0008~0010 에서 진행

V2 ENUM 11종:
1. user_role           — citizen/operator/mentor/student
2. user_status         — active/suspended/withdrawn
3. region              — daejeon/gongju/yesan/cheonan/sejong (천안 신규 포함)
4. issue_stage         — reported/reviewing/published/mentor_assigned/in_progress/resolved
5. issue_track         — policy_reflection/policy_reference/citizen_autonomy
6. content_category    — notice/event (통합 게시판)
7. resource_category   — guide/template/toolkit/etc (자료실)
8. project_stage       — recruiting/in_progress/completed
9. organization_category — public/industry/academic/government (지·산·학·관)
10. terms_kind         — privacy/service
11. audit_action       — login/logout/create/update/delete/view_pii/stage_change
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


V2_ENUMS = {
    "user_role": ["citizen", "operator", "mentor", "student"],
    "user_status": ["active", "suspended", "withdrawn"],
    "region": ["daejeon", "gongju", "yesan", "cheonan", "sejong"],
    "issue_stage": [
        "reported",
        "reviewing",
        "published",
        "mentor_assigned",
        "in_progress",
        "resolved",
    ],
    "issue_track": ["policy_reflection", "policy_reference", "citizen_autonomy"],
    "content_category": ["notice", "event"],
    "resource_category": ["guide", "template", "toolkit", "etc"],
    "project_stage": ["recruiting", "in_progress", "completed"],
    "organization_category": ["public", "industry", "academic", "government"],
    "terms_kind": ["privacy", "service"],
    "audit_action": [
        "login",
        "logout",
        "create",
        "update",
        "delete",
        "view_pii",
        "stage_change",
    ],
}


def upgrade() -> None:
    # pg_trgm 확장 — M02-20 키워드 검색용 (0009 에서 trigram 인덱스 생성 전 사전 설치)
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    # ENUM 11종 일괄 생성 (IF NOT EXISTS 패턴 — 재실행 안전)
    for enum_name, values in V2_ENUMS.items():
        values_sql = ", ".join(f"'{v}'" for v in values)
        op.execute(
            f"""
            DO $$ BEGIN
                CREATE TYPE {enum_name} AS ENUM ({values_sql});
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
            """
        )


def downgrade() -> None:
    # ENUM drop 은 의존 컬럼이 모두 제거된 후에만 가능 → 0010→0009→0008 역순 적용 후 본 리비전 down
    for enum_name in reversed(list(V2_ENUMS.keys())):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
    # pg_trgm 은 다른 객체 의존 가능성 → drop 보류
