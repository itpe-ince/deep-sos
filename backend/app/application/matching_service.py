"""USCP V2 — Application / Matching Service (M04-06~09).

설계 근거:
  - feature-spec §M04-06 (의제별 멘토단 매칭 — 운영자 수동, 멘토 1명+학생팀, 중복 무시)
  - feature-spec §M04-07 (매칭 알림 — 이메일 통보형, 수락/거절 없음, 실패 재시도)
  - feature-spec §M04-08 (멘토단 활동 기록 — 매칭 멘토 본인+운영자, 회의·자문·검토)
  - feature-spec §M04-09 (멘토·학생팀 활동 이력 조회 — 본인/운영자, 시간순)
  - design.md §4.2 M04, §5.4.1 멤버 활동 기록 흐름

규칙:
  - 매칭은 운영자만 (라우터 _require_operator). 활동기록은 매칭 멘토 본인+운영자
  - 같은 (project, mentor) 중복 매칭은 idempotent (ON CONFLICT 없으므로 사전 조회)
  - 매칭 완료 시 멘토·학생팀원에게 notify_mentor_matched 발송 (수락/거절 절차 없음)
  - activity_type: meeting / advice / review
"""
from __future__ import annotations

import datetime as _dt
import json
import logging
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.email import notify

logger = logging.getLogger(__name__)

VALID_ACTIVITY_TYPES: Final[frozenset[str]] = frozenset({"meeting", "advice", "review"})
_SUMMARY_MIN = 1


