"""USCP V2 — Application / Attachment Service (M06-08 자료실).

설계 근거:
  - feature-spec §M06-08 (자료실 — 카테고리 필터, 다운로드 카운트 표시, 다운로드=공개·삭제=운영자)
  - design.md §3.3 attachments (category, download_count atomic), §4.2 M06
  - 업로드(M07-15)는 CMS 소관. 본 서비스는 목록·다운로드·삭제.

규칙:
  - 목록·다운로드는 누구나 (비로그인 포함)
  - 삭제는 운영자만 (soft delete)
  - 다운로드 시 download_count atomic +1 후 presigned GET URL 반환
  - category: guide(가이드)/template(양식)/toolkit(툴킷)/etc(기타)
"""
from __future__ import annotations

import datetime as _dt
import logging
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

VALID_CATEGORIES: Final[frozenset[str]] = frozenset({"guide", "template", "toolkit", "etc"})
_CATEGORY_LABELS = {"guide": "가이드", "template": "양식", "toolkit": "툴킷", "etc": "기타"}


async def list_attachments_v2(
    db: AsyncSession,
    *,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, object]:
    """M06-08 자료실 목록 (공개). 카테고리 필터, 다운로드 수 표시. soft delete 제외."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    clauses = ["deleted_at IS NULL"]
    params: dict[str, object] = {"limit": limit, "offset": offset}
    if category and category in VALID_CATEGORIES:
        clauses.append("category::text = :cat")
        params["cat"] = category
    where = " AND ".join(clauses)
    try:
        total_row = (
            await db.execute(sa.text(f"SELECT COUNT(*) AS c FROM attachments WHERE {where}"), params)
        ).first()
        total = int(total_row.c) if total_row else 0
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT id::text AS id, title, category::text AS category, tags,
                           file_size, content_type, download_count, created_at
                    FROM attachments
                    WHERE {where}
                    ORDER BY download_count DESC, created_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_attachments_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "title": r.title,
                "category": r.category,
                "category_label": _CATEGORY_LABELS.get(r.category, r.category),
                "tags": list(r.tags) if r.tags else [],
                "file_size": int(r.file_size) if r.file_size else None,
                "content_type": r.content_type,
                "download_count": int(r.download_count or 0),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }


async def download_attachment_v2(
    db: AsyncSession,
    *,
    attachment_id: str,
) -> dict[str, object]:
    """M06-08 자료 다운로드 (공개). download_count atomic +1 후 presigned URL 반환.

    Raises:
        HTTPException 404: 자료 미존재
    """
    try:
        row = (
            await db.execute(
                sa.text(
                    "SELECT minio_key, title, content_type FROM attachments "
                    "WHERE id = CAST(:aid AS uuid) AND deleted_at IS NULL LIMIT 1"
                ),
                {"aid": attachment_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "attachment_not_found", "message": "자료를 찾을 수 없습니다."},
        )

    # download_count atomic +1
    try:
        await db.execute(
            sa.text(
                "UPDATE attachments SET download_count = download_count + 1 "
                "WHERE id = CAST(:aid AS uuid)"
            ),
            {"aid": attachment_id},
        )
        await db.commit()
    except Exception:  # noqa: BLE001
        await db.rollback()

    # presigned GET URL (실패 시 key 만 반환 — 프론트 fallback)
    download_url: str | None = None
    try:
        from datetime import timedelta

        from app.core.storage import get_minio_client
        from app.core.config import settings

        client = get_minio_client()
        download_url = client.presigned_get_object(
            settings.minio_bucket, row.minio_key, expires=timedelta(hours=1)
        )
    except Exception as exc:  # noqa: BLE001 — dev/MinIO 미연결 fallback
        logger.warning("attachment presign failed: %s", exc)

    return {
        "attachment_id": attachment_id,
        "title": row.title,
        "minio_key": row.minio_key,
        "content_type": row.content_type,
        "download_url": download_url,
    }


async def delete_attachment_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    attachment_id: str,
) -> dict[str, object]:
    """M06-08 자료 삭제 (운영자, soft).

    Raises:
        HTTPException 404: 자료 미존재
    """
    try:
        row = (
            await db.execute(
                sa.text(
                    "SELECT id FROM attachments "
                    "WHERE id = CAST(:aid AS uuid) AND deleted_at IS NULL LIMIT 1"
                ),
                {"aid": attachment_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "attachment_not_found", "message": "자료를 찾을 수 없습니다."},
        )
    try:
        await db.execute(
            sa.text(
                "UPDATE attachments SET deleted_at = :now WHERE id = CAST(:aid AS uuid)"
            ),
            {"now": _dt.datetime.now(_dt.UTC), "aid": attachment_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_attachment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "attachment_delete_failed", "message": "자료 삭제 중 오류가 발생했습니다."},
        ) from exc
    return {"attachment_id": attachment_id, "deleted": True, "message": "자료를 삭제했습니다."}


# ════════════════════════════════════════════════════════════════
#  M07-05 자료실 파일 업로드 (운영자)
# ════════════════════════════════════════════════════════════════

_TITLE_MAX = 200


async def create_attachment_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    title: str,
    category: str,
    minio_key: str,
    tags: list[str] | None = None,
    file_size: int | None = None,
    content_type: str | None = None,
) -> dict[str, object]:
    """M07-05 자료실 메타데이터 등록 (운영자).

    파일 바이너리는 프론트가 presigned PUT 으로 MinIO 에 직접 업로드한 뒤,
    minio_key 와 메타데이터를 본 함수로 등록(presign-then-create 패턴).

    Raises:
        HTTPException 422: 제목 길이·카테고리 부정·minio_key 누락
    """
    title_norm = (title or "").strip()
    if not (1 <= len(title_norm) <= _TITLE_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_title", "message": f"제목은 1~{_TITLE_MAX}자로 입력해 주세요."},
        )
    cat = (category or "").lower().strip()
    if cat not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_category",
                "message": "카테고리는 가이드(guide)·양식(template)·툴킷(toolkit)·기타(etc) 중 하나여야 합니다.",
                "valid": sorted(VALID_CATEGORIES),
            },
        )
    if not (minio_key or "").strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "minio_key_required", "message": "업로드된 파일 키가 필요합니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO attachments
                        (title, category, tags, minio_key, file_size, content_type,
                         download_count, uploaded_by, created_at, updated_at)
                    VALUES
                        (:title, CAST(:cat AS resource_category), :tags, :key,
                         :size, :ctype, 0, CAST(:uploader AS uuid), :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "title": title_norm,
                    "cat": cat,
                    "tags": tags,
                    "key": minio_key,
                    "size": file_size,
                    "ctype": content_type,
                    "uploader": operator_id,
                    "now": now,
                },
            )
        ).first()
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_attachment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "attachment_create_failed", "message": "자료 등록 중 오류가 발생했습니다."},
        ) from exc
    return {"attachment_id": row.id if row else None, "title": title_norm, "category": cat, "message": "자료를 등록했습니다."}


async def presign_attachment_upload_v2(
    *,
    filename: str,
    content_type: str | None = None,
) -> dict[str, object]:
    """M07-05 자료실 업로드용 presigned PUT URL 발급.

    프론트가 이 URL 로 MinIO 에 직접 PUT 후 minio_key 로 create_attachment_v2 호출.
    MinIO 미연결 dev 환경에서는 stub URL 반환.
    """
    import uuid as _uuid
    from datetime import timedelta

    safe_name = (filename or "file").replace("/", "_").strip() or "file"
    minio_key = f"resources/{_uuid.uuid4().hex}/{safe_name}"
    upload_url: str | None = None
    try:
        from app.core.storage import get_minio_client
        from app.core.config import settings

        client = get_minio_client()
        upload_url = client.presigned_put_object(
            settings.minio_bucket, minio_key, expires=timedelta(minutes=10)
        )
    except Exception as exc:  # noqa: BLE001 — dev fallback
        logger.warning("attachment presign upload failed: %s", exc)
        upload_url = f"https://stub-minio/{minio_key}?stub=1"
    return {"upload_url": upload_url, "minio_key": minio_key, "expires_in_seconds": 600}
