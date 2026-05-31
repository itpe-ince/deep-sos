"""USCP V2 — CMS Admin Router (M07-01~12 운영자).

설계 근거: design.md §4.2 M07 (`/admin/cms/{notices,events,resources,banners,terms}`)

엔드포인트 (operator):
  공지·이벤트 : GET/POST/PATCH/DELETE /admin/cms/contents (category=notice|event)
  자료실      : POST /admin/cms/resources/presign, POST /admin/cms/resources (M07-05)
  배너        : GET/POST/PATCH /admin/cms/banners (M07-07/08/09)
  약관        : GET/POST /admin/cms/terms, GET /admin/cms/terms/versions (M07-10~12)
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.attachment_service import (
    create_attachment_v2,
    presign_attachment_upload_v2,
)
from app.application.banner_service import (
    create_banner_v2,
    list_banners_v2,
    update_banner_v2,
)
from app.application.content_service import (
    create_content_v2,
    delete_content_v2,
    list_admin_contents_v2,
    update_content_v2,
)
from app.application.terms_service import (
    list_terms_versions_v2,
    publish_terms_v2,
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


# ── M07-01~04 공지·이벤트 ───────────────────────────────────


class CreateContentRequest(BaseModel):
    category: str = Field(..., description="notice | event")
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)
    is_pinned: bool = False
    event_at: datetime | None = None
    publish: bool = True


class UpdateContentRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    body: str | None = None
    is_pinned: bool | None = None
    event_at: datetime | None = None
    publish: bool | None = None


@router.get("/contents", summary="M07-02/04 콘텐츠 목록 (운영자, 임시저장 포함)")
async def admin_list_contents(
    category: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_admin_contents_v2(db, category=category, limit=limit, offset=offset)


@router.post("/contents", summary="M07-01/03 공지·이벤트 작성 (운영자)")
async def create_content(
    body: CreateContentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_category/title, body_required."""
    _require_operator(current_user)
    return await create_content_v2(
        db,
        operator_id=str(current_user.id),
        category=body.category,
        title=body.title,
        body=body.body,
        is_pinned=body.is_pinned,
        event_at=body.event_at,
        publish=body.publish,
    )


@router.patch("/contents/{content_id}", summary="M07-02/04 공지·이벤트 수정 (운영자)")
async def update_content(
    content_id: str,
    body: UpdateContentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: content_not_found."""
    _require_operator(current_user)
    return await update_content_v2(
        db,
        operator_id=str(current_user.id),
        content_id=content_id,
        title=body.title,
        body=body.body,
        is_pinned=body.is_pinned,
        event_at=body.event_at,
        publish=body.publish,
    )


@router.delete("/contents/{content_id}", summary="M07-02/04 공지·이벤트 삭제 (운영자)")
async def delete_content(
    content_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: content_not_found."""
    _require_operator(current_user)
    return await delete_content_v2(
        db, operator_id=str(current_user.id), content_id=content_id
    )


# ── M07-05 자료실 업로드 ────────────────────────────────────


class PresignRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str | None = None


class CreateResourceRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., description="guide|template|toolkit|etc")
    minio_key: str = Field(..., min_length=1, max_length=500)
    tags: list[str] | None = None
    file_size: int | None = None
    content_type: str | None = None


@router.post("/resources/presign", summary="M07-05 자료실 업로드 presign (운영자)")
async def presign_resource(
    body: PresignRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await presign_attachment_upload_v2(
        filename=body.filename, content_type=body.content_type
    )


@router.post("/resources", summary="M07-05 자료실 메타데이터 등록 (운영자)")
async def create_resource(
    body: CreateResourceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_title/category, minio_key_required."""
    _require_operator(current_user)
    return await create_attachment_v2(
        db,
        operator_id=str(current_user.id),
        title=body.title,
        category=body.category,
        minio_key=body.minio_key,
        tags=body.tags,
        file_size=body.file_size,
        content_type=body.content_type,
    )


# ── M07-07/08/09 배너 ───────────────────────────────────────


class CreateBannerRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    image_url: str = Field(..., min_length=1)
    position: str = "main"
    subtitle: str | None = None
    link_url: str | None = None
    order_index: int = 0


class UpdateBannerRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    subtitle: str | None = None
    image_url: str | None = None
    link_url: str | None = None
    order_index: int | None = None
    is_active: bool | None = None


@router.get("/banners", summary="M07-08 배너 목록 (운영자, 전체)")
async def admin_list_banners(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_banners_v2(db, include_inactive=True)


@router.post("/banners", summary="M07-07 배너 등록 (운영자)")
async def create_banner(
    body: CreateBannerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_title, unsafe_link_url (M07-09)."""
    _require_operator(current_user)
    return await create_banner_v2(
        db,
        operator_id=str(current_user.id),
        title=body.title,
        image_url=body.image_url,
        position=body.position,
        subtitle=body.subtitle,
        link_url=body.link_url,
        order_index=body.order_index,
    )


@router.patch("/banners/{banner_id}", summary="M07-08/09 배너 수정 (운영자)")
async def update_banner(
    banner_id: str,
    body: UpdateBannerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: banner_not_found. 422: unsafe_link_url."""
    _require_operator(current_user)
    return await update_banner_v2(
        db,
        operator_id=str(current_user.id),
        banner_id=banner_id,
        title=body.title,
        subtitle=body.subtitle,
        image_url=body.image_url,
        link_url=body.link_url,
        order_index=body.order_index,
        is_active=body.is_active,
    )


# ── M07-10~12 약관 ──────────────────────────────────────────


class PublishTermsRequest(BaseModel):
    kind: str = Field(..., description="service | privacy")
    body: str = Field(..., min_length=1)
    effective_at: datetime | None = None
    require_reconsent: bool = False


@router.get("/terms/versions", summary="M07-12 약관 버전 이력 (운영자)")
async def admin_terms_versions(
    kind: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_terms_versions_v2(db, kind=kind)


@router.post("/terms", summary="M07-10/11/12 약관 발행 (운영자, 버전 자동)")
async def publish_terms(
    body: PublishTermsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_kind, body_required."""
    _require_operator(current_user)
    return await publish_terms_v2(
        db,
        operator_id=str(current_user.id),
        kind=body.kind,
        body=body.body,
        effective_at=body.effective_at,
        require_reconsent=body.require_reconsent,
    )