async def _write_audit(
    db: AsyncSession,
    *,
    actor_id: str,
    action: str,
    target_id: str,
    metadata: dict[str, object],
) -> None:
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO audit_logs
                    (actor_id, action, target_type, target_id, metadata, created_at)
                VALUES
                    (CAST(:actor AS uuid), CAST(:action AS audit_action),
                     'matching', CAST(:tid AS uuid),
                     CAST(:meta AS jsonb), :now)
                """
            ),
            {
                "actor": actor_id,
                "action": action,
                "tid": target_id,
                "meta": json.dumps(metadata, ensure_ascii=False),
                "now": _dt.datetime.now(_dt.UTC),
            },
        )
    except Exception:  # noqa: BLE001 — audit_logs 미적용 dev fallback
        pass


# ════════════════════════════════════════════════════════════════
#  M04-06 의제별 멘토단 매칭
# ════════════════════════════════════════════════════════════════


async def match_project_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    project_id: str,
    mentor_ids: list[str],
    team_id: str | None = None,
) -> dict[str, object]:
    """M04-06 의제별 멘토단 매칭 (운영자 수동).

    멘토 여러 명 + 학생팀 1개를 프로젝트에 매칭. 같은 (project, mentor) 쌍은
    이미 active 매칭이 있으면 건너뛴다(idempotent). 매칭 완료 후 알림 발송(M04-07).

    Raises:
        HTTPException 404: project/mentor/team 미존재
        HTTPException 422: mentor_ids 비어있음
    """
    if not mentor_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "mentor_required", "message": "매칭할 멘토를 1명 이상 선택해 주세요."},
        )

    # 프로젝트 존재 확인
    try:
        proj = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id, title FROM livinglab_projects "
                    "WHERE id = CAST(:pid AS uuid) LIMIT 1"
                ),
                {"pid": project_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        proj = None
    if proj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "project_not_found", "message": "프로젝트를 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    created_matchings: list[str] = []
    skipped = 0
    try:
        for mid in mentor_ids:
            # 멘토 존재 + 활성 확인
            mentor = (
                await db.execute(
                    sa.text(
                        "SELECT id::text AS id FROM mentors "
                        "WHERE id = CAST(:mid AS uuid) AND is_active = true LIMIT 1"
                    ),
                    {"mid": mid},
                )
            ).first()
            if mentor is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "code": "mentor_not_found",
                        "message": f"활성 멘토를 찾을 수 없습니다: {mid}",
                    },
                )

            # 중복 매칭 검사 (active 인 동일 project+mentor)
            dup = (
                await db.execute(
                    sa.text(
                        "SELECT id FROM matchings "
                        "WHERE project_id = CAST(:pid AS uuid) "
                        "AND mentor_id = CAST(:mid AS uuid) AND status = 'active' LIMIT 1"
                    ),
                    {"pid": project_id, "mid": mid},
                )
            ).first()
            if dup is not None:
                skipped += 1
                continue

            row = (
                await db.execute(
                    sa.text(
                        """
                        INSERT INTO matchings
                            (project_id, mentor_id, team_id, matched_at, status,
                             matched_by, created_at, updated_at)
                        VALUES
                            (CAST(:pid AS uuid), CAST(:mid AS uuid),
                             CAST(:team AS uuid), :now, 'active',
                             CAST(:op AS uuid), :now, :now)
                        RETURNING id::text AS id
                        """
                    ),
                    {
                        "pid": project_id,
                        "mid": mid,
                        "team": team_id,
                        "now": now,
                        "op": operator_id,
                    },
                )
            ).first()
            if row:
                created_matchings.append(row.id)

        await _write_audit(
            db,
            actor_id=operator_id,
            action="create",
            target_id=project_id,
            metadata={
                "event": "project_matched",
                "mentor_ids": mentor_ids,
                "team_id": team_id,
                "created": len(created_matchings),
                "skipped": skipped,
            },
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("match_project_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "matching_failed", "message": "매칭 중 오류가 발생했습니다."},
        ) from exc

    # M04-07 매칭 알림 (멘토 + 학생팀원)
    if created_matchings:
        await _notify_matched(
            db,
            project_id=project_id,
            project_title=str(proj.title),
            mentor_ids=mentor_ids,
            team_id=team_id,
        )

    return {
        "project_id": project_id,
        "created": len(created_matchings),
        "skipped": skipped,
        "matching_ids": created_matchings,
        "message": (
            f"매칭을 완료했습니다. (신규 {len(created_matchings)}건"
            + (f", 중복 {skipped}건 무시" if skipped else "")
            + ")"
        ),
    }


# ════════════════════════════════════════════════════════════════
#  M04-07 매칭 알림 발송
# ════════════════════════════════════════════════════════════════


async def _notify_matched(
    db: AsyncSession,
    *,
    project_id: str,
    project_title: str,
    mentor_ids: list[str],
    team_id: str | None,
) -> None:
    """M04-07 매칭 완료 알림 (멘토 + 학생팀원). 통보형, 실패는 큐 재시도."""
    base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
    base_context = {
        "project_id": project_id,
        "project_title": project_title,
        "project_url": f"{base_url}/projects/{project_id}",
        "base_url": base_url,
        "title": "멘토단·학생팀이 매칭되었습니다",
        "message": f"「{project_title}」 리빙랩에 매칭되었습니다.",
    }

    # 멘토 이메일
    recipients: list[tuple[str, str]] = []
    try:
        mrows = (
            await db.execute(
                sa.text(
                    """
                    SELECT u.name AS name, u.email AS email
                    FROM mentors m JOIN users u ON u.id = m.user_id
                    WHERE m.id = ANY(CAST(:ids AS uuid[])) AND u.email IS NOT NULL
                    """
                ),
                {"ids": mentor_ids},
            )
        ).all()
        recipients.extend((r.name or "멘토", r.email) for r in mrows)
    except Exception:  # noqa: BLE001
        pass

    # 학생팀원 이메일
    if team_id:
        try:
            trows = (
                await db.execute(
                    sa.text(
                        """
                        SELECT u.name AS name, u.email AS email
                        FROM team_members tm JOIN users u ON u.id = tm.user_id
                        WHERE tm.team_id = CAST(:tid AS uuid) AND u.email IS NOT NULL
                        """
                    ),
                    {"tid": team_id},
                )
            ).all()
            recipients.extend((r.name or "팀원", r.email) for r in trows)
        except Exception:  # noqa: BLE001
            pass

    for name, email in recipients:
        try:
            await notify(
                "notify_mentor_matched",  # type: ignore[arg-type]
                to=str(email),
                context={**base_context, "user_name": name},
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("matching notification failed: %s", exc)


async def unmatch_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    matching_id: str,
) -> dict[str, object]:
    """매칭 해제 (운영자). status='released' soft 처리.

    Raises:
        HTTPException 404: 매칭 미존재
    """
    now = _dt.datetime.now(_dt.UTC)
    try:
        result = await db.execute(
            sa.text(
                "UPDATE matchings SET status = 'released', updated_at = :now "
                "WHERE id = CAST(:mid AS uuid) AND status = 'active'"
            ),
            {"now": now, "mid": matching_id},
        )
        if result.rowcount == 0:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "matching_not_found", "message": "활성 매칭을 찾을 수 없습니다."},
            )
        await _write_audit(
            db,
            actor_id=operator_id,
            action="update",
            target_id=matching_id,
            metadata={"event": "matching_released"},
        )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("unmatch_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "unmatch_failed", "message": "매칭 해제 중 오류가 발생했습니다."},
        ) from exc
    return {"matching_id": matching_id, "message": "매칭을 해제했습니다."}


async def list_project_matchings_v2(
    db: AsyncSession,
    *,
    project_id: str,
) -> dict[str, object]:
    """프로젝트의 활성 매칭 목록 (멘토·학생팀)."""
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT mt.id::text AS id, mt.status,
                           mt.mentor_id::text AS mentor_id, mu.name AS mentor_name,
                           mt.team_id::text AS team_id, st.name AS team_name,
                           mt.matched_at
                    FROM matchings mt
                    LEFT JOIN mentors m ON m.id = mt.mentor_id
                    LEFT JOIN users mu ON mu.id = m.user_id
                    LEFT JOIN student_teams st ON st.id = mt.team_id
                    WHERE mt.project_id = CAST(:pid AS uuid) AND mt.status = 'active'
                    ORDER BY mt.matched_at DESC
                    """
                ),
                {"pid": project_id},
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_project_matchings_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0}}

    return {
        "data": [
            {
                "id": str(r.id),
                "status": r.status,
                "mentor_id": str(r.mentor_id) if r.mentor_id else None,
                "mentor_name": r.mentor_name,
                "team_id": str(r.team_id) if r.team_id else None,
                "team_name": r.team_name,
                "matched_at": r.matched_at.isoformat() if r.matched_at else None,
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }


# ════════════════════════════════════════════════════════════════
#  M04-08 멘토단 활동 기록
# ════════════════════════════════════════════════════════════════


async def _is_matched_mentor(
    db: AsyncSession, *, project_id: str, user_id: str
) -> bool:
    """해당 프로젝트에 매칭된(active) 멘토 본인인지 검증."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT 1 FROM matchings mt
                    JOIN mentors m ON m.id = mt.mentor_id
                    WHERE mt.project_id = CAST(:pid AS uuid)
                      AND m.user_id = CAST(:uid AS uuid)
                      AND mt.status = 'active'
                    LIMIT 1
                    """
                ),
                {"pid": project_id, "uid": user_id},
            )
        ).first()
        return row is not None
    except Exception:  # noqa: BLE001
        return False


async def create_matching_activity_v2(
    db: AsyncSession,
    *,
    project_id: str,
    author_id: str,
    is_operator: bool,
    activity_date: _dt.date,
    activity_type: str,
    summary: str,
) -> dict[str, object]:
    """M04-08 멘토단 활동 기록 작성 (매칭 멘토 본인 + 운영자).

    Raises:
        HTTPException 403: 매칭 멘토도 운영자도 아님
        HTTPException 422: activity_type 부정·summary 누락
        HTTPException 404: 프로젝트 미존재
    """
    if activity_type not in VALID_ACTIVITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_activity_type",
                "message": "활동 유형은 회의·자문·검토(meeting/advice/review) 중 하나여야 합니다.",
            },
        )
    summary_norm = (summary or "").strip()
    if len(summary_norm) < _SUMMARY_MIN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "summary_required", "message": "활동 요약을 입력해 주세요."},
        )

    # 권한: 운영자 또는 매칭 멘토 본인
    if not is_operator and not await _is_matched_mentor(
        db, project_id=project_id, user_id=author_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "not_matched_mentor",
                "message": "해당 프로젝트에 매칭된 멘토 또는 운영자만 기록할 수 있습니다.",
            },
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        # 프로젝트 존재 확인
        proj = (
            await db.execute(
                sa.text(
                    "SELECT 1 FROM livinglab_projects WHERE id = CAST(:pid AS uuid) LIMIT 1"
                ),
                {"pid": project_id},
            )
        ).first()
        if proj is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "project_not_found", "message": "프로젝트를 찾을 수 없습니다."},
            )

        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO matching_activities
                        (project_id, author_id, activity_date, activity_type,
                         summary, created_at, updated_at)
                    VALUES
                        (CAST(:pid AS uuid), CAST(:author AS uuid), :adate,
                         :atype, :summary, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "pid": project_id,
                    "author": author_id,
                    "adate": activity_date,
                    "atype": activity_type,
                    "summary": summary_norm,
                    "now": now,
                },
            )
        ).first()
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_matching_activity_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "activity_create_failed", "message": "활동 기록 중 오류가 발생했습니다."},
        ) from exc

    return {
        "id": row.id if row else None,
        "project_id": project_id,
        "message": "활동을 기록했습니다.",
    }


async def update_matching_activity_v2(
    db: AsyncSession,
    *,
    activity_id: str,
    user_id: str,
    is_operator: bool,
    activity_date: _dt.date | None = None,
    activity_type: str | None = None,
    summary: str | None = None,
) -> dict[str, object]:
    """M04-08 활동 기록 수정 (작성자 본인 또는 운영자).

    Raises:
        HTTPException 404: 활동 미존재
        HTTPException 403: 작성자도 운영자도 아님
        HTTPException 422: activity_type 부정
    """
    try:
        act = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id, author_id::text AS author_id "
                    "FROM matching_activities WHERE id = CAST(:aid AS uuid) LIMIT 1"
                ),
                {"aid": activity_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        act = None
    if act is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "activity_not_found", "message": "활동 기록을 찾을 수 없습니다."},
        )
    if not is_operator and act.author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "not_author", "message": "작성자 본인 또는 운영자만 수정할 수 있습니다."},
        )
    if activity_type is not None and activity_type not in VALID_ACTIVITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_activity_type", "message": "활동 유형이 올바르지 않습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    sets = ["updated_at = :now"]
    params: dict[str, object] = {"now": now, "aid": activity_id}
    if activity_date is not None:
        sets.append("activity_date = :adate")
        params["adate"] = activity_date
    if activity_type is not None:
        sets.append("activity_type = :atype")
        params["atype"] = activity_type
    if summary is not None:
        sets.append("summary = :summary")
        params["summary"] = summary.strip()

    try:
        await db.execute(
            sa.text(
                f"UPDATE matching_activities SET {', '.join(sets)} "
                f"WHERE id = CAST(:aid AS uuid)"
            ),
            params,
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_matching_activity_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "activity_update_failed", "message": "활동 수정 중 오류가 발생했습니다."},
        ) from exc
    return {"id": activity_id, "updated": True, "message": "활동 기록을 수정했습니다."}


async def delete_matching_activity_v2(
    db: AsyncSession,
    *,
    activity_id: str,
    user_id: str,
    is_operator: bool,
) -> dict[str, object]:
    """M04-08 활동 기록 삭제 (작성자 본인 또는 운영자, hard delete)."""
    try:
        act = (
            await db.execute(
                sa.text(
                    "SELECT author_id::text AS author_id FROM matching_activities "
                    "WHERE id = CAST(:aid AS uuid) LIMIT 1"
                ),
                {"aid": activity_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        act = None
    if act is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "activity_not_found", "message": "활동 기록을 찾을 수 없습니다."},
        )
    if not is_operator and act.author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "not_author", "message": "작성자 본인 또는 운영자만 삭제할 수 있습니다."},
        )
    try:
        await db.execute(
            sa.text("DELETE FROM matching_activities WHERE id = CAST(:aid AS uuid)"),
            {"aid": activity_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_matching_activity_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "activity_delete_failed", "message": "활동 삭제 중 오류가 발생했습니다."},
        ) from exc
    return {"id": activity_id, "deleted": True, "message": "활동 기록을 삭제했습니다."}


