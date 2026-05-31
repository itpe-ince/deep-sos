"""USCP V2 — Matching Activity Router (M04-08~09).

설계 근거:
  - design.md §4.2 (`POST /projects/{id}/matching-activities` — 매칭 멘토 본인+operator)
  - design.md §5.4.1 멤버 활동 기록 흐름
  - feature-spec §M04-08 (활동 기록), §M04-09 (활동 이력 조회)

라우터:
  - activity_router → prefix "/projects" (프로젝트별 멘토단 활동 기록 CRUD + 목록)
  - history_router  → prefix "/me"       (본인 매칭·활동 이력 — 마이페이지)
  - admin_history_router → prefix "/admin/mentors" (운영자: 특정 멘토 이력)
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.matching_service import (
    create_matching_activity_v2,
    delete_matching_activity_v2,
    list_matching_activities_v2,
    list_user_matching_history_v2,
    update_matching_activity_v2,
)
from app.core.database import get_db
from app.models.user import User

activity_router = APIRouter()
history_router = APIRouter()
admin_history_router = APIRouter()


def _is_operator(user: User) -> bool:
    return str(getattr(user, "role", "") or "").lower() in ("operator", "admin")


class CreateActivityRequest(BaseModel):
    activity_date: date
    activity_type: str = Field(..., description="meeting / advice / review")
    summary: str = Field(..., min_length=1)


class UpdateActivityRequest(BaseModel):
    activity_date: date | None = None
    activity_type: str | None = None
    summary: str | None = None


# ── M04-08 활동 기록 (매칭 멘토 본인 + 운영자) ──────────────────


@activity_router.get(
    "/{project_id}/matching-activities",
    summary="M04-08 멘토단 활동 기록 목록",
)
async def list_activities(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """프로젝트 멘토단 활동 기록 목록 (시간순). 로그인 사용자 조회 가능."""
    return await list_matching_activities_v2(db, project_id=project_id)


@activity_router.post(
    "/{project_id}/matching-activities",
    status_code=status.HTTP_201_CREATED,
    summary="M04-08 멘토단 활동 기록 작성 (매칭 멘토 본인 + 운영자)",
)
async def create_activity(
    project_id: str,
    body: CreateActivityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """403: not_matched_mentor. 422: invalid_activity_type/summary_required."""
    return await create_matching_activity_v2(
        db,
        project_id=project_id,
        author_id=str(current_user.id),
        is_operator=_is_operator(current_user),
        activity_date=body.activity_date,
        activity_type=body.activity_type,
        summary=body.summary,
    )


@activity_router.patch(
    "/{project_id}/matching-activities/{activity_id}",
    summary="M04-08 활동 기록 수정 (작성자 본인 + 운영자)",
)
async def update_activity(
    project_id: str,
    activity_id: str,
    body: UpdateActivityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """403: not_author. 404: activity_not_found."""
    return await update_matching_activity_v2(
        db,
        activity_id=activity_id,
        user_id=str(current_user.id),
        is_operator=_is_operator(current_user),
        activity_date=body.activity_date,
        activity_type=body.activity_type,
        summary=body.summary,
    )


@activity_router.delete(
    "/{project_id}/matching-activities/{activity_id}",
    summary="M04-08 활동 기록 삭제 (작성자 본인 + 운영자)",
)
async def delete_activity(
    project_id: str,
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """403: not_author. 404: activity_not_found."""
    return await delete_matching_activity_v2(
        db,
        activity_id=activity_id,
        user_id=str(current_user.id),
        is_operator=_is_operator(current_user),
    )


# ── M04-09 활동 이력 조회 ───────────────────────────────────────


@history_router.get(
    "/matching-history",
    summary="M04-09 본인 매칭·활동 이력 (마이페이지)",
)
async def my_matching_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """로그인 사용자 본인의 멘토 매칭 + 작성 활동 이력 (시간순)."""
    return await list_user_matching_history_v2(db, user_id=str(current_user.id))


@admin_history_router.get(
    "/{mentor_user_id}/matching-history",
    summary="M04-09 특정 멘토 활동 이력 (운영자)",
)
async def mentor_matching_history(
    mentor_user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """운영자가 특정 멘토(user_id)의 매칭·활동 이력 조회. 403: operator 아님."""
    from fastapi import HTTPException

    if not _is_operator(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "operator_required", "message": "운영자만 접근 가능합니다."},
        )
    return await list_user_matching_history_v2(db, user_id=mentor_user_id)
