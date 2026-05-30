"""V2 PostgreSQL ENUM 의 Python 표현.

각 Enum 의 값은 Alembic 0007_v2_enums.py 의 V2_ENUMS 와 1:1 일치.
SQLAlchemy column 정의 시 ``sa.Enum(UserRole, name="user_role", create_type=False)`` 형태로 사용.

설계 근거: docs/02-design/features/uscp-v2.design.md §3.2
"""
from __future__ import annotations

from enum import Enum


class UserRole(str, Enum):
    """M01 사용자 역할 (단일 역할이 아닌 add-on 가능: citizen + mentor 등).

    operator 만 별도 계정. 매칭은 운영자가 수동으로 부여.
    """

    CITIZEN = "citizen"
    OPERATOR = "operator"
    MENTOR = "mentor"
    STUDENT = "student"


class UserStatus(str, Enum):
    """M01-10 회원 상태."""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    WITHDRAWN = "withdrawn"


class Region(str, Enum):
    """5개 운영 지역 (대전·공주·예산·천안·세종).

    V1 campuses 테이블에서 ENUM 으로 전환 (천안 신규 포함).
    """

    DAEJEON = "daejeon"
    GONGJU = "gongju"
    YESAN = "yesan"
    CHEONAN = "cheonan"
    SEJONG = "sejong"


class IssueStage(str, Enum):
    """M02 의제 6단계 라이프사이클.

    정상 전이: reported → reviewing → published → mentor_assigned → in_progress → resolved
    예외 분기: reviewing → (rejected 는 별도 컬럼 rejection_reason 으로 처리, stage 전이 없음)
    M02-21 댓글 종결 우회: 임의 단계 → resolved (사유 = 'comment_resolution')
    """

    REPORTED = "reported"
    REVIEWING = "reviewing"
    PUBLISHED = "published"
    MENTOR_ASSIGNED = "mentor_assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class IssueTrack(str, Enum):
    """M02-19 의제 트랙 라벨 (검토중 진입 시 운영자가 지정).

    1차 미팅 합의: 트랙은 단순 라벨이며 자동 단계 전환·차별 처리 없음.
    """

    POLICY_REFLECTION = "policy_reflection"   # 정책반영
    POLICY_REFERENCE = "policy_reference"     # 정책참고
    CITIZEN_AUTONOMY = "citizen_autonomy"     # 시민자율


class ContentCategory(str, Enum):
    """M06-07, M07-01~04 공지·이벤트 통합 게시판."""

    NOTICE = "notice"
    EVENT = "event"


class ResourceCategory(str, Enum):
    """M06-08, M07-15 자료실 카테고리 4종."""

    GUIDE = "guide"
    TEMPLATE = "template"
    TOOLKIT = "toolkit"
    ETC = "etc"


class ProjectStage(str, Enum):
    """M03-13 리빙랩 단계."""

    RECRUITING = "recruiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class OrganizationCategory(str, Enum):
    """M05-01 협력 기관 분류 (지·산·학·관)."""

    PUBLIC = "public"          # 지 (지자체)
    INDUSTRY = "industry"      # 산
    ACADEMIC = "academic"      # 학
    GOVERNMENT = "government"  # 관


class TermsKind(str, Enum):
    """M07-12 약관 종류."""

    PRIVACY = "privacy"
    SERVICE = "service"


class AuditAction(str, Enum):
    """M08 감사 로그 액션 분류."""

    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW_PII = "view_pii"
    STAGE_CHANGE = "stage_change"
