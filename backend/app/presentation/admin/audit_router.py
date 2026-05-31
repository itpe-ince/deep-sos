"""USCP V2 — Admin Audit Router (M08-08/09, 운영자 전용).

설계 근거:
  - feature-spec §M08-08 (감사 로그 조회 — 기간·작업자·종류 필터, 본인 작업 구분)
  - feature-spec §M08-09 (보관 정책 — 1년 자동 만료)
  - design.md §4.2 M08 (/admin/audit/logins, /gatekeeping, /all)

마운트: router → prefix "/admin/audit"
"""
from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.audit_query_service import (
    list_audit_logs_v2,
    list_gatekeeping_audit_v2,
    list_login_audit_v2,
    purge_expired_audit_logs_v2,
)
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


def _require_operator(user: User) -> None:
    role = str(getattr(user, "role", "") or "").lower()
    if role not in ("operator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "operator_required", "message": "운영자만 접근 가능합니다."},
        )


ActionFilter = Literal[
    "login", "logout", "create", "update", "delete", "view_pii", "stage_change"
]


@router.get("/logins", summary="M08-08 로그인 이력 조회 (운영자)")
async def list_login_audit(
    actor_id: Optional[str] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await list_login_audit_v2(
        db,
        viewer_id=str(current_user.id),
        actor_id=actor_id,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
    )


@router.get("/gatekeeping", summary="M08-08 게이트키핑 이력 조회 (운영자)")
async def list_gatekeeping_audit(
    actor_id: Optional[str] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await list_gatekeeping_audit_v2(
        db,
        viewer_id=str(current_user.id),
        actor_id=actor_id,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
    )


@router.get("/all", summary="M08-08 전체 감사 로그 조회 (운영자, 기간·작업자·종류 필터)")
async def list_all_audit(
    action: Optional[ActionFilter] = None,
    actor_id: Optional[str] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await list_audit_logs_v2(
        db,
        viewer_id=str(current_user.id),
        action=action,
        actor_id=actor_id,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
    )


@router.post("/purge", summary="M08-09 만료 감사 로그 정리 (운영자/스케줄러)")
async def purge_audit_logs(
    retention_days: int = 365,
    dry_run: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """기본 dry_run=true (대상 건수만 반환). 실제 삭제는 dry_run=false."""
    _require_operator(current_user)
    return await purge_expired_audit_logs_v2(
        db, retention_days=retention_days, dry_run=dry_run
    )
