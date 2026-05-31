"""USCP V2 — Projects Router (M03 리빙랩 공개 조회).

설계 근거:
  - feature-spec §M03-01 (리빙랩 목록 조회)
  - feature-spec §M03-02 (리빙랩 상세 페이지)
  - design.md §4.2 M03 public endpoints

V1 호환: 본 V2 라우터는 GET 만 우선 도입. V1 `/projects` POST/PATCH 등은 V1 라우터 유지.
"""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.project_service import (
    get_project_v2,
    list_project_timeline_v2,
    list_projects_v2,
)
from app.core.database import get_db

router = APIRouter()

RegionCode = Literal["daejeon", "gongju", "yesan", "cheonan", "sejong"]
ProjectStage = Literal["recruiting", "in_progress", "completed"]


class V2ProjectItem(BaseModel):
    id: str
    title: str
    summary: str | None = None
    region: str | None = None
    stage: str | None = None
    start_at: str | None = None
    end_at: str | None = None
    created_at: str


class V2ProjectListResponse(BaseModel):
    data: list[V2ProjectItem]
    meta: dict


class V2ProjectDetail(V2ProjectItem):
    description: str | None = None
    owner_id: str | None = None
    # M03-14 연결된 의제 목록 [{id, title, stage}] (N:M, H01)
    linked_issues: list[dict] = []


@router.get(
    "",
    response_model=V2ProjectListResponse,
    summary="V2 리빙랩 목록 (M03-01)",
)
async def list_projects(
    region: Optional[RegionCode] = None,
    stage: Optional[ProjectStage] = None,
    limit: int = Query(default=20, ge=1, le=50),
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> V2ProjectListResponse:
    """공개 리빙랩 목록. 필터: region, stage."""
    result = await list_projects_v2(
        db,
        region=region,
        stage=stage,
        limit=limit,
        cursor=cursor,
    )
    return V2ProjectListResponse(**result)  # type: ignore[arg-type]


@router.get(
    "/{project_id}",
    response_model=V2ProjectDetail,
    summary="V2 리빙랩 상세 (M03-02)",
)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
) -> V2ProjectDetail:
    """공개 리빙랩 상세."""
    result = await get_project_v2(db, project_id=project_id)
    return V2ProjectDetail(**result)  # type: ignore[arg-type]


class V2TimelineEntry(BaseModel):
    id: str
    entry_date: str
    title: str
    description: str | None = None
    created_at: str
    created_by: dict


class V2TimelineListResponse(BaseModel):
    data: list[V2TimelineEntry]
    meta: dict


@router.get(
    "/{project_id}/timeline",
    response_model=V2TimelineListResponse,
    summary="V2 활동 타임라인 조회 (M03-03)",
)
async def list_timeline(
    project_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> V2TimelineListResponse:
    """공개 — 프로젝트 활동 타임라인 (entry_date 내림차순)."""
    result = await list_project_timeline_v2(db, project_id=project_id, limit=limit)
    return V2TimelineListResponse(**result)  # type: ignore[arg-type]


# ════════════════════════════════════════════════════════════════
#  M03-08/09/10 — 멤버 권한 타임라인 + 산출물
# ════════════════════════════════════════════════════════════════
from datetime import date  # noqa: E402

from app.api.v1.auth import get_current_user  # noqa: E402
from app.application.project_service import (  # noqa: E402
    create_deliverable_v2,
    create_timeline_entry_v2,
    presign_deliverable_v2,
    update_deliverable_meta_v2,
)
from app.models.user import User  # noqa: E402


class V2CreateTimelineRequest(BaseModel):
    entry_date: date
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=10_000)


class V2DeliverablePresignRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=200)
    content_type: str = Field(..., min_length=1, max_length=100)
    size_bytes: int = Field(..., gt=0, le=100 * 1024 * 1024)


class V2DeliverablePresignResponse(BaseModel):
    upload_url: str
    minio_key: str
    expires_in_seconds: int = 300


class V2CreateDeliverableRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    minio_key: str = Field(..., min_length=1, max_length=500)
    content_type: str | None = Field(None, max_length=100)
    size_bytes: int | None = Field(None, gt=0)
    stage: str | None = Field(None, max_length=30)
    tags: list[str] | None = None


class V2UpdateDeliverableRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    stage: str | None = Field(None, max_length=30)
    tags: list[str] | None = None


@router.post(
    "/{project_id}/timeline",
    status_code=201,
    summary="M03-08 활동 타임라인 작성 (멤버/운영자)",
)
async def create_timeline_entry(
    project_id: str,
    body: V2CreateTimelineRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await create_timeline_entry_v2(
        db,
        project_id=project_id,
        author_id=str(current_user.id),
        author_role=str(getattr(current_user, "role", "") or ""),
        entry_date=body.entry_date,
        title=body.title,
        description=body.description,
    )


@router.post(
    "/{project_id}/deliverables/presign",
    response_model=V2DeliverablePresignResponse,
    summary="M03-09 산출물 업로드 presigned URL (멤버/운영자)",
)
async def presign_deliverable(
    project_id: str,
    body: V2DeliverablePresignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2DeliverablePresignResponse:
    result = await presign_deliverable_v2(
        db,
        project_id=project_id,
        uploader_id=str(current_user.id),
        uploader_role=str(getattr(current_user, "role", "") or ""),
        filename=body.filename,
        content_type=body.content_type,
        size_bytes=body.size_bytes,
    )
    return V2DeliverablePresignResponse(**result)  # type: ignore[arg-type]


@router.post(
    "/{project_id}/deliverables",
    status_code=201,
    summary="M03-09 산출물 메타데이터 등록 (presigned 업로드 후)",
)
async def create_deliverable(
    project_id: str,
    body: V2CreateDeliverableRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await create_deliverable_v2(
        db,
        project_id=project_id,
        uploader_id=str(current_user.id),
        uploader_role=str(getattr(current_user, "role", "") or ""),
        title=body.title,
        minio_key=body.minio_key,
        content_type=body.content_type,
        size_bytes=body.size_bytes,
        stage=body.stage,
        tags=body.tags,
    )


@router.patch(
    "/deliverables/{deliverable_id}",
    summary="M03-10 산출물 메타데이터 수정 (업로드자 본인/운영자)",
)
async def update_deliverable(
    deliverable_id: str,
    body: V2UpdateDeliverableRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await update_deliverable_meta_v2(
        db,
        deliverable_id=deliverable_id,
        actor_id=str(current_user.id),
        actor_role=str(getattr(current_user, "role", "") or ""),
        title=body.title,
        stage=body.stage,
        tags=body.tags,
    )
