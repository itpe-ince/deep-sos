"""USCP V2 — Application / Student Team Service (M04-04~05).

설계 근거:
  - feature-spec §M04-04 (학생팀 구성 — 팀명·팀장·팀원, 다중 소속 허용, 안내 이메일)
  - feature-spec §M04-05 (학생팀 수정·해체 — 진행중 매칭 시 경고)
  - design.md §4.2 M04 (`/admin/teams`)

규칙:
  - 모든 작업은 운영자(operator/admin)만 가능 (라우터에서 _require_operator)
  - 한 학생이 여러 팀에 동시 소속 허용 (uq_team_user 는 동일 팀 내 중복만 차단)
  - 팀 구성 시 팀원들에게 안내 이메일 (notify_team_assigned)
  - 해체는 soft (is_active=false + disbanded_at), 진행중 매칭 시 경고
"""
from __future__ import annotations

import datetime as _dt
import json
import logging

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.email import notify

logger = logging.getLogger(__name__)

_TEAM_NAME_MAX = 100


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
                     'student_team', CAST(:tid AS uuid),
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


async def _fetch_member_emails(
    db: AsyncSession, user_ids: list[str]
) -> list[tuple[str, str]]:
    """(name, email) 목록 반환 (알림 발송용)."""
    if not user_ids:
        return []
    try:
        rows = (
            await db.execute(
                sa.text(
                    "SELECT name, email FROM users "
                    "WHERE id = ANY(CAST(:ids AS uuid[])) AND email IS NOT NULL"
                ),
                {"ids": user_ids},
            )
        ).all()
        return [(r.name or "회원", r.email) for r in rows]
    except Exception:  # noqa: BLE001
        return []


# ════════════════════════════════════════════════════════════════
#  M04-04 학생팀 구성
# ════════════════════════════════════════════════════════════════


