"""USCP V2 — Mentors Admin Router (M04-01~07, 운영자 전용).

설계 근거:
  - design.md §4.2 M04 (`/admin/mentors`, `/admin/teams`, `/admin/matchings`)
  - feature-spec §M04-01~07

엔드포인트 (모두 operator/admin):
  멘토   : GET /admin/mentors, POST /admin/mentors/grant, POST /admin/mentors/{id}/revoke
  학생팀 : GET /admin/teams, POST /admin/teams, PATCH /admin/teams/{id}, DELETE /admin/teams/{id}
  매칭   : POST /admin/matchings, DELETE /admin/matchings/{id}, GET /admin/matchings/project/{pid}
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.matching_service import (
    list_project_matchings_v2,
    match_project_v2,
    unmatch_v2,
)
from app.application.mentor_service import (
    grant_mentor_v2,
    list_mentors_v2,
    revoke_mentor_v2,
)
from app.application.student_team_service import (
    create_team_v2,
    disband_team_v2,
    list_teams_v2,
    update_team_v2,
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


# ── 멘토 (M04-01~03) ────────────────────────────────────────────


class GrantMentorRequest(BaseModel):
    user_id: str = Field(..., description="멘토 자격을 부여할 회원 ID")
    affiliation: str | None = Field(None, max_length=200, description="소속")
    expertise: list[str] | None = Field(None, description="전문분야 태그")


@router.get("/mentors", summary="M04-03 멘토 목록·검색 (운영자)")
async def get_mentors(
    q: str | None = None,
    affiliation: str | None = None,
    expertise: str | None = None,
    include_inactive: bool = False,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_mentors_v2(
        db,
        q=q,
        affiliation=affiliation,
        expertise=expertise,
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )


@router.post("/mentors/grant", summary="M04-01 멘토 자격 부여 (운영자)")
async def grant_mentor(
    body: GrantMentorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: user_not_found. 재부여(이미 활성)는 idempotent."""
    _require_operator(current_user)
    return await grant_mentor_v2(
        db,
        operator_id=str(current_user.id),
        user_id=body.user_id,
        affiliation=body.affiliation,
        expertise=body.expertise,
    )


@router.post("/mentors/{mentor_id}/revoke", summary="M04-02 멘토 자격 해제 (운영자)")
async def revoke_mentor(
    mentor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: mentor_not_found. 진행중 매칭 있으면 응답에 경고 플래그."""
    _require_operator(current_user)
    return await revoke_mentor_v2(
        db, operator_id=str(current_user.id), mentor_id=mentor_id
    )


# ── 학생팀 (M04-04~05) ──────────────────────────────────────────


class CreateTeamRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    leader_id: str = Field(..., description="팀장 회원 ID")
    member_ids: list[str] = Field(default_factory=list, description="팀원 회원 ID 목록")


class UpdateTeamRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    leader_id: str | None = None
    member_ids: list[str] | None = None


@router.get("/teams", summary="학생팀 목록 (운영자)")
async def get_teams(
    include_inactive: bool = False,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_teams_v2(
        db, include_inactive=include_inactive, limit=limit, offset=offset
    )


@router.post("/teams", summary="M04-04 학생팀 구성 (운영자)")
async def create_team(
    body: CreateTeamRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_team_name/leader_required. 404: member_not_found."""
    _require_operator(current_user)
    return await create_team_v2(
        db,
        operator_id=str(current_user.id),
        name=body.name,
        leader_id=body.leader_id,
        member_ids=body.member_ids,
    )


@router.patch("/teams/{team_id}", summary="M04-05 학생팀 수정 (운영자)")
async def update_team(
    team_id: str,
    body: UpdateTeamRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: team_not_found. member_ids 제공 시 팀원 전량 교체."""
    _require_operator(current_user)
    return await update_team_v2(
        db,
        operator_id=str(current_user.id),
        team_id=team_id,
        name=body.name,
        leader_id=body.leader_id,
        member_ids=body.member_ids,
    )


@router.delete("/teams/{team_id}", summary="M04-05 학생팀 해체 (운영자)")
async def disband_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: team_not_found. 진행중 매칭 있으면 응답에 경고 플래그."""
    _require_operator(current_user)
    return await disband_team_v2(
        db, operator_id=str(current_user.id), team_id=team_id
    )


# ── 매칭 (M04-06~07) ────────────────────────────────────────────


class MatchRequest(BaseModel):
    project_id: str = Field(..., description="매칭할 리빙랩 프로젝트 ID")
    mentor_ids: list[str] = Field(..., min_length=1, description="매칭할 멘토 ID 목록")
    team_id: str | None = Field(None, description="매칭할 학생팀 ID (선택)")


@router.post("/matchings", summary="M04-06 의제별 멘토단 매칭 (운영자)")
async def create_matching(
    body: MatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: project/mentor/team 미존재. 422: mentor_required.

    중복 (project, mentor) 활성 매칭은 idempotent 로 skip. 완료 시 알림 발송(M04-07).
    """
    _require_operator(current_user)
    return await match_project_v2(
        db,
        operator_id=str(current_user.id),
        project_id=body.project_id,
        mentor_ids=body.mentor_ids,
        team_id=body.team_id,
    )


@router.delete("/matchings/{matching_id}", summary="매칭 해제 (운영자)")
async def release_matching(
    matching_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: matching_not_found."""
    _require_operator(current_user)
    return await unmatch_v2(
        db, operator_id=str(current_user.id), matching_id=matching_id
    )


@router.get("/matchings/project/{project_id}", summary="프로젝트 활성 매칭 목록 (운영자)")
async def get_project_matchings(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_project_matchings_v2(db, project_id=project_id)
