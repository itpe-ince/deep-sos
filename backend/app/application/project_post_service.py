"""USCP V2 — Application / Project Post Service (M03-15~18 멤버 전용 게시판).

설계 근거:
  - feature-spec §M03-15 (게시글 작성·수정·삭제 — 매칭 멤버·운영자, 작성자/운영자만 수정·삭제)
  - feature-spec §M03-16 (목록·상세 — 멤버 전용, 페이지네이션·작성일순)
  - feature-spec §M03-17 (댓글 — 멤버 전용, 원본 삭제 시 정리)
  - feature-spec §M03-18 (첨부파일 — 게시글당 1개, 20MB, MinIO)
  - design.md §4.2 M03 posts endpoints + require_project_member

권한 모델:
  - 열람·작성: is_project_member_v2 (매칭 멘토/학생팀 또는 operator)
  - 수정·삭제: 작성자 본인 또는 operator
삭제는 soft delete (deleted_at). 게시글 soft delete 시 댓글은 목록에서 함께 숨김.
"""
from __future__ import annotations

import datetime as _dt
import logging
import uuid
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.project_service import is_project_member_v2

logger = logging.getLogger(__name__)

_TITLE_MIN: Final[int] = 1
_TITLE_MAX: Final[int] = 100
_BODY_MIN: Final[int] = 1
_BODY_MAX: Final[int] = 5_000
_COMMENT_MAX: Final[int] = 1_000
_ATTACHMENT_MAX_BYTES: Final[int] = 20 * 1024 * 1024  # 20MB


def _is_operator(role: str) -> bool:
    return str(role).lower() in ("operator", "admin")


async def _ensure_member(
    db: AsyncSession, *, project_id: str, user_id: str, user_role: str
) -> None:
    """멤버(매칭 멘토/학생팀) 또는 operator 가 아니면 403."""
    if not await is_project_member_v2(
        db, project_id=project_id, user_id=user_id, user_role=user_role
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "project_member_required",
                "message": "이 게시판은 매칭된 멤버와 운영자만 이용할 수 있습니다.",
            },
        )


# ════════════════════════════════════════════════════════════════
#  M03-16 — 목록·상세 조회
# ════════════════════════════════════════════════════════════════


async def list_posts_v2(
    db: AsyncSession,
    *,
    project_id: str,
    user_id: str,
    user_role: str,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, object]:
    """M03-16 게시글 목록 (멤버 전용, 고정글 우선 + 작성일 내림차순)."""
    await _ensure_member(db, project_id=project_id, user_id=user_id, user_role=user_role)
    limit = max(1, min(limit, 50))
    offset = max(0, offset)

    try:
        total = (
            await db.execute(
                sa.text(
                    """
                    SELECT COUNT(*) FROM project_posts
                    WHERE project_id = CAST(:pid AS uuid) AND deleted_at IS NULL
                    """
                ),
                {"pid": project_id},
            )
        ).scalar() or 0

        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        p.id::text          AS id,
                        p.title             AS title,
                        p.is_pinned         AS is_pinned,
                        p.attachment_key    AS attachment_key,
                        p.author_id::text   AS author_id,
                        u.name              AS author_name,
                        p.created_at        AS created_at,
                        (SELECT COUNT(*) FROM project_post_comments c
                         WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
                    FROM project_posts p
                    LEFT JOIN users u ON u.id = p.author_id
                    WHERE p.project_id = CAST(:pid AS uuid) AND p.deleted_at IS NULL
                    ORDER BY p.is_pinned DESC, p.created_at DESC
                    LIMIT :lim OFFSET :off
                    """
                ),
                {"pid": project_id, "lim": limit, "off": offset},
            )
        ).mappings().all()
    except Exception as exc:  # noqa: BLE001 — 0010 미적용 dev fallback
        logger.warning("list_posts_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "is_pinned": bool(r["is_pinned"]),
                "has_attachment": r["attachment_key"] is not None,
                "comment_count": int(r["comment_count"] or 0),
                "author": {"id": r["author_id"], "name": r["author_name"] or "(탈퇴 회원)"},
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r["created_at"], "isoformat")
                    else str(r["created_at"])
                ),
            }
            for r in rows
        ],
        "meta": {"total": int(total), "limit": limit, "offset": offset},
    }


async def get_post_v2(
    db: AsyncSession,
    *,
    project_id: str,
    post_id: str,
    user_id: str,
    user_role: str,
) -> dict[str, object]:
    """M03-16 게시글 상세 (멤버 전용)."""
    await _ensure_member(db, project_id=project_id, user_id=user_id, user_role=user_role)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        p.id::text          AS id,
                        p.title             AS title,
                        p.body              AS body,
                        p.is_pinned         AS is_pinned,
                        p.attachment_key    AS attachment_key,
                        p.attachment_filename AS attachment_filename,
                        p.author_id::text   AS author_id,
                        u.name              AS author_name,
                        p.created_at        AS created_at,
                        p.updated_at        AS updated_at
                    FROM project_posts p
                    LEFT JOIN users u ON u.id = p.author_id
                    WHERE p.id = CAST(:post AS uuid)
                      AND p.project_id = CAST(:pid AS uuid)
                      AND p.deleted_at IS NULL
                    LIMIT 1
                    """
                ),
                {"post": post_id, "pid": project_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "post_not_found", "message": "게시글을 찾을 수 없습니다."},
        )

    return {
        "id": str(row.id),
        "title": row.title,
        "body": row.body,
        "is_pinned": bool(row.is_pinned),
        "attachment": (
            {"key": row.attachment_key, "filename": row.attachment_filename}
            if row.attachment_key
            else None
        ),
        "author": {"id": row.author_id, "name": row.author_name or "(탈퇴 회원)"},
        "created_at": (
            row.created_at.isoformat()
            if hasattr(row.created_at, "isoformat")
            else str(row.created_at)
        ),
        "updated_at": (
            row.updated_at.isoformat()
            if hasattr(row.updated_at, "isoformat")
            else str(row.updated_at)
        ),
        "is_author": row.author_id == user_id,
        "can_edit": row.author_id == user_id or _is_operator(user_role),
    }