async def list_matching_activities_v2(
    db: AsyncSession,
    *,
    project_id: str,
) -> dict[str, object]:
    """프로젝트의 멘토단 활동 기록 목록 (시간순)."""
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT a.id::text AS id, a.activity_date, a.activity_type,
                           a.summary, a.author_id::text AS author_id,
                           u.name AS author_name, a.created_at
                    FROM matching_activities a
                    LEFT JOIN users u ON u.id = a.author_id
                    WHERE a.project_id = CAST(:pid AS uuid)
                    ORDER BY a.activity_date DESC, a.created_at DESC
                    """
                ),
                {"pid": project_id},
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_matching_activities_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0}}

    return {
        "data": [
            {
                "id": str(r.id),
                "activity_date": r.activity_date.isoformat() if r.activity_date else None,
                "activity_type": r.activity_type,
                "summary": r.summary,
                "author_id": str(r.author_id) if r.author_id else None,
                "author_name": r.author_name,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }


# ════════════════════════════════════════════════════════════════
#  M04-09 멘토·학생팀 활동 이력 조회 (본인 / 운영자)
# ════════════════════════════════════════════════════════════════


async def list_user_matching_history_v2(
    db: AsyncSession,
    *,
    user_id: str,
) -> dict[str, object]:
    """M04-09 특정 사용자의 매칭·활동 이력 (본인 마이페이지 또는 운영자 조회).

    - 멘토로서 매칭된 프로젝트 + 본인이 작성한 활동 기록을 시간순으로 반환.
    """
    matchings: list[dict[str, object]] = []
    activities: list[dict[str, object]] = []
    try:
        mrows = (
            await db.execute(
                sa.text(
                    """
                    SELECT mt.id::text AS id, mt.project_id::text AS project_id,
                           p.title AS project_title, mt.status, mt.matched_at
                    FROM matchings mt
                    JOIN mentors m ON m.id = mt.mentor_id
                    LEFT JOIN livinglab_projects p ON p.id = mt.project_id
                    WHERE m.user_id = CAST(:uid AS uuid)
                    ORDER BY mt.matched_at DESC
                    """
                ),
                {"uid": user_id},
            )
        ).all()
        matchings = [
            {
                "id": str(r.id),
                "project_id": str(r.project_id) if r.project_id else None,
                "project_title": r.project_title,
                "status": r.status,
                "matched_at": r.matched_at.isoformat() if r.matched_at else None,
            }
            for r in mrows
        ]

        arows = (
            await db.execute(
                sa.text(
                    """
                    SELECT a.id::text AS id, a.project_id::text AS project_id,
                           p.title AS project_title, a.activity_date,
                           a.activity_type, a.summary
                    FROM matching_activities a
                    LEFT JOIN livinglab_projects p ON p.id = a.project_id
                    WHERE a.author_id = CAST(:uid AS uuid)
                    ORDER BY a.activity_date DESC, a.created_at DESC
                    """
                ),
                {"uid": user_id},
            )
        ).all()
        activities = [
            {
                "id": str(r.id),
                "project_id": str(r.project_id) if r.project_id else None,
                "project_title": r.project_title,
                "activity_date": r.activity_date.isoformat() if r.activity_date else None,
                "activity_type": r.activity_type,
                "summary": r.summary,
            }
            for r in arows
        ]
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_user_matching_history_v2 fallback: %s", exc)

    return {
        "matchings": matchings,
        "activities": activities,
        "meta": {
            "matching_count": len(matchings),
            "activity_count": len(activities),
        },
    }
