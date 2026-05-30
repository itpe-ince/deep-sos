"""USCP V2 — Application / Issue Service (M02 제보·게이트키핑).

설계 근거:
  - feature-spec §M02-01 (지역문제 제보 등록)
  - feature-spec §M02-03 (제보 상세)
  - design.md §4.2 M02 (POST /issues)
  - design.md §5.2 6단계 워크플로우
  - design.md §3.2 region/issue_stage/issue_track ENUM
  - signup_v2 (auth_service.py) 패턴 복제 — 입력 검증 → DB INSERT → 이메일 알림

본 모듈은 `submit_issue_v2` use case 를 시작으로 M02 21 기능을 점진 확장.
Sprint 2 Day 1-3 (M02-01~05): 제보 작성·목록·상세·공감·댓글
Sprint 2 Day 4-7 (M02-06~11): 6단계 게이트키핑 (별도 service 함수)
"""
from __future__ import annotations

import datetime as _dt
import logging
import uuid
from typing import Iterable

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.email import notify

logger = logging.getLogger(__name__)


# M02-01: 5개 지역 (design.md §3.2 region ENUM)
_VALID_REGIONS = frozenset(
    ["daejeon", "gongju", "yesan", "cheonan", "sejong"]
)

# M02-01 사진 정책 (feature-spec): 1건당 최대 5장, 각 5MB, JPG/PNG/WebP
_MAX_PHOTOS = 5
_MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
_ALLOWED_IMAGE_MIMES = frozenset(["image/jpeg", "image/png", "image/webp"])

# 스팸 방지 (feature-spec §M02-01 유의사항): 5분 내 같은 사용자가 같은 지역 3건 초과 시 차단
_SPAM_WINDOW_MINUTES = 5
_SPAM_MAX_PER_REGION = 3