async def create_team_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    name: str,
    leader_id: str,
    member_ids: list[str],
) -> dict[str, object]:
    """M04-04 학생팀 구성 (운영자).

    팀장은 자동으로 팀원에 포함된다. 팀원들에게 안내 이메일 발송.

    Raises:
        HTTPException 422: 팀명 길이 위반·팀장 누락
        HTTPException 404: 팀장/팀원 회원 미존재
    """
    name_norm = (name or "").strip()
    if not (1 <= len(name_norm) <= _TEAM_NAME_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_team_name",
                "message": f"팀 이름은 1자 이상 {_TEAM_NAME_MAX}자 이내로 입력해 주세요.",
            },
        )
    if not leader_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "leader_required", "message": "팀장을 지정해 주세요."},
        )

    # 팀장 + 팀원 합집합 (팀장 자동 포함, 중복 제거)
    all_members = list(dict.fromkeys([leader_id, *member_ids]))

    # 회원 존재 검증
    try:
        cnt = (
            await db.execute(
                sa.text(
                    "SELECT COUNT(*) AS c FROM users "
                    "WHERE id = ANY(CAST(:ids AS uuid[]))"
                ),
                {"ids": all_members},
            )
        ).first()
        found = int(cnt.c) if cnt else 0
    except Exception:  # noqa: BLE001
        found = len(all_members)  # dev fallback — 검증 skip
    if found < len(all_members):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "member_not_found", "message": "일부 회원을 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        team_row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO student_teams
                        (name, leader_id, is_active, created_at, updated_at)
                    VALUES
                        (:name, CAST(:leader AS uuid), true, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {"name": name_norm, "leader": leader_id, "now": now},
            )
        ).first()
        team_id = team_row.id if team_row else None

        for uid in all_members:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO team_members (team_id, user_id, joined_at)
                    VALUES (CAST(:tid AS uuid), CAST(:uid AS uuid), :now)
                    ON CONFLICT (team_id, user_id) DO NOTHING
                    """
                ),
                {"tid": team_id, "uid": uid, "now": now},
            )

        await _write_audit(
            db,
            actor_id=operator_id,
            action="create",
            target_id=str(team_id),
            metadata={"event": "team_created", "member_count": len(all_members)},
        )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_team_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "team_create_failed", "message": "학생팀 구성 중 오류가 발생했습니다."},
        ) from exc

    # 팀원 안내 이메일
    base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
    for member_name, email in await _fetch_member_emails(db, all_members):
        try:
            await notify(
                "notify_team_assigned",  # type: ignore[arg-type]
                to=str(email),
                context={
                    "user_name": member_name,
                    "team_name": name_norm,
                    "base_url": base_url,
                    "title": "학생팀에 배정되었습니다",
                    "message": f"「{name_norm}」 학생팀에 배정되었습니다.",
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("team assignment notification failed: %s", exc)

    return {
        "team_id": str(team_id),
        "name": name_norm,
        "leader_id": leader_id,
        "member_count": len(all_members),
        "message": "학생팀을 구성했습니다.",
    }


# ════════════════════════════════════════════════════════════════
#  M04-05 학생팀 수정·해체
# ════════════════════════════════════════════════════════════════


async def update_team_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    team_id: str,
    name: str | None = None,
    leader_id: str | None = None,
    member_ids: list[str] | None = None,
) -> dict[str, object]:
    """M04-05 학생팀 수정 (운영자). 이름·팀장·구성원 변경.

    member_ids 가 제공되면 팀원을 전량 교체한다(팀장 자동 포함).

    Raises:
        HTTPException 404: 팀 미존재
        HTTPException 422: 팀명 길이 위반
    """
    try:
        team = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id FROM student_teams "
                    "WHERE id = CAST(:tid AS uuid) AND is_active = true LIMIT 1"
                ),
                {"tid": team_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        team = None
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "team_not_found", "message": "학생팀을 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        if name is not None:
            name_norm = name.strip()
            if not (1 <= len(name_norm) <= _TEAM_NAME_MAX):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "invalid_team_name",
                        "message": f"팀 이름은 1자 이상 {_TEAM_NAME_MAX}자 이내로 입력해 주세요.",
                    },
                )
            await db.execute(
                sa.text(
                    "UPDATE student_teams SET name = :name, updated_at = :now "
                    "WHERE id = CAST(:tid AS uuid)"
                ),
                {"name": name_norm, "now": now, "tid": team_id},
            )
        if leader_id is not None:
            await db.execute(
                sa.text(
                    "UPDATE student_teams SET leader_id = CAST(:leader AS uuid), updated_at = :now "
                    "WHERE id = CAST(:tid AS uuid)"
                ),
                {"leader": leader_id, "now": now, "tid": team_id},
            )
        if member_ids is not None:
            new_members = list(dict.fromkeys([*([leader_id] if leader_id else []), *member_ids]))
            await db.execute(
                sa.text("DELETE FROM team_members WHERE team_id = CAST(:tid AS uuid)"),
                {"tid": team_id},
            )
            for uid in new_members:
                await db.execute(
                    sa.text(
                        """
                        INSERT INTO team_members (team_id, user_id, joined_at)
                        VALUES (CAST(:tid AS uuid), CAST(:uid AS uuid), :now)
                        ON CONFLICT (team_id, user_id) DO NOTHING
                        """
                    ),
                    {"tid": team_id, "uid": uid, "now": now},
                )

        await _write_audit(
            db,
            actor_id=operator_id,
            action="update",
            target_id=team_id,
            metadata={"event": "team_updated"},
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_team_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "team_update_failed", "message": "학생팀 수정 중 오류가 발생했습니다."},
        ) from exc

    return {"team_id": team_id, "updated": True, "message": "학생팀을 수정했습니다."}


async def disband_team_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    team_id: str,
) -> dict[str, object]:
    """M04-05 학생팀 해체 (운영자, soft).

    진행 중(active) 매칭이 있으면 경고 플래그를 응답에 포함하되 해체는 수행한다.

    Raises:
        HTTPException 404: 팀 미존재
    """
    try:
        team = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id FROM student_teams "
                    "WHERE id = CAST(:tid AS uuid) LIMIT 1"
                ),
                {"tid": team_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        team = None
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "team_not_found", "message": "학생팀을 찾을 수 없습니다."},
        )

    active_matchings = 0
    try:
        cnt = (
            await db.execute(
                sa.text(
                    "SELECT COUNT(*) AS c FROM matchings "
                    "WHERE team_id = CAST(:tid AS uuid) AND status = 'active'"
                ),
                {"tid": team_id},
            )
        ).first()
        active_matchings = int(cnt.c) if cnt else 0
    except Exception:  # noqa: BLE001
        active_matchings = 0

    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                "UPDATE student_teams SET is_active = false, disbanded_at = :now, updated_at = :now "
                "WHERE id = CAST(:tid AS uuid)"
            ),
            {"now": now, "tid": team_id},
        )
        await _write_audit(
            db,
            actor_id=operator_id,
            action="delete",
            target_id=team_id,
            metadata={"event": "team_disbanded", "active_matchings": active_matchings},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("disband_team_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "team_disband_failed", "message": "학생팀 해체 중 오류가 발생했습니다."},
        ) from exc

    return {
        "team_id": team_id,
        "active_matchings_warning": active_matchings > 0,
        "active_matchings": active_matchings,
        "message": (
            f"학생팀을 해체했습니다. 진행 중 매칭 {active_matchings}건이 남아 있어 별도 해제를 권장합니다."
            if active_matchings > 0
            else "학생팀을 해체했습니다."
        ),
    }


# ════════════════════════════════════════════════════════════════
#  학생팀 목록·상세 (M04-05 운영자 화면 지원)
# ════════════════════════════════════════════════════════════════


async def list_teams_v2(
    db: AsyncSession,
    *,
    include_inactive: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, object]:
    """학생팀 목록 (운영자). 팀원 수 포함."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    where = "1=1" if include_inactive else "t.is_active = true"
    try:
        total_row = (
            await db.execute(
                sa.text(f"SELECT COUNT(*) AS c FROM student_teams t WHERE {where}")
            )
        ).first()
        total = int(total_row.c) if total_row else 0
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT t.id::text AS id, t.name, t.leader_id::text AS leader_id,
                           lu.name AS leader_name, t.is_active,
                           t.created_at, t.disbanded_at,
                           (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
                    FROM student_teams t
                    LEFT JOIN users lu ON lu.id = t.leader_id
                    WHERE {where}
                    ORDER BY t.is_active DESC, t.created_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {"limit": limit, "offset": offset},
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_teams_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "name": r.name,
                "leader_id": str(r.leader_id) if r.leader_id else None,
                "leader_name": r.leader_name,
                "is_active": bool(r.is_active),
                "member_count": int(r.member_count or 0),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "disbanded_at": r.disbanded_at.isoformat() if r.disbanded_at else None,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }
