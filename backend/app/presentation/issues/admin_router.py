"""USCP V2 — Issues Admin Router (M02-06~11 게이트키핑).

설계 근거:
  - feature-spec §M02-06~11 (게이트키핑 워크플로우)
  - design.md §4.2 M02 admin endpoints
  - design.md §5.2 6단계 워크플로우

엔드포인트:
  - GET    /admin/issues                      — M02-07 게이트키핑 큐
  - GET    /admin/issues/stats                — M02-18 단계별 통계 (대시보드용)
  - GET    /admin/issues/{id}                 — M02-08 검토 화면 (V2 issues/{id} 와 동일 구조 + 비공개 단계 포함)
  - GET    /admin/issues/{id}/history         — M02-17 단계 진행 이력 조회
  - POST   /admin/issues/{id}/transition      — M02-09~13 단계 전환
  - PATCH  /admin/issues/{id}/track           — M02-19 트랙 단독 변경
  - POST   /admin/issues/{id}/reject          — M02-14 반려

권한: operator 만 (V2 design.md §6.2).
현재 Sprint 1/2 시점에는 V1 require_admin/require_operator dependency 가 일부만
구현되어 있어 본 라우터는 일반 인증 확인 + role 체크를 직접 수행.
Sprint 5 후반에 V2 RBAC 미들웨어로 통합 예정.
"""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.gatekeeping_service import (
    list_gatekeeping_queue_v2,
    list_gatekeeping_stats_v2,
    reject_issue_v2,
    transition_issue_v2,
    update_track_only_v2,
)
from app.application.issue_service import get_issue_v2
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


# ───── 권한 가드 ────────────────────────────────────────────


def _require_operator(user: User) -> None:
    """Operator 권한 검증. V1 admin role 도 호환."""
    role = str(getattr(user, "role", "") or "").lower()
    if role not in ("operator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "operator_required",
                "message": "운영자만 접근 가능합니다.",
            },
        )


# ───── Schemas ──────────────────────────────────────────────


StageCode = Literal[
    "reported",
    "reviewing",
    "published",
    "mentor_assigned",
    "in_progress",
    "resolved",
    "rejected",
]
TrackCode = Literal["policy_reflection", "policy_reference", "citizen_autonomy"]


class V2TransitionRequest(BaseModel):
    to_stage: StageCode = Field(..., description="목표 단계")
    comment: str | None = Field(None, max_length=2000, description="검토 의견")
    track: TrackCode | None = Field(
        None, description="M02-09 reviewing 진입 시 필수"
    )


class V2RejectRequest(BaseModel):
    reason: str = Field(..., min_length=30, max_length=2000)


class V2TrackUpdateRequest(BaseModel):
    track: TrackCode


class V2TransitionResponse(BaseModel):
    issue_id: str
    prev_stage: str
    stage: str
    track: str | None = None
    transitioned_at: str


# ───── Endpoints ────────────────────────────────────────────


@router.get("", summary="M02-07 게이트키핑 큐")
async def list_queue(
    stage: Optional[StageCode] = None,
    region: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "-created_at",
    limit: int = 20,
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """운영자 큐 — 모든 단계 포함 (reported/reviewing 등 비공개 단계도 노출)."""
    _require_operator(current_user)
    return await list_gatekeeping_queue_v2(
        db,
        stage=stage,
        region=region,
        q=q,
        sort=sort,
        limit=limit,
        cursor=cursor,
    )


@router.get("/stats", summary="M02-18 단계별 통계")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """단계별 카운트 — Admin 대시보드 위젯용."""
    _require_operator(current_user)
    return await list_gatekeeping_stats_v2(db)


@router.get("/{issue_id}", summary="M02-08 검토 화면")
async def get_issue_admin(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """검토 화면용 상세. 공개 `/issues/{id}` 와 동일 응답 구조."""
    _require_operator(current_user)
    return await get_issue_v2(db, issue_id=issue_id, viewer_id=str(current_user.id))


@router.get("/{issue_id}/history", summary="M02-17 단계 진행 이력")
async def get_history(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    """단계 history 만 따로 — 감사 로그 화면 연동."""
    _require_operator(current_user)
    detail = await get_issue_v2(db, issue_id=issue_id, viewer_id=str(current_user.id))
    return {"issue_id": issue_id, "history": detail.get("history", [])}


@router.post(
    "/{issue_id}/transition",
    response_model=V2TransitionResponse,
    summary="M02-09~13 단계 전환",
)
async def transition(
    issue_id: str,
    body: V2TransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2TransitionResponse:
    """단계 전환.

    분기:
      - 409 invalid_transition: state machine 위반
      - 422 track_required: reviewing 진입 시 track 누락
      - 422 invalid_track: 정의되지 않은 track
    """
    _require_operator(current_user)
    result = await transition_issue_v2(
        db,
        issue_id=issue_id,
        operator_id=str(current_user.id),
        to_stage=body.to_stage,
        comment=body.comment,
        track=body.track,
    )
    return V2TransitionResponse(**result)  # type: ignore[arg-type]


@router.patch("/{issue_id}/track", summary="M02-19 트랙 단독 변경")
async def patch_track(
    issue_id: str,
    body: V2TrackUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    _require_operator(current_user)
    return await update_track_only_v2(
        db,
        issue_id=issue_id,
        operator_id=str(current_user.id),
        track=body.track,
    )


@router.post(
    "/{issue_id}/reject",
    response_model=V2TransitionResponse,
    summary="M02-14 반려",
)
async def reject(
    issue_id: str,
    body: V2RejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2TransitionResponse:
    """반려 — 사유 30자 이상."""
    _require_operator(current_user)
    result = await reject_issue_v2(
        db,
        issue_id=issue_id,
        operator_id=str(current_user.id),
        reason=body.reason,
    )
    return V2TransitionResponse(**result)  # type: ignore[arg-type]


# ════════════════════════════════════════════════════════════════
#  M02-21 — 댓글로 해결된 제보 종결 처리
# ════════════════════════════════════════════════════════════════
from app.application.gatekeeping_service import resolve_by_comment_v2  # noqa: E402


class V2ResolveByCommentRequest(BaseModel):
    comment_id: str = Field(..., description="해결로 인정할 댓글 ID")


@router.post(
    "/{issue_id}/resolve-by-comment",
    response_model=V2TransitionResponse,
    summary="M02-21 댓글로 해결된 제보 종결 처리",
)
async def resolve_by_comment(
    issue_id: str,
    body: V2ResolveByCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2TransitionResponse:
    """6단계 정상 워크플로우를 우회하여 즉시 resolved 로 종결.

    분기:
      - 404 issue_not_found / comment_not_found
      - 409 invalid_transition: 이미 resolved/rejected
      - 422 comment_issue_mismatch: 댓글이 해당 제보 소속 아님
    """
    _require_operator(current_user)
    result = await resolve_by_comment_v2(
        db,
        issue_id=issue_id,
        operator_id=str(current_user.id),
        comment_id=body.comment_id,
    )
    # V2TransitionResponse 와 호환되는 필드만 전달
    return V2TransitionResponse(
        issue_id=str(result["issue_id"]),
        prev_stage=str(result["prev_stage"]),
        stage=str(result["stage"]),
        track=result.get("track") if isinstance(result.get("track"), str) else None,
        transitioned_at=str(result["transitioned_at"]),
    )