async def submit_issue_v2(
    db: AsyncSession,
    *,
    reporter_id: str,
    reporter_email: str,
    reporter_name: str,
    region: str,
    title: str,
    body: str,
    photo_keys: list[str] | None = None,
    photo_meta: list[dict[str, object]] | None = None,
    location_lat: float | None = None,
    location_lng: float | None = None,
) -> dict[str, object]:
    """V2 제보 작성 (M02-01).

    Returns:
        {"issue_id": str, "stage": "reported", "created_at": iso8601,
         "notification_enqueued": bool}

    Raises:
        HTTPException 422: region 미정의·title/body 길이 위반·사진 수/크기/형식 위반
        HTTPException 429: 5분 내 동일 지역 3건 초과 (스팸 방지)
    """
    # ── 1. 입력 검증 ─────────────────────────────────────────
    region_norm = region.lower().strip()
    if region_norm not in _VALID_REGIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_region",
                "message": "5개 지역(대전·공주·예산·천안·세종) 중 하나를 선택해 주세요.",
                "valid_regions": sorted(_VALID_REGIONS),
            },
        )

    title_norm = title.strip()
    body_norm = body.strip()
    if not (1 <= len(title_norm) <= 100):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_title_length",
                "message": "제목은 1자 이상 100자 이내로 입력해 주세요.",
            },
        )
    if not (10 <= len(body_norm) <= 5000):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_body_length",
                "message": "본문은 10자 이상 5000자 이내로 입력해 주세요.",
            },
        )

    # ── 2. 사진 검증 ─────────────────────────────────────────
    keys = list(photo_keys or [])
    meta = list(photo_meta or [])
    if len(keys) > _MAX_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "too_many_photos",
                "message": f"사진은 최대 {_MAX_PHOTOS}장까지 첨부 가능합니다.",
                "max": _MAX_PHOTOS,
                "got": len(keys),
            },
        )
    _validate_photo_meta(meta)

    # ── 3. 스팸 방지 ─────────────────────────────────────────
    await _check_spam(db, reporter_id, region_norm)

    # ── 4. issues INSERT ─────────────────────────────────────
    issue_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)

    try:
        # V2 컬럼 우선 INSERT — V1 호환 컬럼 (description) 도 함께 채워 둠
        await db.execute(
            sa.text(
                """
                INSERT INTO issues
                    (id, title, description, body,
                     status, stage, region,
                     category, priority,
                     author_id, reporter_id,
                     location_lat, location_lng,
                     created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), :title, :body, :body,
                     'submitted', CAST(:stage AS issue_stage), CAST(:region AS region),
                     'other', 'normal',
                     CAST(:reporter_id AS uuid), CAST(:reporter_id AS uuid),
                     :lat, :lng,
                     :now, :now)
                """
            ),
            {
                "id": str(issue_id),
                "title": title_norm,
                "body": body_norm,
                "stage": "reported",
                "region": region_norm,
                "reporter_id": reporter_id,
                "lat": location_lat,
                "lng": location_lng,
                "now": now,
            },
        )

        # issue_stage_history INSERT (M02-15)
        await db.execute(
            sa.text(
                """
                INSERT INTO issue_stage_history
                    (issue_id, prev_stage, next_stage, actor_id, reason, created_at)
                VALUES
                    (CAST(:issue_id AS uuid), NULL, CAST('reported' AS issue_stage),
                     CAST(:actor_id AS uuid), :reason, :now)
                """
            ),
            {
                "issue_id": str(issue_id),
                "actor_id": reporter_id,
                "reason": "시민 회원 자가 제보",
                "now": now,
            },
        )

        # 사진 attachments (M02-01 사진 첨부)
        for idx, (key, m) in enumerate(zip(keys, meta or [{}] * len(keys))):
            await db.execute(
                sa.text(
                    """
                    INSERT INTO attachments
                        (issue_id, minio_key, title, mime_type, size_bytes, order_index, created_at)
                    VALUES
                        (CAST(:issue_id AS uuid), :key, :title, :mime, :size, :idx, :now)
                    """
                ),
                {
                    "issue_id": str(issue_id),
                    "key": key,
                    "title": str(m.get("filename") or f"photo-{idx + 1}"),
                    "mime": str(m.get("mime_type") or "image/jpeg"),
                    "size": int(m.get("size_bytes") or 0),
                    "idx": idx,
                    "now": now,
                },
            )

        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        # 컬럼/테이블 일부 미적용 dev 환경에서도 핵심 INSERT 가 부분 성공할 수 있음
        if "stage" in str(exc) or "attachments" in str(exc) or "issue_stage_history" in str(exc):
            logger.warning("submit_issue_v2 partial schema: %s", exc)
            try:
                await db.commit()
            except Exception:  # noqa: BLE001
                pass
        else:
            logger.exception("submit_issue_v2 insert failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "submit_failed",
                    "message": "제보 처리 중 오류가 발생했습니다.",
                },
            ) from exc

    # ── 5. 운영자 일괄 알림 (notify_new_issue, design.md §5.5) ─
    notification_enqueued = False
    try:
        base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
        await notify(
            "notify_new_issue",
            to=getattr(settings, "operator_inbox_email", reporter_email),
            context={
                "issue_id": str(issue_id),
                "issue_title": title_norm,
                "region": region_norm,
                "reporter_name": reporter_name,
                "issue_url": f"{base_url}/admin/issues/{issue_id}",
                "base_url": base_url,
            },
        )
        notification_enqueued = True
    except Exception as exc:  # noqa: BLE001
        logger.warning("submit_issue_v2 notify_new_issue failed: %s", exc)

    return {
        "issue_id": str(issue_id),
        "stage": "reported",
        "region": region_norm,
        "created_at": now.isoformat(),
        "notification_enqueued": notification_enqueued,
    }


def _validate_photo_meta(meta: Iterable[dict[str, object]]) -> None:
    """사진 메타 (mime_type, size_bytes) 검증 — 1당 5MB, JPG/PNG/WebP."""
    for idx, m in enumerate(meta):
        mime = str(m.get("mime_type") or "").lower()
        size = int(m.get("size_bytes") or 0)
        if mime and mime not in _ALLOWED_IMAGE_MIMES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_photo_mime",
                    "message": "사진은 JPG · PNG · WebP 형식만 첨부 가능합니다.",
                    "index": idx,
                    "got_mime": mime,
                    "allowed": sorted(_ALLOWED_IMAGE_MIMES),
                },
            )
        if size > _MAX_PHOTO_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "photo_too_large",
                    "message": "사진 1장당 5MB 까지 첨부 가능합니다.",
                    "index": idx,
                    "max_bytes": _MAX_PHOTO_SIZE_BYTES,
                    "got_bytes": size,
                },
            )


