"""USCP V2 — Success Story Admin Router (M03-11/12 성공사례·정책반영).

설계 근거:
  - feature-spec §M03-11 (성공사례 스토리 작성 — 운영자, completed 단계)
  - feature-spec §M03-12 (정책 반영 기록)
  - design.md §4.2 M03 admin (POST /admin/success-cases)

공개 조회(GET /success-cases, GET /success-cases/{id})는 V1 success_cases 라우터 유지.
본 라우터는 운영자 전용 작성·수정·게시 + 미게시 포함 목록.
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.success_story_service import (
    create_success_case_v2,
    list_success_cases_admin_v2,
    update_success_case_v2,
)
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


def _require_operator(user: User) -> None:
    role = str(getattr(user, "role", "") or "").lower()
    if role not in ("operator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "operator_required",
                "message": "운영자만 접근 가능합니다.",
            },
        )


class V2CreateSuccessCaseRequest(BaseModel):
    """M03-11/12 성공사례 작성 — 4단계 본문 + 정책반영."""

    project_id: str = Field(..., description="completed 단계의 리빙랩 프로젝트 ID")
    title: str = Field(..., min_length=1, max_length=200)
    problem_summary: str = Field(..., min_length=1, description="① 어떤 문제였는가")
    process_summary: str = Field(..., min_length=1, description="② 해결 과정")
    result_summary: str = Field(..., min_length=1, description="③ 결과")
    # ④ 정책반영 (M03-12)
    policy_linked: bool = False
    policy_name: str | None = Field(None, max_length=200, description="반영된 정책 이름")
    effective_date: date | None = Field(None, description="정책 시행일")
    policy_detail: str | None = Field(None, description="④ 정책반영 내용 본문")
    cover_image_url: str | None = Field(None, max_length=500)


class V2UpdateSuccessCaseRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    problem_summary: str | None = None
    process_summary: str | None = None
    result_summary: str | None = None
    policy_linked: bool | None = None
    policy_name: str | None = Field(None, max_length=200)
    effective_date: date | None = None
    policy_detail: str | None = None
    is_published: bool | None = Field(None, description="게시(공개) 토글")
    cover_image_url: str | None = Field(None, max_length=500)


@router.get("", summary="M03-11 성공사례 목록 (운영자, 미게시 포함)")
async def list_admin_success_cases(
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await list_success_cases_admin_v2(
        db, project_id=project_id, include_unpublished=True
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="M03-11/12 성공사례 작성 (운영자, completed 단계만)",
)
async def create_success_case(
    body: V2CreateSuccessCaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """422: 본문 누락·길이 / 404: project 미존재 / 409: project_not_completed."""
    _require_operator(current_user)
    return await create_success_case_v2(
        db,
        operator_id=str(current_user.id),
        project_id=body.project_id,
        title=body.title,
        problem_summary=body.problem_summary,
        process_summary=body.process_summary,
        result_summary=body.result_summary,
        policy_linked=body.policy_linked,
        policy_name=body.policy_name,
        effective_date=body.effective_date,
        policy_detail=body.policy_detail,
        cover_image_url=body.cover_image_url,
    )


@router.patch("/{case_id}", summary="M03-11/12 성공사례 수정·게시 (운영자)")
async def update_success_case(
    case_id: str,
    body: V2UpdateSuccessCaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await update_success_case_v2(
        db,
        operator_id=str(current_user.id),
        case_id=case_id,
        title=body.title,
        problem_summary=body.problem_summary,
        process_summary=body.process_summary,
        result_summary=body.result_summary,
        policy_linked=body.policy_linked,
        policy_name=body.policy_name,
        effective_date=body.effective_date,
        policy_detail=body.policy_detail,
        is_published=body.is_published,
        cover_image_url=body.cover_image_url,
    )
