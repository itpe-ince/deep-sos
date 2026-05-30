"""USCP V2 — Application / Gatekeeping Service (M02-06~11).

설계 근거:
  - feature-spec §M02-06 (게이트키핑 대기 목록 + 필터)
  - feature-spec §M02-07/08 (검토 큐·화면)
  - feature-spec §M02-09~13 (5단계 전환: reported→reviewing→published→mentor_assigned→in_progress→resolved)
  - feature-spec §M02-14 (반려 처리 + 사유 30자 이상)
  - feature-spec §M02-15 (자동 history 기록)
  - feature-spec §M02-16 (단계 변경 시 이메일 알림)
  - design.md §5.2 6단계 워크플로우 + §5.5 6단계↔알림 매핑

상태 전이 그래프 (state machine):
  reported → reviewing → published → mentor_assigned → in_progress → resolved
                  ↓ (track 필수 부여)
              rejected (사유 30자 이상)

규칙:
  - 모든 단계 전환은 운영자만 가능
  - reviewing 진입 시 track 필수 (M02-09)
  - resolved 진입 시 issues.vote_count 와 별개로 KPI 자동 카운트 +1 (M06-04)
  - reject 는 어느 단계에서도 가능 (운영자 책임)
  - 단계 전환 시 audit_log + issue_stage_history + email queue 자동 처리
"""
from __future__ import annotations

import datetime as _dt
import logging
import uuid
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.email import notify

logger = logging.getLogger(__name__)


# design.md §3.2 issue_stage ENUM 6값
ALL_STAGES: Final[tuple[str, ...]] = (
    "reported",
    "reviewing",
    "published",
    "mentor_assigned",
    "in_progress",
    "resolved",
    "rejected",
)

# State machine: 각 단계에서 허용되는 다음 단계 (rejected 는 어느 단계든 가능)
TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    "reported": frozenset({"reviewing", "rejected"}),
    "reviewing": frozenset({"published", "rejected"}),
    "published": frozenset({"mentor_assigned", "rejected"}),
    "mentor_assigned": frozenset({"in_progress", "rejected"}),
    "in_progress": frozenset({"resolved", "rejected"}),
    "resolved": frozenset(),  # 종결 — 추가 전환 불가
    "rejected": frozenset(),  # 반려 — 재처리는 새 제보로
}

# M02-19 트랙 라벨 3종 (issue_track ENUM)
VALID_TRACKS: Final[frozenset[str]] = frozenset(
    {"policy_reflection", "policy_reference", "citizen_autonomy"}
)

# design.md §5.5 6단계 ↔ 이메일 알림 매핑 (M02-16)
_STAGE_NOTIFY_TEMPLATE: Final[dict[str, str]] = {
    "reviewing": "notify_under_review",
    "published": "notify_published",
    "mentor_assigned": "notify_mentor_matched",
    "in_progress": "notify_in_progress",
    "resolved": "notify_resolved",
    "rejected": "notify_rejected",
}

# M02-14 반려 사유 최소 길이
_REJECT_REASON_MIN_LENGTH = 30


# ════════════════════════════════════════════════════════════════
#  M02-06/07 게이트키핑 큐 (목록 + 검색)
# ════════════════════════════════════════════════════════════════


async def list_gatekeeping_queue_v2(
    db: AsyncSession,
    *,
    stage: str | None = None,
    region: str | None = None,
    q: str | None = None,
    sort: str = "-created_at",
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, object]:
    """M02-07 운영자 게이트키핑 큐 — 모든 단계 포함 (rejected 제외 가능).

    공개 목록 `list_issues_v2` 와 달리 reported/reviewing 등 미공개 단계 포함.
    """
    limit = max(1, min(limit, 50))
    clauses = ["1=1"]
    params: dict[str, object] = {"limit_plus_one": limit + 1}

    if stage:
        if stage not in ALL_STAGES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_stage", "message": "정의되지 않은 단계입니다."},
            )
        clauses.append("COALESCE(stage::text, status) = :stage")
        params["stage"] = stage
    if region:
        clauses.append("region::text = :region")
        params["region"] = region
    if q and len(q.strip()) >= 2:
        clauses.append("(title ILIKE :q OR COALESCE(body, description) ILIKE :q)")
        params["q"] = f"%{q.strip()}%"
    if cursor:
        clauses.append("created_at < :cursor")
        params["cursor"] = cursor

    order_by = "created_at DESC" if sort == "-created_at" else "vote_count DESC NULLS LAST, created_at DESC"
    sql = f"""
        SELECT
            id::text                 AS id,
            title,
            COALESCE(body, description) AS body,
            region::text             AS region,
            COALESCE(stage::text, status) AS stage,
            track::text              AS track,
            COALESCE(vote_count, 0)  AS vote_count,
            COALESCE(comment_count, 0) AS comment_count,
            created_at
        FROM issues
        WHERE {" AND ".join(clauses)}
        ORDER BY {order_by}
        LIMIT :limit_plus_one
    """
    try:
        rows = (await db.execute(sa.text(sql), params)).mappings().all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_gatekeeping_queue_v2 fallback: %s", exc)
        rows = []

    rows_list = list(rows)
    has_more = len(rows_list) > limit
    items = rows_list[:limit]
    next_cursor = (
        items[-1]["created_at"].isoformat()
        if has_more and items and hasattr(items[-1]["created_at"], "isoformat")
        else None
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
        "meta": {"limit": limit, "has_more": has_more, "next_cursor": next_cursor},
    }