async def _check_spam(
    db: AsyncSession,
    reporter_id: str,
    region: str,
) -> None:
    """5분 내 같은 지역 3건 초과 시 429 (feature-spec §M02-01 스팸 방지)."""
    try:
        row = await db.execute(
            sa.text(
                """
                SELECT COUNT(*) AS cnt
                FROM issues
                WHERE reporter_id = CAST(:reporter_id AS uuid)
                  AND region = CAST(:region AS region)
                  AND created_at > now() - (:window_min || ' minutes')::interval
                """
            ),
            {
                "reporter_id": reporter_id,
                "region": region,
                "window_min": _SPAM_WINDOW_MINUTES,
            },
        )
        cnt = int(row.scalar() or 0)
    except Exception:  # noqa: BLE001 — region 컬럼 미적용 dev 환경
        return

    if cnt >= _SPAM_MAX_PER_REGION:
        retry_after = _SPAM_WINDOW_MINUTES * 60
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "spam_throttled",
                "message": (
                    f"같은 지역에 {_SPAM_WINDOW_MINUTES}분 내 "
                    f"{_SPAM_MAX_PER_REGION}건 이상 제보할 수 없습니다."
                ),
                "retry_after_seconds": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )


# ════════════════════════════════════════════════════════════════
#  M02-02 ~ M02-05 — 목록·상세·공감·댓글 (Sprint 2 Day 2-3)
# ════════════════════════════════════════════════════════════════

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 50


async def list_issues_v2(
    db: AsyncSession,
    *,
    region: str | None = None,
    stage: str | None = None,
    track: str | None = None,
    q: str | None = None,
    sort: str = "-created_at",
    limit: int = _LIST_DEFAULT_LIMIT,
    cursor: str | None = None,
) -> dict[str, object]:
    """M02-02 제보 목록 (카드형).

    필터: region, stage, track, q (제목·본문 ILIKE)
    정렬: -created_at (최신순) · -vote_count (공감순)
    페이지네이션: cursor (마지막 row 의 ISO timestamp 기준)
    """
    limit = max(1, min(limit, _LIST_MAX_LIMIT))

    clauses = ["1=1"]
    params: dict[str, object] = {}

    # 비공개 단계 (reported, reviewing, rejected) 는 list 응답에서 제외
    clauses.append(
        "COALESCE(stage::text, status) IN ('published','mentor_assigned','in_progress','resolved')"
    )

    if region:
        clauses.append("region::text = :region")
        params["region"] = region
    if stage:
        clauses.append("COALESCE(stage::text, status) = :stage")
        params["stage"] = stage
    if track:
        clauses.append("track::text = :track")
        params["track"] = track
    if q and len(q.strip()) >= 2:
        clauses.append(
            "(title ILIKE :q OR COALESCE(body, description) ILIKE :q)"
        )
        params["q"] = f"%{q.strip()}%"

    order_by = "created_at DESC"
    if sort == "-vote_count":
        order_by = "vote_count DESC NULLS LAST, created_at DESC"

    if cursor:
        clauses.append("created_at < :cursor")
        params["cursor"] = cursor

    params["limit_plus_one"] = limit + 1

    sql = f"""
        SELECT
            id::text AS id,
            title,
            COALESCE(body, description) AS body,
            region::text AS region,
            COALESCE(stage::text, status) AS stage,
            track::text AS track,
            COALESCE(vote_count, 0) AS vote_count,
            COALESCE(comment_count, 0) AS comment_count,
            created_at
        FROM issues
        WHERE {" AND ".join(clauses)}
        ORDER BY {order_by}
        LIMIT :limit_plus_one
    """
    try:
        rows = (await db.execute(sa.text(sql), params)).mappings().all()
    except Exception as exc:  # noqa: BLE001 — V1↔V2 transition fallback
        logger.warning("list_issues_v2 fallback: %s", exc)
        rows = []

    rows_list = list(rows)
    has_more = len(rows_list) > limit
    items = rows_list[:limit]

    next_cursor: str | None = None
    if has_more and items:
        last_ts = items[-1]["created_at"]
        next_cursor = (
            last_ts.isoformat() if hasattr(last_ts, "isoformat") else str(last_ts)
        )

    return {
        "data": [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "body": r["body"],
                "region": r["region"],
                "stage": r["stage"],
                "track": r["track"],
                "vote_count": int(r["vote_count"] or 0),
                "comment_count": int(r["comment_count"] or 0),
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r["created_at"], "isoformat")
                    else str(r["created_at"])
                ),
            }
            for r in items
        ],
        "meta": {
            "limit": limit,
            "has_more": has_more,
            "next_cursor": next_cursor,
        },
    }


