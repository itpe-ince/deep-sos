"""USCP V2 — Application / Banner Service (M07-07/08/09 메인 배너).

설계 근거:
  - feature-spec §M07-07 (배너 이미지 업로드 — 제목·URL·순서)
  - feature-spec §M07-08 (활성·노출 순서, 스케줄러 없음)
  - feature-spec §M07-09 (클릭 URL — javascript: 등 위험 protocol 차단)
  - design.md §4.2 M07 (`/admin/cms/banners`), §8.2 보안 (link_url protocol whitelist)

규칙:
  - 등록·수정·토글은 운영자만 (라우터 _require_operator)
  - 공개 목록은 is_active=true 만, order_index 오름차순
  - link_url 은 http/https/mailto/내부경로(/) 만 허용 — javascript:·data: 등 차단 (M07-09)
  - cms_banners 테이블(V1 0003) 재사용
"""
from __future__ import annotations

import datetime as _dt
import logging
import re
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_TITLE_MAX = 200
# M07-09 허용 protocol whitelist: http(s)·mailto·내부 절대경로(/)
_SAFE_URL_RE: Final[re.Pattern[str]] = re.compile(r"^(https?://|mailto:|/)", re.IGNORECASE)


def _validate_link_url(link_url: str | None) -> None:
    """M07-09 위험 URL 차단. None/빈값은 허용(링크 없음)."""
    if not link_url:
        return
    url = link_url.strip()
    if not _SAFE_URL_RE.match(url):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "unsafe_link_url",
                "message": "링크는 http(s)·mailto 또는 내부 경로(/)만 허용됩니다.",
            },
        )


async def list_banners_v2(
    db: AsyncSession,
    *,
    include_inactive: bool = False,
) -> dict[str, object]:
    """M07-08 배너 목록. 공개는 활성만(order_index asc), 운영자는 전체."""
    where = "1=1" if include_inactive else "is_active = true"
    try:
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT id::text AS id, position, title, subtitle, image_url,
                           link_url, order_index, is_active
                    FROM cms_banners
                    WHERE {where}
                    ORDER BY order_index ASC, created_at DESC
                    """
                )
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_banners_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0}}
    return {
        "data": [
            {
                "id": str(r.id),
                "position": r.position,
                "title": r.title,
                "subtitle": r.subtitle,
                "image_url": r.image_url,
                "link_url": r.link_url,
                "order_index": int(r.order_index or 0),
                "is_active": bool(r.is_active),
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }


async def create_banner_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    title: str,
    image_url: str,
    position: str = "main",
    subtitle: str | None = None,
    link_url: str | None = None,
    order_index: int = 0,
) -> dict[str, object]:
    """M07-07 배너 등록 (운영자). image_url 은 사전 업로드된 이미지 키/URL.

    Raises:
        HTTPException 422: 제목 길이·위험 URL
    """
    title_norm = (title or "").strip()
    if not (1 <= len(title_norm) <= _TITLE_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_title", "message": f"제목은 1~{_TITLE_MAX}자로 입력해 주세요."},
        )
    _validate_link_url(link_url)
    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO cms_banners
                        (position, title, subtitle, image_url, link_url, order_index,
                         is_active, created_at, updated_at)
                    VALUES (:pos, :title, :subtitle, :image, :link, :order, true, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "pos": position,
                    "title": title_norm,
                    "subtitle": subtitle,
                    "image": image_url,
                    "link": link_url,
                    "order": order_index,
                    "now": now,
                },
            )
        ).first()
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_banner_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "banner_create_failed", "message": "배너 등록 중 오류가 발생했습니다."},
        ) from exc
    return {"banner_id": row.id if row else None, "message": "배너를 등록했습니다."}


async def update_banner_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    banner_id: str,
    title: str | None = None,
    subtitle: str | None = None,
    image_url: str | None = None,
    link_url: str | None = None,
    order_index: int | None = None,
    is_active: bool | None = None,
) -> dict[str, object]:
    """M07-08/09 배너 수정 (운영자) — 활성·순서·URL 변경.

    Raises:
        HTTPException 404: 배너 미존재
        HTTPException 422: 위험 URL
    """
    try:
        exists = (
            await db.execute(
                sa.text("SELECT id FROM cms_banners WHERE id = CAST(:bid AS uuid) LIMIT 1"),
                {"bid": banner_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        exists = None
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "banner_not_found", "message": "배너를 찾을 수 없습니다."},
        )
    if link_url is not None:
        _validate_link_url(link_url)

    now = _dt.datetime.now(_dt.UTC)
    sets = ["updated_at = :now"]
    params: dict[str, object] = {"now": now, "bid": banner_id}
    if title is not None:
        t = title.strip()
        if not (1 <= len(t) <= _TITLE_MAX):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_title", "message": f"제목은 1~{_TITLE_MAX}자로 입력해 주세요."},
            )
        sets.append("title = :title")
        params["title"] = t
    if subtitle is not None:
        sets.append("subtitle = :subtitle")
        params["subtitle"] = subtitle
    if image_url is not None:
        sets.append("image_url = :image")
        params["image"] = image_url
    if link_url is not None:
        sets.append("link_url = :link")
        params["link"] = link_url
    if order_index is not None:
        sets.append("order_index = :order")
        params["order"] = order_index
    if is_active is not None:
        sets.append("is_active = :active")
        params["active"] = is_active
    try:
        await db.execute(
            sa.text(f"UPDATE cms_banners SET {', '.join(sets)} WHERE id = CAST(:bid AS uuid)"),
            params,
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_banner_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "banner_update_failed", "message": "배너 수정 중 오류가 발생했습니다."},
        ) from exc
    return {"banner_id": banner_id, "updated": True, "message": "배너를 수정했습니다."}