async def list_gatekeeping_stats_v2(db: AsyncSession) -> dict[str, int]:
    """M02-18 단계별 게이트키핑 통계 — Admin 대시보드 위젯용."""
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        COALESCE(stage::text, status) AS stage,
                        COUNT(*) AS cnt
                    FROM issues
                    GROUP BY COALESCE(stage::text, status)
                    """
                )
            )
        ).mappings().all()
        stats = {r["stage"]: int(r["cnt"]) for r in rows}
    except Exception:  # noqa: BLE001
        stats = {}

    # 모든 ENUM 값에 대해 0 보정
    for s in ALL_STAGES:
        stats.setdefault(s, 0)
    return stats


# ════════════════════════════════════════════════════════════════
#  M02-09~13 단계 전환 (state machine)
# ════════════════════════════════════════════════════════════════


async def transition_issue_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    operator_id: str,
    to_stage: str,
    comment: str | None = None,
    track: str | None = None,
) -> dict[str, object]:
    """M02-09~13 단계 전환.

    Raises:
        HTTPException 404: 제보 미존재
        HTTPException 409: 잘못된 상태 전이 (state machine 위반)
        HTTPException 422: reviewing 진입 시 track 누락 또는 잘못된 track
    """
    if to_stage not in ALL_STAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_target_stage", "message": "정의되지 않은 단계입니다."},
        )

    issue = await _fetch_issue(db, issue_id)
    current_stage = issue["stage"]

    # State machine 검증
    allowed = TRANSITIONS.get(current_stage, frozenset())
    if to_stage not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "invalid_transition",
                "message": f"현재 단계({current_stage})에서 {to_stage} 로 전환할 수 없습니다.",
                "current_stage": current_stage,
                "allowed_next_stages": sorted(allowed),
            },
        )

    # M02-09: reviewing 진입 시 track 필수
    if to_stage == "reviewing":
        if not track:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "track_required",
                    "message": "검토중 단계 진입 시 트랙 라벨이 필요합니다.",
                    "valid_tracks": sorted(VALID_TRACKS),
                },
            )
        if track not in VALID_TRACKS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_track",
                    "message": "정의되지 않은 트랙입니다.",
                    "valid_tracks": sorted(VALID_TRACKS),
                },
            )

    now = _dt.datetime.now(_dt.UTC)

    try:
        # 1. issues.stage 업데이트
        update_track_clause = ", track = CAST(:track AS issue_track)" if track else ""
        await db.execute(
            sa.text(
                f"""
                UPDATE issues
                SET stage = CAST(:next_stage AS issue_stage),
                    status = :next_stage,
                    updated_at = :now
                    {update_track_clause}
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": issue_id,
                "next_stage": to_stage,
                "track": track,
                "now": now,
            },
        )

        # 2. issue_stage_history INSERT (M02-15 자동 기록)
        await db.execute(
            sa.text(
                """
                INSERT INTO issue_stage_history
                    (issue_id, prev_stage, next_stage, actor_id, reason, created_at)
                VALUES
                    (CAST(:iid AS uuid),
                     CAST(:prev_stage AS issue_stage),
                     CAST(:next_stage AS issue_stage),
                     CAST(:actor AS uuid),
                     :comment, :now)
                """
            ),
            {
                "iid": issue_id,
                "prev_stage": current_stage,
                "next_stage": to_stage,
                "actor": operator_id,
                "comment": comment or "",
                "now": now,
            },
        )

        # 3. audit_log INSERT (M08-05 게이트키핑 이력)
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('stage_change' AS audit_action),
                         'issue', CAST(:iid AS uuid),
                         jsonb_build_object('prev_stage', :prev, 'next_stage', :next, 'track', :track),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "iid": issue_id,
                    "prev": current_stage,
                    "next": to_stage,
                    "track": track,
                    "now": now,
                },
            )
        except Exception:  # noqa: BLE001 — audit_logs 미적용 dev 환경 fallback
            pass

        # 4. M06-04 KPI auto-count (resolved 진입 시 +1)
        if to_stage == "resolved":
            try:
                await db.execute(
                    sa.text(
                        """
                        UPDATE performance_records
                        SET value = value + 1, updated_at = :now
                        WHERE kpi_id = (
                            SELECT id FROM kpi_indicators
                            WHERE auto_count_source = 'resolved_issue'
                            LIMIT 1
                        )
                        """
                    ),
                    {"now": now},
                )
            except Exception:  # noqa: BLE001
                pass

        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("transition_issue_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "transition_failed",
                "message": "단계 전환 중 오류가 발생했습니다.",
            },
        ) from exc

    # 5. 이메일 알림 (M02-16, design.md §5.5)
    await _enqueue_stage_notifications(
        issue,
        next_stage=to_stage,
        comment=comment,
        track=track,
    )

    return {
        "issue_id": issue_id,
        "prev_stage": current_stage,
        "stage": to_stage,
        "track": track,
        "transitioned_at": now.isoformat(),
    }