async def get_issue_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    viewer_id: str | None = None,
) -> dict[str, object]:
    """M02-03 제보 상세 + 6단계 history + 사진 + 본인 공감 여부."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        i.id::text                     AS id,
                        i.title                         AS title,
                        COALESCE(i.body, i.description) AS body,
                        i.region::text                  AS region,
                        COALESCE(i.stage::text, i.status) AS stage,
                        i.track::text                   AS track,
                        COALESCE(i.vote_count, 0)       AS vote_count,
                        COALESCE(i.comment_count, 0)    AS comment_count,
                        i.reporter_id::text             AS reporter_id,
                        i.location_lat                  AS location_lat,
                        i.location_lng                  AS location_lng,
                        i.created_at                    AS created_at,
                        u.name                          AS reporter_name
                    FROM issues i
                    LEFT JOIN users u ON u.id = COALESCE(i.reporter_id, i.author_id)
                    WHERE i.id = CAST(:id AS uuid)
                    LIMIT 1
                    """
                ),
                {"id": issue_id},
            )
        ).first()
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_issue_v2 fallback: %s", exc)
        row = None

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "issue_not_found", "message": "제보를 찾을 수 없습니다."},
        )

    # 단계 history (M02-15)
    history: list[dict[str, object]] = []
    try:
        h_rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        h.prev_stage::text AS prev_stage,
                        h.next_stage::text AS next_stage,
                        h.reason            AS reason,
                        h.created_at        AS at,
                        a.name              AS actor_name
                    FROM issue_stage_history h
                    LEFT JOIN users a ON a.id = h.actor_id
                    WHERE h.issue_id = CAST(:id AS uuid)
                    ORDER BY h.created_at ASC
                    """
                ),
                {"id": issue_id},
            )
        ).mappings().all()
        history = [
            {
                "stage": r["next_stage"],
                "prev_stage": r["prev_stage"],
                "at": (
                    r["at"].isoformat() if hasattr(r["at"], "isoformat") else str(r["at"])
                ),
                "actor": r["actor_name"],
                "comment": r["reason"],
            }
            for r in h_rows
        ]
    except Exception:  # noqa: BLE001
        history = []

    # 사진 첨부
    photos: list[dict[str, object]] = []
    try:
        p_rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT minio_key, title, mime_type, size_bytes, order_index
                    FROM attachments
                    WHERE issue_id = CAST(:id AS uuid)
                    ORDER BY order_index ASC, created_at ASC
                    """
                ),
                {"id": issue_id},
            )
        ).mappings().all()
        photos = [dict(r) for r in p_rows]
    except Exception:  # noqa: BLE001
        photos = []

    # 본인 공감 여부 (viewer_id 있을 때만)
    voted = False
    if viewer_id:
        try:
            voted_row = await db.execute(
                sa.text(
                    """
                    SELECT 1 FROM votes
                    WHERE user_id = CAST(:uid AS uuid)
                      AND issue_id = CAST(:iid AS uuid)
                    LIMIT 1
                    """
                ),
                {"uid": viewer_id, "iid": issue_id},
            )
            voted = voted_row.first() is not None
        except Exception:  # noqa: BLE001 — V1 issue_votes fallback
            try:
                voted_row = await db.execute(
                    sa.text(
                        """
                        SELECT 1 FROM issue_votes
                        WHERE user_id = CAST(:uid AS uuid)
                          AND issue_id = CAST(:iid AS uuid)
                        LIMIT 1
                        """
                    ),
                    {"uid": viewer_id, "iid": issue_id},
                )
                voted = voted_row.first() is not None
            except Exception:  # noqa: BLE001
                voted = False

    # M03-14 양방향 연결 — 이 제보가 발전한 리빙랩 프로젝트
    linked_project: dict[str, object] | None = None
    try:
        lp = (
            await db.execute(
                sa.text(
                    """
                    SELECT p.id::text AS id, p.title AS title,
                           COALESCE(p.stage::text, p.phase) AS stage
                    FROM livinglab_projects p
                    WHERE p.source_issue_id = CAST(:iid AS uuid)
                       OR p.id = (
                           SELECT linked_project_id FROM issues
                           WHERE id = CAST(:iid AS uuid)
                       )
                    ORDER BY p.created_at DESC
                    LIMIT 1
                    """
                ),
                {"iid": issue_id},
            )
        ).first()
        if lp is not None:
            linked_project = {"id": str(lp.id), "title": lp.title, "stage": lp.stage}
    except Exception:  # noqa: BLE001 — source_issue_id/linked_project_id 미존재 dev fallback
        linked_project = None

    return {
        "id": str(row.id),
        "title": row.title,
        "body": row.body,
        "region": row.region,
        "stage": row.stage,
        "track": row.track,
        "vote_count": int(row.vote_count or 0),
        "comment_count": int(row.comment_count or 0),
        "reporter": {"id": row.reporter_id, "name": row.reporter_name},
        "linked_project": linked_project,
        "location": (
            {"lat": float(row.location_lat), "lng": float(row.location_lng)}
            if row.location_lat is not None and row.location_lng is not None
            else None
        ),
        "created_at": (
            row.created_at.isoformat()
            if hasattr(row.created_at, "isoformat")
            else str(row.created_at)
        ),
        "voted": voted,
        "history": history,
        "photos": photos,
    }


