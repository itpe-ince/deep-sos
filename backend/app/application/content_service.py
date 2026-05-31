"""USCP V2 — Application / Content Service (M06-07 공지·이벤트 공개 조회).

설계 근거:
  - feature-spec §M06-07 (공지·이벤트 통합 게시판 조회 — 카테고리 필터·뱃지, 게시된 항목만)
  - design.md §4.2 M06 (`GET /contents?category=notice|event|all`, `GET /contents/{id}`)

규칙:
  - 본 서비스는 공개 조회 전용 (작성·편집은 M07-01~04 CMS 소관)
  - published_at IS NOT NULL 인 항목만 노출 (임시저장 제외), deleted_at 제외
  - category: notice(공지) / event(이벤트), 필터 'all' 이면 전체
"""
from __future__ import annotations

import logging

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_VALID_CATEGORIES = frozenset({"notice", "event"})


async def list_contents_v2(
    db: AsyncSession,
    *,
    category: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, object]:
    """M06-07 공지·이벤트 통합 목록 (공개). 게시된 항목만, 고정글 우선·최신순.

    category: 'notice' | 'event' | None/'all'(전체)
    """
    limit = max(1, min(limit, 50))
    offset = max(0, offset)
    clauses = ["deleted_at IS NULL", "published_at IS NOT NULL"]
    params: dict[str, object] = {"limit": limit, "offset": offset}
    if category and category in _VALID_CATEGORIES:
        clauses.append("category::text = :cat")
        params["cat"] = category
    where = " AND ".join(clauses)
    try:
        total_row = (
            await db.execute(sa.text(f"SELECT COUNT(*) AS c FROM contents WHERE {where}"), params)
        ).first()
        total = int(total_row.c) if total_row else 0
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT id::text AS id, category::text AS category, title,
                           is_pinned, published_at, event_at
                    FROM contents
                    WHERE {where}
                    ORDER BY is_pinned DESC, published_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_contents_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "category": r.category,
                "category_label": "공지" if r.category == "notice" else "이벤트",
                "title": r.title,
                "is_pinned": bool(r.is_pinned),
                "published_at": r.published_at.isoformat() if r.published_at else None,
                "event_at": r.event_at.isoformat() if r.event_at else None,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }


async def get_content_v2(db: AsyncSession, *, content_id: str) -> dict[str, object]:
    """M06-07 공지·이벤트 상세 (공개). 게시된 항목만."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT c.id::text AS id, c.category::text AS category, c.title, c.body,
                           c.is_pinned, c.published_at, c.event_at, u.name AS author_name
                    FROM contents c
                    LEFT JOIN users u ON u.id = c.author_id
                    WHERE c.id = CAST(:cid AS uuid)
                      AND c.deleted_at IS NULL AND c.published_at IS NOT NULL
                    LIMIT 1
                    """
                ),
                {"cid": content_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "content_not_found", "message": "콘텐츠를 찾을 수 없습니다."},
        )
    return {
        "id": str(row.id),
        "category": row.category,
        "category_label": "공지" if row.category == "notice" else "이벤트",
        "title": row.title,
        "body": row.body,
        "is_pinned": bool(row.is_pinned),
        "published_at": row.published_at.isoformat() if row.published_at else None,
        "event_at": row.event_at.isoformat() if row.event_at else None,
        "author_name": row.author_name,
    }
