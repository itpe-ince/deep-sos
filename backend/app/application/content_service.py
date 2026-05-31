"""USCP V2 — Application / Content Service (M06-07 조회 + M07-01~04 쓰기).

설계 근거:
  - feature-spec §M06-07 (공지·이벤트 통합 조회 — 카테고리 필터·뱃지, 게시된 항목만)
  - feature-spec §M07-01~04 (공지·이벤트 작성·수정·삭제 — 운영자, TipTap, 상단 고정)
  - design.md §4.2 M06/M07 (`/contents`, `/admin/cms/notices|events`)

규칙:
  - 조회(list/get)는 공개 — published_at IS NOT NULL + deleted_at IS NULL
  - 작성·수정·삭제(M07-01~04)는 운영자 (라우터 _require_operator)
  - category: notice(공지) / event(이벤트). event 는 event_at 선택
  - body 는 TipTap HTML — 저장 시 sanitize 권장(L01, Phase 7 일괄)
"""
from __future__ import annotations

import datetime as _dt
import logging

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_VALID_CATEGORIES = frozenset({"notice", "event"})
_TITLE_MAX = 200


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


# ════════════════════════════════════════════════════════════════
#  M07-01~04 공지·이벤트 작성·수정·삭제 (운영자)
# ════════════════════════════════════════════════════════════════


async def create_content_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    category: str,
    title: str,
    body: str,
    is_pinned: bool = False,
    event_at: _dt.datetime | None = None,
    publish: bool = True,
) -> dict[str, object]:
    """M07-01/03 공지·이벤트 작성 (운영자).

    publish=True 면 즉시 게시(published_at=now), False 면 임시저장(NULL).
    category: notice(M07-01) / event(M07-03, event_at 선택).

    Raises:
        HTTPException 422: category 부정·제목 길이·본문 누락
    """
    cat = (category or "").lower().strip()
    if cat not in _VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_category", "message": "종류는 notice 또는 event 여야 합니다."},
        )
    title_norm = (title or "").strip()
    if not (1 <= len(title_norm) <= _TITLE_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_title", "message": f"제목은 1~{_TITLE_MAX}자로 입력해 주세요."},
        )
    if not (body or "").strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "body_required", "message": "본문을 입력해 주세요."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO contents
                        (category, title, body, is_pinned, published_at, event_at,
                         author_id, created_at, updated_at)
                    VALUES
                        (CAST(:cat AS content_category), :title, :body, :pinned,
                         :published_at, :event_at, CAST(:author AS uuid), :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "cat": cat,
                    "title": title_norm,
                    "body": body,
                    "pinned": is_pinned,
                    "published_at": now if publish else None,
                    "event_at": event_at,
                    "author": operator_id,
                    "now": now,
                },
            )
        ).first()
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_content_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "content_create_failed", "message": "작성 중 오류가 발생했습니다."},
        ) from exc
    return {"content_id": row.id if row else None, "category": cat, "message": "등록했습니다."}


async def update_content_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    content_id: str,
    title: str | None = None,
    body: str | None = None,
    is_pinned: bool | None = None,
    event_at: _dt.datetime | None = None,
    publish: bool | None = None,
) -> dict[str, object]:
    """M07-02/04 공지·이벤트 수정 (운영자).

    Raises:
        HTTPException 404: 콘텐츠 미존재
    """
    try:
        exists = (
            await db.execute(
                sa.text(
                    "SELECT id FROM contents WHERE id = CAST(:cid AS uuid) "
                    "AND deleted_at IS NULL LIMIT 1"
                ),
                {"cid": content_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        exists = None
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "content_not_found", "message": "콘텐츠를 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    sets = ["updated_at = :now"]
    params: dict[str, object] = {"now": now, "cid": content_id}
    if title is not None:
        t = title.strip()
        if not (1 <= len(t) <= _TITLE_MAX):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_title", "message": f"제목은 1~{_TITLE_MAX}자로 입력해 주세요."},
            )
        sets.append("title = :title")
        params["title"] = t
    if body is not None:
        sets.append("body = :body")
        params["body"] = body
    if is_pinned is not None:
        sets.append("is_pinned = :pinned")
        params["pinned"] = is_pinned
    if event_at is not None:
        sets.append("event_at = :event_at")
        params["event_at"] = event_at
    if publish is not None:
        sets.append("published_at = :published_at")
        params["published_at"] = now if publish else None
    try:
        await db.execute(
            sa.text(f"UPDATE contents SET {', '.join(sets)} WHERE id = CAST(:cid AS uuid)"),
            params,
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_content_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "content_update_failed", "message": "수정 중 오류가 발생했습니다."},
        ) from exc
    return {"content_id": content_id, "updated": True, "message": "수정했습니다."}


async def delete_content_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    content_id: str,
) -> dict[str, object]:
    """M07-02/04 공지·이벤트 삭제 (운영자, soft).

    Raises:
        HTTPException 404: 콘텐츠 미존재
    """
    try:
        exists = (
            await db.execute(
                sa.text(
                    "SELECT id FROM contents WHERE id = CAST(:cid AS uuid) "
                    "AND deleted_at IS NULL LIMIT 1"
                ),
                {"cid": content_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        exists = None
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "content_not_found", "message": "콘텐츠를 찾을 수 없습니다."},
        )
    try:
        await db.execute(
            sa.text("UPDATE contents SET deleted_at = :now WHERE id = CAST(:cid AS uuid)"),
            {"now": _dt.datetime.now(_dt.UTC), "cid": content_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_content_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "content_delete_failed", "message": "삭제 중 오류가 발생했습니다."},
        ) from exc
    return {"content_id": content_id, "deleted": True, "message": "삭제했습니다."}


async def list_admin_contents_v2(
    db: AsyncSession,
    *,
    category: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, object]:
    """M07-02/04 운영자 콘텐츠 목록 (임시저장 포함). deleted_at 만 제외."""
    limit = max(1, min(limit, 50))
    offset = max(0, offset)
    clauses = ["deleted_at IS NULL"]
    params: dict[str, object] = {"limit": limit, "offset": offset}
    if category and category in _VALID_CATEGORIES:
        clauses.append("category::text = :cat")
        params["cat"] = category
    where = " AND ".join(clauses)
    try:
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT id::text AS id, category::text AS category, title,
                           is_pinned, published_at, event_at, created_at
                    FROM contents WHERE {where}
                    ORDER BY is_pinned DESC, created_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_admin_contents_v2 fallback: %s", exc)
        return {"data": [], "meta": {"limit": limit, "offset": offset}}
    return {
        "data": [
            {
                "id": str(r.id),
                "category": r.category,
                "title": r.title,
                "is_pinned": bool(r.is_pinned),
                "is_published": r.published_at is not None,
                "published_at": r.published_at.isoformat() if r.published_at else None,
                "event_at": r.event_at.isoformat() if r.event_at else None,
            }
            for r in rows
        ],
        "meta": {"limit": limit, "offset": offset},
    }