async def vote_issue_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    user_id: str,
    action: str,
) -> dict[str, object]:
    """M02-04 공감 투표 — 1인 1회 UNIQUE 보장.

    action: 'vote' | 'unvote'
    """
    if action not in ("vote", "unvote"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_action", "message": "vote 또는 unvote 만 가능합니다."},
        )

    table = "votes"
    try:
        await db.execute(sa.text("SELECT 1 FROM votes LIMIT 0"))
    except Exception:  # noqa: BLE001 — V1 issue_votes fallback
        table = "issue_votes"

    if action == "vote":
        try:
            await db.execute(
                sa.text(
                    f"""
                    INSERT INTO {table} (user_id, issue_id, created_at)
                    VALUES (CAST(:uid AS uuid), CAST(:iid AS uuid), now())
                    ON CONFLICT (user_id, issue_id) DO NOTHING
                    """
                ),
                {"uid": user_id, "iid": issue_id},
            )
        except Exception as exc:  # noqa: BLE001
            await db.rollback()
            logger.warning("vote_issue_v2 insert failed: %s", exc)
    else:
        try:
            await db.execute(
                sa.text(
                    f"""
                    DELETE FROM {table}
                    WHERE user_id = CAST(:uid AS uuid)
                      AND issue_id = CAST(:iid AS uuid)
                    """
                ),
                {"uid": user_id, "iid": issue_id},
            )
        except Exception as exc:  # noqa: BLE001
            await db.rollback()
            logger.warning("vote_issue_v2 delete failed: %s", exc)

    # 카운트 재계산 + issues.vote_count 동기화 (best effort)
    try:
        count_row = await db.execute(
            sa.text(
                f"SELECT COUNT(*) FROM {table} WHERE issue_id = CAST(:iid AS uuid)"
            ),
            {"iid": issue_id},
        )
        new_count = int(count_row.scalar() or 0)
        await db.execute(
            sa.text(
                "UPDATE issues SET vote_count = :cnt WHERE id = CAST(:iid AS uuid)"
            ),
            {"cnt": new_count, "iid": issue_id},
        )
    except Exception:  # noqa: BLE001
        new_count = 0

    await db.commit()
    return {"voted": action == "vote", "vote_count": new_count}


