"""USCP V2 — Admin Users/Operators Router (M08-01/02/03, 운영자 전용).

설계 근거:
  - feature-spec §M08-01/02/03
  - design.md §4.2 M08 (GET /admin/users, POST /admin/operators, DELETE /admin/operators/{id})

마운트:
  - users_router     → prefix "/admin/users"     (목록·검색·상세)
  - operators_router → prefix "/admin/operators" (운영자 추가·삭제)

개인정보 조회(M08-06)·운영자 추가/삭제(M08-07) 감사 로그는 AuditMiddleware 자동 기록.
"""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.admin_user_service import (
    create_operator_v2,
    deactivate_operator_v2,
    get_user_detail_v2,
    list_users_v2,
)
from app.core.database import get_db
from app.models.user import User

users_router = APIRouter()
operators_router = APIRouter()


def _require_operator(user: User) -> None:
    role = str(getattr(user, "role", "") or "").lower()
    if role not in ("operator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "operator_required", "message": "운영자만 접근 가능합니다."},
        )


RoleFilter = Literal["citizen", "operator", "mentor", "student"]
StatusFilter = Literal["active", "suspended", "withdrawn"]


# ── M08-03 사용자 목록·검색 ──────────────────────────────────


@users_router.get("", summary="M08-03 사용자 통합 목록·검색 (운영자)")
async def list_users(
    q: Optional[str] = None,
    role: Optional[RoleFilter] = None,
    status_filter: Optional[StatusFilter] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await list_users_v2(
        db,
        q=q,
        role=role,
        user_status=status_filter,
        limit=limit,
        offset=offset,
    )


@users_router.get("/{user_id}", summary="M08-03/06 사용자 상세 (운영자, view_pii 기록)")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await get_user_detail_v2(db, user_id=user_id)


# ── M08-01/02 운영자 추가·삭제 ───────────────────────────────


class CreateOperatorRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    name: str = Field(..., min_length=1, max_length=100)
    temp_password: str = Field(..., min_length=8, max_length=128)


@operators_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="M08-01 운영자 계정 추가 (운영자)",
)
async def create_operator(
    body: CreateOperatorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """409: 이미 가입된 이메일 / 422: 입력 검증 실패."""
    _require_operator(current_user)
    return await create_operator_v2(
        db,
        actor_id=str(current_user.id),
        email=body.email,
        name=body.name,
        temp_password=body.temp_password,
    )


@operators_router.delete(
    "/{operator_id}",
    summary="M08-02 운영자 비활성화·삭제 (운영자, 본인 직접 처리 금지)",
)
async def delete_operator(
    operator_id: str,
    mode: Literal["deactivate", "delete"] = "deactivate",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """403: 본인 계정 직접 처리 / 404: 미존재 / 422: 운영자 아님."""
    _require_operator(current_user)
    return await deactivate_operator_v2(
        db,
        actor_id=str(current_user.id),
        target_id=operator_id,
        mode=mode,
    )
