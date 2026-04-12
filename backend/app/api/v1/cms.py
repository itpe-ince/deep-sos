"""CMS endpoints — cms_pages, cms_banners (Sprint 2).

공개 조회(관리자 불필요):
- GET /cms/pages/:slug
- GET /cms/banners?position=hero

관리자 전용:
- GET  /cms/pages             (목록)
- PUT  /cms/pages/:slug       (TipTap JSON 업데이트)
- POST /cms/banners
- PUT  /cms/banners/:id
- DELETE /cms/banners/:id
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.api.pagination import paginated
from app.core.cache import cache_get, cache_set, invalidate
from app.core.database import get_db
from app.models.cms import CmsBanner, CmsPage
from app.models.user import User
from app.schemas.cms import (
    CmsBannerCreate,
    CmsBannerRead,
    CmsBannerUpdate,
    CmsPageRead,
    CmsPageUpdate,
)

router = APIRouter()


# ─────────────────────────────────────────────────
# Pages — 공개 조회
# ─────────────────────────────────────────────────


@router.get("/pages/{slug}", response_model=CmsPageRead)
async def get_page(slug: str, db: AsyncSession = Depends(get_db)):
    # 60초 캐시 — 공개 페이지 빈번 조회
    cache_key = f"cache:cms:page:{slug}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached  # FastAPI가 response_model로 validate

    result = await db.execute(
        select(CmsPage).where(
            CmsPage.slug == slug, CmsPage.status == "published"
        )
    )
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Page '{slug}' not found"
        )

    payload = CmsPageRead.model_validate(page).model_dump(mode="json")
    await cache_set(cache_key, payload, ttl=60)
    return payload


# ─────────────────────────────────────────────────
# Pages — 관리자 전용
# ─────────────────────────────────────────────────


@router.get("/pages")
async def list_pages(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    stmt = select(CmsPage).order_by(CmsPage.updated_at.desc())
    total = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    rows = (await db.execute(stmt.limit(size).offset(offset))).scalars().all()
    items = [CmsPageRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.put("/pages/{slug}", response_model=CmsPageRead)
async def update_page(
    slug: str,
    data: CmsPageUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> CmsPage:
    result = await db.execute(select(CmsPage).where(CmsPage.slug == slug))
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Page '{slug}' not found"
        )

    page.title = data.title
    page.content_json = data.content_json
    page.content_html = data.content_html
    page.status = data.status
    page.updated_by = admin.id
    await db.commit()
    await db.refresh(page)

    # 캐시 무효화 — 공개 조회가 즉시 새 값 반영
    await invalidate(f"cms:page:{slug}")
    return page


# ─────────────────────────────────────────────────
# Banners — 공개 조회
# ─────────────────────────────────────────────────


@router.get("/banners")
async def list_banners(
    position: str | None = Query(default=None, pattern="^(hero|sub|footer)$"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(CmsBanner).where(CmsBanner.is_active.is_(True))
    if position:
        stmt = stmt.where(CmsBanner.position == position)
    stmt = stmt.order_by(CmsBanner.order_index.asc(), CmsBanner.created_at.desc())

    rows = (await db.execute(stmt)).scalars().all()
    items = [CmsBannerRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, len(items), 1, max(1, len(items)))


# ─────────────────────────────────────────────────
# Banners — 관리자 전용 CRUD
# ─────────────────────────────────────────────────


@router.post(
    "/banners",
    response_model=CmsBannerRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_banner(
    data: CmsBannerCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> CmsBanner:
    banner = CmsBanner(**data.model_dump())
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.put("/banners/{banner_id}", response_model=CmsBannerRead)
async def update_banner(
    banner_id: uuid.UUID,
    data: CmsBannerUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> CmsBanner:
    result = await db.execute(select(CmsBanner).where(CmsBanner.id == banner_id))
    banner = result.scalar_one_or_none()
    if banner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found"
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(banner, field, value)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.delete("/banners/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banner(
    banner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    result = await db.execute(select(CmsBanner).where(CmsBanner.id == banner_id))
    banner = result.scalar_one_or_none()
    if banner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found"
        )
    await db.delete(banner)
    await db.commit()
