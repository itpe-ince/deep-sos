"""USCP V2 — Network Public Router (M05-02/05/07 공개 조회).

설계 근거: design.md §4.2 M05 (`GET /network/organizations`, `/network/mous`, `/network/community`)

공개 엔드포인트 (비로그인 포함):
  - GET /network/organizations  (M05-02 협력기관 목록, 활성만)
  - GET /network/mous           (M05-05 MOU 목록, 만료 자동 표시)
  - GET /network/community      (M05-07 커뮤니티 목록)
  - GET /network/community/{id} (M05-07 게시글 상세 + 댓글)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.community_service import (
    get_community_post_v2,
    list_community_posts_v2,
)
from app.application.mou_service import list_mous_v2
from app.application.organization_service import list_organizations_v2
from app.core.database import get_db

router = APIRouter()


@router.get("/organizations", summary="M05-02 협력기관 목록 (공개)")
async def get_organizations(
    category: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """공개 협력기관 목록 (활성만). 유형 필터."""
    return await list_organizations_v2(
        db, category=category, include_inactive=False, limit=limit, offset=offset
    )


@router.get("/mous", summary="M05-05 MOU 목록 (공개)")
async def get_mous(
    status: str | None = Query(default=None, description="active | expired"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """공개 MOU 목록. 만료일 기준 status 파생."""
    return await list_mous_v2(db, status_filter=status, limit=limit, offset=offset)


@router.get("/community", summary="M05-07 커뮤니티 게시글 목록 (공개)")
async def get_community_posts(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """공개 커뮤니티 목록. 고정글 우선·최신순."""
    return await list_community_posts_v2(db, limit=limit, offset=offset)


@router.get("/community/{post_id}", summary="M05-07 커뮤니티 게시글 상세 (공개)")
async def get_community_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """게시글 상세 + 댓글(숨김 제외). 404: post_not_found."""
    return await get_community_post_v2(db, post_id=post_id)