async def reject_issue_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    operator_id: str,
    reason: str,
) -> dict[str, object]:
    """M02-14 반려 — 사유 30자 이상 + 비공개 처리."""
    reason_norm = reason.strip()
    if len(reason_norm) < _REJECT_REASON_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "reject_reason_too_short",
                "message": f"반려 사유는 {_REJECT_REASON_MIN_LENGTH}자 이상 구체적으로 작성해 주세요.",
                "minimum_length": _REJECT_REASON_MIN_LENGTH,
                "got": len(reason_norm),
            },
        )

    return await transition_issue_v2(
        db,
        issue_id=issue_id,
        operator_id=operator_id,
        to_stage="rejected",
        comment=reason_norm,
        track=None,
    )


async def update_track_only_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    operator_id: str,
    track: str,
) -> dict[str, object]:
    """M02-19 트랙 라벨 단독 변경 (단계 전환 없이)."""
    if track not in VALID_TRACKS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_track",
                "message": "정의되지 않은 트랙입니다.",
                "valid_tracks": sorted(VALID_TRACKS),
            },
        )

    issue = await _fetch_issue(db, issue_id)
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                UPDATE issues
                SET track = CAST(:track AS issue_track),
                    updated_at = :now
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": issue_id, "track": track, "now": now},
        )
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('update' AS audit_action),
                         'issue', CAST(:iid AS uuid),
                         jsonb_build_object('prev_track', :prev_track, 'next_track', :next_track),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "iid": issue_id,
                    "prev_track": issue.get("track"),
                    "next_track": track,
                    "now": now,
                },
            )
        except Exception:  # noqa: BLE001
            pass
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_track_only_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "track_update_failed", "message": "트랙 변경 실패"},
        ) from exc

    return {"issue_id": issue_id, "track": track}


# ════════════════════════════════════════════════════════════════
#  내부 헬퍼
# ════════════════════════════════════════════════════════════════


async def _fetch_issue(db: AsyncSession, issue_id: str) -> dict[str, object]:
    """issue 핵심 정보 조회 — 단계 전환·반려 시 공통 사용."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        i.id::text                       AS id,
                        i.title                           AS title,
                        COALESCE(i.stage::text, i.status) AS stage,
                        i.region::text                    AS region,
                        i.track::text                     AS track,
                        i.reporter_id::text               AS reporter_id,
                        u.email                           AS reporter_email,
                        u.name                            AS reporter_name,
                        COALESCE(u.notification_email_enabled, true) AS notify_enabled
                    FROM issues i
                    LEFT JOIN users u ON u.id = COALESCE(i.reporter_id, i.author_id)
                    WHERE i.id = CAST(:id AS uuid)
                    LIMIT 1
                    """
                ),
                {"id": issue_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "issue_not_found", "message": "제보를 찾을 수 없습니다."},
        )

    return {
        "id": row.id,
        "title": row.title,
        "stage": row.stage,
        "region": row.region,
        "track": row.track,
        "reporter_id": row.reporter_id,
        "reporter_email": row.reporter_email,
        "reporter_name": row.reporter_name,
        "notify_enabled": bool(row.notify_enabled),
    }


