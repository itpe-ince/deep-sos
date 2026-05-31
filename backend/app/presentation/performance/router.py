"""USCP V2 — Performance Public Router (M06-02/05/07/08 공개 조회).

설계 근거: design.md §4.2 M06 (`/performance`, `/contents`, 자료실)

공개 엔드포인트 (비로그인 포함):
  - GET /performance                (M06-02 지표 목록 + 달성률)
  - GET /performance/dashboard      (M06-05 12개월 추이)
  - GET /contents                   (M06-07 공지·이벤트 목록, ?category=notice|event)
  - GET /contents/{id}              (M06-07 상세)
  - GET /resources                  (M06-08 자료실 목록, ?category=guide|template|toolkit|etc)
  - GET /resources/{id}/download    (M06-08 다운로드 + count +1)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.attachment_service import (
    download_attachment_v2,
    list_attachments_v2,
)
from app.application.content_service import get_content_v2, list_contents_v2
from app.application.kpi_service import kpi_dashboard_v2, list_kpis_v2
from app.core.database import get_db

router = APIRouter()
contents_router = APIRouter()
resources_router = APIRouter()


# ── M06-02/05 성과지표 (공개) ───────────────────────────────


@router.get("", summary="M06-02 성과지표 목록 (공개, 달성률)")
async def get_performance(db: AsyncSession = Depends(get_db)) -> dict:
    return await list_kpis_v2(db)


@router.get("/dashboard", summary="M06-05 성과 대시보드 (공개, 12개월 추이)")
async def get_dashboard(db: AsyncSession = Depends(get_db)) -> dict:
    return await kpi_dashboard_v2(db)


# ── M06-07 공지·이벤트 (공개) ───────────────────────────────


@contents_router.get("", summary="M06-07 공지·이벤트 목록 (공개)")
async def get_contents(
    category: str | None = Query(default=None, description="notice | event | all"),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await list_contents_v2(db, category=category, limit=limit, offset=offset)


@contents_router.get("/{content_id}", summary="M06-07 공지·이벤트 상세 (공개)")
async def get_content(content_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    """404: content_not_found."""
    return await get_content_v2(db, content_id=content_id)


# ── M06-08 자료실 (공개 조회·다운로드) ──────────────────────


@resources_router.get("", summary="M06-08 자료실 목록 (공개)")
async def get_resources(
    category: str | None = Query(default=None, description="guide|template|toolkit|etc"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await list_attachments_v2(db, category=category, limit=limit, offset=offset)


@resources_router.get("/{attachment_id}/download", summary="M06-08 자료 다운로드 (공개, count +1)")
async def download_resource(
    attachment_id: str, db: AsyncSession = Depends(get_db)
) -> dict:
    """404: attachment_not_found. download_count atomic +1 후 presigned URL 반환."""
    return await download_attachment_v2(db, attachment_id=attachment_id)