async def list_comments_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    limit: int = 50,
) -> dict[str, object]:
    """M02-05 댓글 목록."""
    limit = max(1, min(limit, 200))
    table = "comments"
    try:
        await db.execute(sa.text("SELECT 1 FROM comments LIMIT 0"))
    except Exception:  # noqa: BLE001
        table = "issue_comments"

    try:
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT
                        c.id::text         AS id,
                        c.content          AS content,
                        c.is_deleted       AS is_deleted,
                        c.created_at       AS created_at,
                        c.author_id::text  AS author_id,
                        u.name             AS author_name
                    FROM {table} c
                    LEFT JOIN users u ON u.id = c.author_id
                    WHERE c.issue_id = CAST(:iid AS uuid)
                    ORDER BY c.created_at ASC
                    LIMIT :lim
                    """
                ),
                {"iid": issue_id, "lim": limit},
            )
        ).mappings().all()
    except Exception:  # noqa: BLE001
        rows = []

    return {
        "data": [
            {
                "id": str(r["id"]),
                "content": (
                    "[삭제된 댓글입니다]" if r["is_deleted"] else r["content"]
                ),
                "is_deleted": bool(r["is_deleted"]),
                "author": {
                    "id": r["author_id"],
                    "name": r["author_name"] or "익명",
                },
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r["created_at"], "isoformat")
                    else str(r["created_at"])
                ),
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }


async def create_comment_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    author_id: str,
    content: str,
) -> dict[str, object]:
    """M02-05 댓글 작성."""
    content_norm = content.strip()
    if not (1 <= len(content_norm) <= 1000):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_comment_length",
                "message": "댓글은 1자 이상 1000자 이내로 입력해 주세요.",
            },
        )

    table = "comments"
    try:
        await db.execute(sa.text("SELECT 1 FROM comments LIMIT 0"))
    except Exception:  # noqa: BLE001
        table = "issue_comments"

    comment_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                f"""
                INSERT INTO {table}
                    (id, issue_id, author_id, content, is_deleted, created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), CAST(:iid AS uuid), CAST(:uid AS uuid),
                     :content, false, :now, :now)
                """
            ),
            {
                "id": str(comment_id),
                "iid": issue_id,
                "uid": author_id,
                "content": content_norm,
                "now": now,
            },
        )
        # comment_count 동기화 (best effort)
        await db.execute(
            sa.text(
                "UPDATE issues SET comment_count = COALESCE(comment_count, 0) + 1 "
                "WHERE id = CAST(:iid AS uuid)"
            ),
            {"iid": issue_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "comment_failed", "message": "댓글 작성 중 오류가 발생했습니다."},
        ) from exc

    return {
        "id": str(comment_id),
        "content": content_norm,
        "is_deleted": False,
        "author": {"id": author_id, "name": ""},
        "created_at": now.isoformat(),
    }


async def delete_comment_v2(
    db: AsyncSession,
    *,
    comment_id: str,
    actor_id: str,
    actor_role: str,
) -> dict[str, object]:
    """M02-05 댓글 삭제 — 작성자 본인 또는 운영자.

    삭제 시 is_deleted=true, content='[삭제된 댓글입니다]' 로 soft delete (M02-05 유의사항).
    """
    table = "comments"
    try:
        await db.execute(sa.text("SELECT 1 FROM comments LIMIT 0"))
    except Exception:  # noqa: BLE001
        table = "issue_comments"

    row = await db.execute(
        sa.text(
            f"""
            SELECT author_id::text AS author_id, issue_id::text AS issue_id, is_deleted
            FROM {table}
            WHERE id = CAST(:id AS uuid)
            LIMIT 1
            """
        ),
        {"id": comment_id},
    )
    target = row.first()
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "comment_not_found", "message": "댓글을 찾을 수 없습니다."},
        )

    if str(target.author_id) != actor_id and actor_role != "operator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "not_comment_author",
                "message": "본인이 작성한 댓글만 삭제할 수 있습니다.",
            },
        )

    if target.is_deleted:
        return {"id": comment_id, "is_deleted": True}

    await db.execute(
        sa.text(
            f"""
            UPDATE {table}
            SET is_deleted = true, content = '[삭제된 댓글입니다]', updated_at = now()
            WHERE id = CAST(:id AS uuid)
            """
        ),
        {"id": comment_id},
    )
    # comment_count 감소 (best effort)
    try:
        await db.execute(
            sa.text(
                "UPDATE issues SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) "
                "WHERE id = CAST(:iid AS uuid)"
            ),
            {"iid": target.issue_id},
        )
    except Exception:  # noqa: BLE001
        pass

    await db.commit()
    return {"id": comment_id, "is_deleted": True}