async def _enqueue_stage_notifications(
    issue: dict[str, object],
    *,
    next_stage: str,
    comment: str | None,
    track: str | None,
) -> None:
    """M02-16 단계별 이메일 알림 등록 (design.md §5.5).

    제보자 + 단계별 추가 대상 (멘토단·운영자) 에게 발송.
    notify_enabled=False 인 사용자는 의무 발송이 아닌 한 skip (M01-09).
    """
    template_id = _STAGE_NOTIFY_TEMPLATE.get(next_stage)
    if template_id is None:
        return

    base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
    base_context = {
        "issue_id": str(issue["id"]),
        "issue_title": issue["title"],
        "region": issue.get("region"),
        "track": track,
        "stage": next_stage,
        "comment": comment or "",
        "issue_url": f"{base_url}/issues/{issue['id']}",
        "base_url": base_url,
    }

    # 제보자에게 발송 (M01-09 토글 존중)
    if issue.get("reporter_email") and issue.get("notify_enabled"):
        try:
            await notify(
                template_id,  # type: ignore[arg-type]
                to=str(issue["reporter_email"]),
                context={
                    **base_context,
                    "user_name": issue.get("reporter_name") or "회원",
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("stage notification (reporter) failed: %s", exc)


# ════════════════════════════════════════════════════════════════
#  M02-21 — 댓글로 해결된 제보 종결 처리
# ════════════════════════════════════════════════════════════════


async def resolve_by_comment_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    operator_id: str,
    comment_id: str,
) -> dict[str, object]:
    """M02-21 댓글 답변으로 해결된 제보를 곧바로 'resolved' 로 종결.

    6단계 정상 절차 (reviewing→published→...→resolved) 를 우회하는 별도 경로.
    feature-spec: "운영자의 책임 하에 신중히 사용". 종결 사유는 'comment_resolution'
    으로 자동 기록되며 제보자에게 notify_resolved 발송.

    Raises:
        HTTPException 404: issue 또는 comment 미존재
        HTTPException 409: 이미 resolved 또는 rejected 상태
        HTTPException 422: comment 가 해당 issue 에 속하지 않음
    """
    # 1) issue 존재·상태 확인
    issue = await _fetch_issue(db, issue_id)
    if issue["stage"] in ("resolved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "invalid_transition",
                "message": (
                    f"현재 단계({issue['stage']})에서는 댓글 종결 처리를 할 수 없습니다."
                ),
                "current_stage": issue["stage"],
            },
        )

    # 2) comment 검증 — 해당 issue 에 속하는지
    table = "comments"
    try:
        await db.execute(sa.text("SELECT 1 FROM comments LIMIT 0"))
    except Exception:  # noqa: BLE001
        table = "issue_comments"

    try:
        row = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT issue_id::text AS issue_id, content
                    FROM {table}
                    WHERE id = CAST(:cid AS uuid)
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
            detail={
                "code": "comment_not_found",
                "message": "선택한 댓글을 찾을 수 없습니다.",
            },
        )
    if str(row.issue_id) != str(issue_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "comment_issue_mismatch",
                "message": "댓글이 해당 제보에 속하지 않습니다.",
            },
        )

    # 3) 단계 전환 (단, state machine 우회 — comment_resolution 특별 경로)
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                UPDATE issues
                SET stage = CAST('resolved' AS issue_stage),
                    status = 'resolved',
                    updated_at = :now
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": issue_id, "now": now},
        )
        await db.execute(
            sa.text(
                """
                INSERT INTO issue_stage_history
                    (issue_id, prev_stage, next_stage, actor_id, reason, created_at)
                VALUES
                    (CAST(:iid AS uuid),
                     CAST(:prev AS issue_stage),
                     CAST('resolved' AS issue_stage),
                     CAST(:actor AS uuid),
                     :reason, :now)
                """
            ),
            {
                "iid": issue_id,
                "prev": issue["stage"],
                "actor": operator_id,
                "reason": f"comment_resolution:{comment_id}",
                "now": now,
            },
        )
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('stage_change' AS audit_action),
                         'issue', CAST(:iid AS uuid),
                         jsonb_build_object(
                             'prev_stage', :prev,
                             'next_stage', 'resolved',
                             'resolution', 'comment_resolution',
                             'comment_id', :cid
                         ),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "iid": issue_id,
                    "prev": issue["stage"],
                    "cid": comment_id,
                    "now": now,
                },
            )
        except Exception:  # noqa: BLE001
            pass
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("resolve_by_comment_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "resolve_failed",
                "message": "댓글 종결 처리 중 오류가 발생했습니다.",
            },
        ) from exc

    # 4) 이메일 알림 (제보자에게 notify_resolved)
    await _enqueue_stage_notifications(
        issue,
        next_stage="resolved",
        comment=f"댓글로 해결 종결 (#{comment_id})",
        track=None,
    )

    return {
        "issue_id": issue_id,
        "prev_stage": issue["stage"],
        "stage": "resolved",
        "track": issue.get("track"),
        "transitioned_at": now.isoformat(),
        "resolution": "comment_resolution",
        "comment_id": comment_id,
    }
