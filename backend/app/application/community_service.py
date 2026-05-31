"""USCP V2 — Application / Community Service (M05-07/08).

설계 근거:
  - feature-spec §M05-07 (커뮤니티 게시글 작성·수정 — 운영자, 상단 고정)
  - feature-spec §M05-08 (커뮤니티 댓글 관리 — 작성=시민+, 조정=운영자 숨김/삭제/복원)
  - design.md §4.2 M05 (`/network/community` 공개)

규칙:
  - 게시글 작성·수정·삭제는 운영자만. 목록·상세는 누구나(공개)
  - 댓글 작성은 로그인 시민 회원 이상. 본인 댓글만 수정 가능
  - 댓글 조정(숨김/삭제/복원)은 운영자만. 숨김 댓글은 공개 목록에서 제외
  - 게시글·댓글 모두 soft delete (deleted_at)
"""
from __future__ import annotations

import datetime as _dt
import logging
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_TITLE_MAX = 200
VALID_MODERATION: Final[frozenset[str]] = frozenset({"hide", "unhide", "delete"})


# ════════════════════════════════════════════════════════════════
#  M05-07 게시글 CRUD (운영자)
# ════════════════════════════════════════════════════════════════


async def create_community_post_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    title: str,
    body: str,
    is_pinned: bool = False,
) -> dict[str, object]:
    """M05-07 커뮤니티 게시글 작성 (운영자)."""
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
                    INSERT INTO community_posts
                        (author_id, title, body, is_pinned, created_at, updated_at)
                    VALUES
                        (CAST(:author AS uuid), :title, :body, :pinned, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {"author": operator_id, "title": title_norm, "body": body, "pinned": is_pinned, "now": now},
            )
        ).first()
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_community_post_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "post_create_failed", "message": "게시글 작성 중 오류가 발생했습니다."},
        ) from exc
    return {"post_id": row.id if row else None, "message": "게시글을 작성했습니다."}


async def update_community_post_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    post_id: str,
    title: str | None = None,
    body: str | None = None,
    is_pinned: bool | None = None,
) -> dict[str, object]:
    """M05-07 커뮤니티 게시글 수정 (운영자)."""
    post = await _fetch_post(db, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "post_not_found", "message": "게시글을 찾을 수 없습니다."},
        )
    sets = ["updated_at = :now"]
    params: dict[str, object] = {"now": _dt.datetime.now(_dt.UTC), "pid": post_id}
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
    try:
        await db.execute(
            sa.text(f"UPDATE community_posts SET {', '.join(sets)} WHERE id = CAST(:pid AS uuid)"),
            params,
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_community_post_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "post_update_failed", "message": "게시글 수정 중 오류가 발생했습니다."},
        ) from exc
    return {"post_id": post_id, "updated": True, "message": "게시글을 수정했습니다."}


async def delete_community_post_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    post_id: str,
) -> dict[str, object]:
    """M05-07 커뮤니티 게시글 삭제 (운영자, soft)."""
    post = await _fetch_post(db, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "post_not_found", "message": "게시글을 찾을 수 없습니다."},
        )
    try:
        await db.execute(
            sa.text(
                "UPDATE community_posts SET deleted_at = :now WHERE id = CAST(:pid AS uuid)"
            ),
            {"now": _dt.datetime.now(_dt.UTC), "pid": post_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_community_post_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "post_delete_failed", "message": "게시글 삭제 중 오류가 발생했습니다."},
        ) from exc
    return {"post_id": post_id, "deleted": True, "message": "게시글을 삭제했습니다."}


async def list_community_posts_v2(
    db: AsyncSession,
    *,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, object]:
    """M05-07 커뮤니티 게시글 목록 (공개). 고정글 우선·최신순. soft delete 제외."""
    limit = max(1, min(limit, 50))
    offset = max(0, offset)
    try:
        total_row = (
            await db.execute(
                sa.text("SELECT COUNT(*) AS c FROM community_posts WHERE deleted_at IS NULL")
            )
        ).first()
        total = int(total_row.c) if total_row else 0
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT cp.id::text AS id, cp.title, cp.is_pinned, cp.view_count,
                           u.name AS author_name, cp.created_at,
                           (SELECT COUNT(*) FROM community_post_comments c
                            WHERE c.post_id = cp.id AND c.deleted_at IS NULL
                              AND c.is_hidden = false) AS comment_count
                    FROM community_posts cp
                    LEFT JOIN users u ON u.id = cp.author_id
                    WHERE cp.deleted_at IS NULL
                    ORDER BY cp.is_pinned DESC, cp.created_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {"limit": limit, "offset": offset},
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_community_posts_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "title": r.title,
                "is_pinned": bool(r.is_pinned),
                "view_count": int(r.view_count or 0),
                "author_name": r.author_name,
                "comment_count": int(r.comment_count or 0),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }


async def get_community_post_v2(
    db: AsyncSession,
    *,
    post_id: str,
) -> dict[str, object]:
    """M05-07 게시글 상세 (공개) + 댓글 목록(숨김 제외)."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT cp.id::text AS id, cp.title, cp.body, cp.is_pinned,
                           u.name AS author_name, cp.created_at, cp.updated_at
                    FROM community_posts cp
                    LEFT JOIN users u ON u.id = cp.author_id
                    WHERE cp.id = CAST(:pid AS uuid) AND cp.deleted_at IS NULL
                    LIMIT 1
                    """
                ),
                {"pid": post_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "post_not_found", "message": "게시글을 찾을 수 없습니다."},
        )

    comments: list[dict[str, object]] = []
    try:
        crows = (
            await db.execute(
                sa.text(
                    """
                    SELECT c.id::text AS id, c.body, c.author_id::text AS author_id,
                           u.name AS author_name, c.created_at
                    FROM community_post_comments c
                    LEFT JOIN users u ON u.id = c.author_id
                    WHERE c.post_id = CAST(:pid AS uuid)
                      AND c.deleted_at IS NULL AND c.is_hidden = false
                    ORDER BY c.created_at ASC
                    """
                ),
                {"pid": post_id},
            )
        ).all()
        comments = [
            {
                "id": str(c.id),
                "body": c.body,
                "author_id": str(c.author_id) if c.author_id else None,
                "author_name": c.author_name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in crows
        ]
    except Exception:  # noqa: BLE001
        comments = []

    return {
        "id": str(row.id),
        "title": row.title,
        "body": row.body,
        "is_pinned": bool(row.is_pinned),
        "author_name": row.author_name,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "comments": comments,
    }


# ════════════════════════════════════════════════════════════════
#  M05-08 댓글 작성 + 조정
# ════════════════════════════════════════════════════════════════


async def create_community_comment_v2(
    db: AsyncSession,
    *,
    post_id: str,
    author_id: str,
    body: str,
) -> dict[str, object]:
    """M05-08 댓글 작성 (로그인 시민 회원 이상)."""
    if not (body or "").strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "body_required", "message": "댓글 내용을 입력해 주세요."},
        )
    post = await _fetch_post(db, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "post_not_found", "message": "게시글을 찾을 수 없습니다."},
        )
    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO community_post_comments
                        (post_id, author_id, body, created_at, updated_at)
                    VALUES
                        (CAST(:pid AS uuid), CAST(:author AS uuid), :body, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {"pid": post_id, "author": author_id, "body": body.strip(), "now": now},
            )
        ).first()
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_community_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "comment_create_failed", "message": "댓글 작성 중 오류가 발생했습니다."},
        ) from exc
    return {"comment_id": row.id if row else None, "message": "댓글을 작성했습니다."}


async def update_own_comment_v2(
    db: AsyncSession,
    *,
    comment_id: str,
    user_id: str,
    body: str,
) -> dict[str, object]:
    """M05-08 본인 댓글 수정 (작성자 본인만). 타인 댓글 수정 불가."""
    try:
        c = (
            await db.execute(
                sa.text(
                    "SELECT author_id::text AS author_id FROM community_post_comments "
                    "WHERE id = CAST(:cid AS uuid) AND deleted_at IS NULL LIMIT 1"
                ),
                {"cid": comment_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        c = None
    if c is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "comment_not_found", "message": "댓글을 찾을 수 없습니다."},
        )
    if c.author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "not_author", "message": "본인이 작성한 댓글만 수정할 수 있습니다."},
        )
    if not (body or "").strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "body_required", "message": "댓글 내용을 입력해 주세요."},
        )
    try:
        await db.execute(
            sa.text(
                "UPDATE community_post_comments SET body = :body, updated_at = :now "
                "WHERE id = CAST(:cid AS uuid)"
            ),
            {"body": body.strip(), "now": _dt.datetime.now(_dt.UTC), "cid": comment_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_own_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "comment_update_failed", "message": "댓글 수정 중 오류가 발생했습니다."},
        ) from exc
    return {"comment_id": comment_id, "updated": True, "message": "댓글을 수정했습니다."}


async def moderate_comment_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    comment_id: str,
    action: str,
) -> dict[str, object]:
    """M05-08 댓글 조정 (운영자). action: hide(숨김)/unhide(복원)/delete(삭제).

    Raises:
        HTTPException 404: 댓글 미존재
        HTTPException 422: action 부정
    """
    if action not in VALID_MODERATION:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_action", "message": "조정 방법은 hide/unhide/delete 중 하나여야 합니다."},
        )
    try:
        c = (
            await db.execute(
                sa.text(
                    "SELECT id FROM community_post_comments WHERE id = CAST(:cid AS uuid) LIMIT 1"
                ),
                {"cid": comment_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        c = None
    if c is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "comment_not_found", "message": "댓글을 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    if action == "hide":
        sql = "UPDATE community_post_comments SET is_hidden = true, updated_at = :now WHERE id = CAST(:cid AS uuid)"
        msg = "댓글을 숨김 처리했습니다."
    elif action == "unhide":
        sql = "UPDATE community_post_comments SET is_hidden = false, deleted_at = NULL, updated_at = :now WHERE id = CAST(:cid AS uuid)"
        msg = "댓글을 복원했습니다."
    else:  # delete
        sql = "UPDATE community_post_comments SET deleted_at = :now, updated_at = :now WHERE id = CAST(:cid AS uuid)"
        msg = "댓글을 삭제했습니다."

    try:
        await db.execute(sa.text(sql), {"now": now, "cid": comment_id})
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("moderate_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "moderate_failed", "message": "댓글 조정 중 오류가 발생했습니다."},
        ) from exc
    return {"comment_id": comment_id, "action": action, "message": msg}


async def _fetch_post(db: AsyncSession, post_id: str) -> object | None:
    try:
        return (
            await db.execute(
                sa.text(
                    "SELECT id FROM community_posts "
                    "WHERE id = CAST(:pid AS uuid) AND deleted_at IS NULL LIMIT 1"
                ),
                {"pid": post_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        return None