# ════════════════════════════════════════════════════════════════
#  M03-15 — 작성·수정·삭제
# ════════════════════════════════════════════════════════════════


def _validate_post_input(title: str, body: str) -> tuple[str, str]:
    title_norm = (title or "").strip()
    if not (_TITLE_MIN <= len(title_norm) <= _TITLE_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_title_length",
                "message": f"제목은 {_TITLE_MIN}~{_TITLE_MAX}자로 입력해 주세요.",
            },
        )
    body_norm = (body or "").strip()
    if not (_BODY_MIN <= len(body_norm) <= _BODY_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_body_length",
                "message": f"본문은 {_BODY_MIN}~{_BODY_MAX:,}자로 입력해 주세요.",
            },
        )
    return title_norm, body_norm


async def create_post_v2(
    db: AsyncSession,
    *,
    project_id: str,
    author_id: str,
    author_role: str,
    title: str,
    body: str,
    attachment_key: str | None = None,
    attachment_filename: str | None = None,
    is_pinned: bool = False,
) -> dict[str, object]:
    """M03-15 게시글 작성 (멤버 전용). 고정글은 operator 만."""
    await _ensure_member(
        db, project_id=project_id, user_id=author_id, user_role=author_role
    )
    title_norm, body_norm = _validate_post_input(title, body)
    pin = is_pinned and _is_operator(author_role)

    post_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO project_posts
                    (id, project_id, author_id, title, body,
                     attachment_key, attachment_filename, is_pinned,
                     created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), CAST(:pid AS uuid), CAST(:author AS uuid),
                     :title, :body, :akey, :afile, :pin, :now, :now)
                """
            ),
            {
                "id": str(post_id),
                "pid": project_id,
                "author": author_id,
                "title": title_norm,
                "body": body_norm,
                "akey": attachment_key,
                "afile": attachment_filename,
                "pin": pin,
                "now": now,
            },
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_post_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "post_create_failed", "message": "게시글 작성 실패"},
        ) from exc

    return {
        "id": str(post_id),
        "project_id": project_id,
        "title": title_norm,
        "is_pinned": pin,
        "created_at": now.isoformat(),
    }


async def _fetch_post_owner(
    db: AsyncSession, *, project_id: str, post_id: str
) -> str:
    """게시글 작성자 id 반환. 없으면 404."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT author_id::text AS author_id
                    FROM project_posts
                    WHERE id = CAST(:post AS uuid)
                      AND project_id = CAST(:pid AS uuid)
                      AND deleted_at IS NULL
                    LIMIT 1
                    """
                ),
                {"post": post_id, "pid": project_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "post_not_found", "message": "게시글을 찾을 수 없습니다."},
        )
    return row.author_id


def _ensure_author_or_operator(owner_id: str, actor_id: str, actor_role: str) -> None:
    if owner_id != actor_id and not _is_operator(actor_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "not_author",
                "message": "작성자 본인 또는 운영자만 수정·삭제할 수 있습니다.",
            },
        )


async def update_post_v2(
    db: AsyncSession,
    *,
    project_id: str,
    post_id: str,
    actor_id: str,
    actor_role: str,
    title: str | None = None,
    body: str | None = None,
    is_pinned: bool | None = None,
) -> dict[str, object]:
    """M03-15 게시글 수정 (작성자 본인 또는 operator)."""
    await _ensure_member(db, project_id=project_id, user_id=actor_id, user_role=actor_role)
    owner = await _fetch_post_owner(db, project_id=project_id, post_id=post_id)
    _ensure_author_or_operator(owner, actor_id, actor_role)

    updates: list[str] = []
    params: dict[str, object] = {"post": post_id}
    if title is not None or body is not None:
        # 둘 중 하나만 와도 기존값 검증 위해 현재값과 병합 필요하지만,
        # 단순화를 위해 제공된 값만 개별 검증.
        if title is not None:
            t = title.strip()
            if not (_TITLE_MIN <= len(t) <= _TITLE_MAX):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "invalid_title_length",
                        "message": f"제목은 {_TITLE_MIN}~{_TITLE_MAX}자로 입력해 주세요.",
                    },
                )
            updates.append("title = :title")
            params["title"] = t
        if body is not None:
            b = body.strip()
            if not (_BODY_MIN <= len(b) <= _BODY_MAX):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "invalid_body_length",
                        "message": f"본문은 {_BODY_MIN}~{_BODY_MAX:,}자로 입력해 주세요.",
                    },
                )
            updates.append("body = :body")
            params["body"] = b
    if is_pinned is not None and _is_operator(actor_role):
        updates.append("is_pinned = :pin")
        params["pin"] = is_pinned

    if not updates:
        return {"id": post_id, "updated": False}

    now = _dt.datetime.now(_dt.UTC)
    params["now"] = now
    updates.append("updated_at = :now")
    try:
        await db.execute(
            sa.text(
                f"UPDATE project_posts SET {', '.join(updates)} "
                "WHERE id = CAST(:post AS uuid)"
            ),
            params,
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_post_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "post_update_failed", "message": "게시글 수정 실패"},
        ) from exc
    return {"id": post_id, "updated": True}


async def delete_post_v2(
    db: AsyncSession,
    *,
    project_id: str,
    post_id: str,
    actor_id: str,
    actor_role: str,
) -> dict[str, object]:
    """M03-15 게시글 삭제 (soft delete, 작성자 본인 또는 operator)."""
    await _ensure_member(db, project_id=project_id, user_id=actor_id, user_role=actor_role)
    owner = await _fetch_post_owner(db, project_id=project_id, post_id=post_id)
    _ensure_author_or_operator(owner, actor_id, actor_role)

    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                "UPDATE project_posts SET deleted_at = :now, updated_at = :now "
                "WHERE id = CAST(:post AS uuid)"
            ),
            {"post": post_id, "now": now},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_post_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "post_delete_failed", "message": "게시글 삭제 실패"},
        ) from exc
    return {"id": post_id, "deleted": True}


# ════════════════════════════════════════════════════════════════
#  M03-18 — 첨부파일 presigned URL (게시글당 1개, 20MB)
# ════════════════════════════════════════════════════════════════


async def presign_post_attachment_v2(
    db: AsyncSession,
    *,
    project_id: str,
    user_id: str,
    user_role: str,
    filename: str,
    content_type: str,
    size_bytes: int,
) -> dict[str, object]:
    """M03-18 게시글 첨부 presigned URL 발급 (멤버 전용)."""
    await _ensure_member(db, project_id=project_id, user_id=user_id, user_role=user_role)
    if size_bytes <= 0 or size_bytes > _ATTACHMENT_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "file_too_large",
                "message": "첨부파일은 1byte 이상 20MB 이내여야 합니다.",
                "max_bytes": _ATTACHMENT_MAX_BYTES,
            },
        )
    safe_name = (filename or "").split("/")[-1].split("\\")[-1].strip() or uuid.uuid4().hex
    minio_key = f"project-posts/{project_id}/{uuid.uuid4().hex}-{safe_name}"

    try:
        from app.core.storage import get_minio_client  # type: ignore
        from app.core.config import settings  # type: ignore

        client = get_minio_client()
        upload_url = client.presigned_put_object(
            bucket_name=settings.minio_bucket,
            object_name=minio_key,
            expires=300,
        )
    except Exception:  # noqa: BLE001 — dev 환경 stub
        upload_url = f"https://stub-minio/{minio_key}?stub=1"

    return {
        "upload_url": upload_url,
        "minio_key": minio_key,
        "filename": safe_name,
        "expires_in_seconds": 300,
    }


# ════════════════════════════════════════════════════════════════
#  M03-17 — 댓글
# ════════════════════════════════════════════════════════════════


async def list_comments_v2(
    db: AsyncSession,
    *,
    project_id: str,
    post_id: str,
    user_id: str,
    user_role: str,
) -> dict[str, object]:
    """M03-17 댓글 목록 (멤버 전용, 작성일 오름차순)."""
    await _ensure_member(db, project_id=project_id, user_id=user_id, user_role=user_role)
    # 게시글 존재 확인 (삭제된 글의 댓글 차단)
    await _fetch_post_owner(db, project_id=project_id, post_id=post_id)
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        c.id::text        AS id,
                        c.body            AS body,
                        c.author_id::text AS author_id,
                        u.name            AS author_name,
                        c.created_at      AS created_at
                    FROM project_post_comments c
                    LEFT JOIN users u ON u.id = c.author_id
                    WHERE c.post_id = CAST(:post AS uuid) AND c.deleted_at IS NULL
                    ORDER BY c.created_at ASC
                    """
                ),
                {"post": post_id},
            )
        ).mappings().all()
    except Exception:  # noqa: BLE001
        rows = []

    return {
        "data": [
            {
                "id": str(r["id"]),
                "body": r["body"],
                "author": {"id": r["author_id"], "name": r["author_name"] or "(탈퇴 회원)"},
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r["created_at"], "isoformat")
                    else str(r["created_at"])
                ),
                "can_edit": r["author_id"] == user_id or _is_operator(user_role),
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }


async def create_comment_v2(
    db: AsyncSession,
    *,
    project_id: str,
    post_id: str,
    author_id: str,
    author_role: str,
    body: str,
) -> dict[str, object]:
    """M03-17 댓글 작성 (멤버 전용)."""
    await _ensure_member(db, project_id=project_id, user_id=author_id, user_role=author_role)
    await _fetch_post_owner(db, project_id=project_id, post_id=post_id)

    body_norm = (body or "").strip()
    if not (1 <= len(body_norm) <= _COMMENT_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_comment_length",
                "message": f"댓글은 1~{_COMMENT_MAX:,}자로 입력해 주세요.",
            },
        )

    comment_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO project_post_comments
                    (id, post_id, author_id, body, created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), CAST(:post AS uuid), CAST(:author AS uuid),
                     :body, :now, :now)
                """
            ),
            {
                "id": str(comment_id),
                "post": post_id,
                "author": author_id,
                "body": body_norm,
                "now": now,
            },
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "comment_create_failed", "message": "댓글 작성 실패"},
        ) from exc

    return {
        "id": str(comment_id),
        "post_id": post_id,
        "body": body_norm,
        "created_at": now.isoformat(),
    }


async def _fetch_comment(
    db: AsyncSession, *, comment_id: str
) -> tuple[str, str]:
    """(author_id, project_id) 반환. 없으면 404."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT c.author_id::text AS author_id,
                           p.project_id::text AS project_id
                    FROM project_post_comments c
                    JOIN project_posts p ON p.id = c.post_id
                    WHERE c.id = CAST(:cid AS uuid) AND c.deleted_at IS NULL
                    LIMIT 1
                    """
                ),
                {"cid": comment_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "comment_not_found", "message": "댓글을 찾을 수 없습니다."},
        )
    return row.author_id, row.project_id


async def update_comment_v2(
    db: AsyncSession,
    *,
    comment_id: str,
    actor_id: str,
    actor_role: str,
    body: str,
) -> dict[str, object]:
    """M03-17 댓글 수정 (작성자 본인 또는 operator)."""
    owner, project_id = await _fetch_comment(db, comment_id=comment_id)
    await _ensure_member(db, project_id=project_id, user_id=actor_id, user_role=actor_role)
    _ensure_author_or_operator(owner, actor_id, actor_role)

    body_norm = (body or "").strip()
    if not (1 <= len(body_norm) <= _COMMENT_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_comment_length",
                "message": f"댓글은 1~{_COMMENT_MAX:,}자로 입력해 주세요.",
            },
        )
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                "UPDATE project_post_comments SET body = :body, updated_at = :now "
                "WHERE id = CAST(:cid AS uuid)"
            ),
            {"body": body_norm, "now": now, "cid": comment_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "comment_update_failed", "message": "댓글 수정 실패"},
        ) from exc
    return {"id": comment_id, "updated": True}


async def delete_comment_v2(
    db: AsyncSession,
    *,
    comment_id: str,
    actor_id: str,
    actor_role: str,
) -> dict[str, object]:
    """M03-17 댓글 삭제 (soft delete, 작성자 본인 또는 operator)."""
    owner, project_id = await _fetch_comment(db, comment_id=comment_id)
    await _ensure_member(db, project_id=project_id, user_id=actor_id, user_role=actor_role)
    _ensure_author_or_operator(owner, actor_id, actor_role)

    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                "UPDATE project_post_comments SET deleted_at = :now, updated_at = :now "
                "WHERE id = CAST(:cid AS uuid)"
            ),
            {"now": now, "cid": comment_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "comment_delete_failed", "message": "댓글 삭제 실패"},
        ) from exc
    return {"id": comment_id, "deleted": True}
