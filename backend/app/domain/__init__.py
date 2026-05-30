"""USCP V2 Domain Layer

Clean Architecture 의 domain layer — entities, value objects, enums.
DB·HTTP·외부 시스템 의존성 없음. 비즈니스 규칙의 SOT.

설계 근거: docs/02-design/features/uscp-v2.design.md §2.2
"""
from app.domain.enums import (
    AuditAction,
    ContentCategory,
    IssueStage,
    IssueTrack,
    OrganizationCategory,
    ProjectStage,
    Region,
    ResourceCategory,
    TermsKind,
    UserRole,
    UserStatus,
)

__all__ = [
    "AuditAction",
    "ContentCategory",
    "IssueStage",
    "IssueTrack",
    "OrganizationCategory",
    "ProjectStage",
    "Region",
    "ResourceCategory",
    "TermsKind",
    "UserRole",
    "UserStatus",
]
