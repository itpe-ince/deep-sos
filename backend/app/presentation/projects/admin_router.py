"""USCP V2 — Projects Admin Router (M03-06 운영자 등록).

설계 근거:
  - feature-spec §M03-06 (리빙랩 등록 — 운영자)
  - design.md §4.2 M03 admin endpoints

엔드포인트:
  - POST /admin/projects — 리빙랩 등록

Sprint 3 Day 4-7 에 lifecycle_service 도입 시 transition/match/timeline 추가 예정.
"""
from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.project_service import submit_project_v2
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


RegionCode = Literal["daejeon", "gongju", "yesan", "cheonan", "sejong"]


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


class V2CreateProjectRequest(BaseModel):
    """M03-06 리빙랩 등록 요청."""

    title: str = Field(..., min_length=1, max_length=200)
    summary: str | None = Field(None, max_length=500, description="한 줄 요약 (선택)")
    region: RegionCode
    source_issue_id: str | None = Field(
        None, description="M03-14 연결할 의제 ID (선택)"
    )
    start_at: date | None = None
    end_at: date | None = None


class V2CreateProjectResponse(BaseModel):
    project_id: str
    stage: str = "recruiting"
    region: RegionCode
    title: str
    summary: str | None = None
    source_issue_id: str | None = None
    created_at: str
    message: str = "리빙랩 프로젝트가 등록되었습니다. (모집중 단계)"


@router.post(
    "",
    response_model=V2CreateProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="V2 리빙랩 등록 (M03-06)",
)
async def create_project(
    body: V2CreateProjectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2CreateProjectResponse:
    """리빙랩 등록.

    422 분기 (detail.code):
      - `invalid_region`, `invalid_title_length`, `invalid_summary_length`
      - `invalid_date_range`

    의제 연결(source_issue_id, 선택)은 N:M project_issues 에 idempotent 로 1건 추가된다.
    동일 의제의 다중 프로젝트 연결을 허용하므로 409 충돌은 발생하지 않는다 (H01 N:M).
    """
    _require_operator(current_user)
    result = await submit_project_v2(
        db,
        operator_id=str(current_user.id),
        title=body.title,
        summary=body.summary,
        region=body.region,
        source_issue_id=body.source_issue_id,
        start_at=body.start_at,
        end_at=body.end_at,
    )
    return V2CreateProjectResponse(**result)  # type: ignore[arg-type]


# ════════════════════════════════════════════════════════════════
#  M03-07/13 — 수정·삭제·단계 전환
# ════════════════════════════════════════════════════════════════
from app.application.lifecycle_service import (  # noqa: E402
    delete_project_v2,
    transition_project_v2,
    update_project_v2,
)


class V2UpdateProjectRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    summary: str | None = Field(None, max_length=500)
    region: RegionCode | None = None
    start_at: date | None = None
    end_at: date | None = None


class V2TransitionProjectRequest(BaseModel):
    to_stage: Literal["recruiting", "in_progress", "completed"]
    comment: str | None = Field(None, max_length=2000)


class V2TransitionProjectResponse(BaseModel):
    project_id: str
    prev_stage: str
    stage: str
    transitioned_at: str


@router.patch("/{project_id}", summary="M03-07 리빙랩 수정")
async def update_project(
    project_id: str,
    body: V2UpdateProjectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await update_project_v2(
        db,
        project_id=project_id,
        operator_id=str(current_user.id),
        title=body.title,
        summary=body.summary,
        region=body.region,
        start_at=body.start_at,
        end_at=body.end_at,
    )


@router.delete(
    "/{project_id}",
    summary="M03-07 리빙랩 삭제 (완료 단계는 차단)",
)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await delete_project_v2(
        db,
        project_id=project_id,
        operator_id=str(current_user.id),
    )


@router.post(
    "/{project_id}/transition",
    response_model=V2TransitionProjectResponse,
    summary="M03-13 리빙랩 단계 전환 (3단계 state machine)",
)
async def transition_project(
    project_id: str,
    body: V2TransitionProjectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2TransitionProjectResponse:
    _require_operator(current_user)
    result = await transition_project_v2(
        db,
        project_id=project_id,
        operator_id=str(current_user.id),
        to_stage=body.to_stage,
        comment=body.comment,
    )
    return V2TransitionProjectResponse(**result)  # type: ignore[arg-type]


# ════════════════════════════════════════════════════════════════
#  M03-14 — 의제↔리빙랩 N:M 연결·해제 (운영자, project_issues)
# ════════════════════════════════════════════════════════════════
from app.application.project_service import (  # noqa: E402
    link_issue_to_project_v2,
    unlink_issue_from_project_v2,
)


class V2LinkIssueRequest(BaseModel):
    issue_id: str = Field(..., description="연결할 제보(의제) ID")


@router.post(
    "/{project_id}/link-issue",
    summary="M03-14 의제 연결 (운영자, N:M)",
)
async def link_issue(
    project_id: str,
    body: V2LinkIssueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """의제를 프로젝트에 연결 (N:M, idempotent).

    404: project/issue 미존재. 동일 쌍 재연결은 무해(중복 무시), 409 없음.
    응답: {project_id, linked_issue, linked_issues[], message}.
    """
    _require_operator(current_user)
    return await link_issue_to_project_v2(
        db,
        project_id=project_id,
        issue_id=body.issue_id,
        operator_id=str(current_user.id),
    )


@router.delete(
    "/{project_id}/link-issue/{issue_id}",
    summary="M03-14 의제 연결 해제 (운영자, N:M — 개별 해제)",
)
async def unlink_issue(
    project_id: str,
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """프로젝트-의제 연결 1건 해제. 404: link_not_found.

    응답: {project_id, linked_issues[], message}.
    """
    _require_operator(current_user)
    return await unlink_issue_from_project_v2(
        db,
        project_id=project_id,
        issue_id=issue_id,
        operator_id=str(current_user.id),
    )
