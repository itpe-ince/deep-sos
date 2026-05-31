"""USCP V2 — Application / Mentor Service (M04-01~03).

설계 근거:
  - feature-spec §M04-01 (멘토 자격 부여 — 운영자, 재부여 무시, 안내 이메일)
  - feature-spec §M04-02 (멘토 자격 해제 — 진행중 매칭 경고, 이력 보존)
  - feature-spec §M04-03 (멘토 목록·검색 — 이름·소속·전문분야, 해제자 기본 제외)
  - design.md §4.2 M04 (`/admin/mentors`)

규칙:
  - 모든 작업은 운영자(operator/admin)만 가능 (라우터에서 _require_operator)
  - 자격 부여/해제 시 audit_logs 자동 기록 (dev fallback broad-except)
  - 자격 부여 즉시 본인에게 안내 이메일 (notify_mentor_granted)
  - 자격 해제는 soft (is_active=false + revoked_at) — 과거 활동 이력 보존
"""
from __future__ import annotations

import datetime as _dt
import logging

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.email import notify

logger = logging.getLogger(__name__)


async def _write_audit(
    db: AsyncSession,
    *,
    actor_id: str,
    action: str,
    target_type: str,
    target_id: str,
    metadata: dict[str, object],
) -> None:
    """audit_logs 기록 (0010 미적용 dev 환경 fallback).

    metadata 는 :meta 파라미터 바인딩(json 문자열)→ jsonb 캐스팅으로 안전하게 저장.
    """
    import json

    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO audit_logs
                    (actor_id, action, target_type, target_id, metadata, created_at)
                VALUES
                    (CAST(:actor AS uuid), CAST(:action AS audit_action),
                     :ttype, CAST(:tid AS uuid),
                     CAST(:meta AS jsonb), :now)
                """
            ),
            {
                "actor": actor_id,
                "action": action,
                "ttype": target_type,
                "tid": target_id,
                "meta": json.dumps(metadata, ensure_ascii=False),
                "now": _dt.datetime.now(_dt.UTC),
            },
        )
    except Exception:  # noqa: BLE001 — audit_logs 미적용 dev fallback
        pass


# ════════════════════════════════════════════════════════════════
#  M04-01 멘토 자격 부여
# ════════════════════════════════════════════════════════════════


async def grant_mentor_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    user_id: str,
    affiliation: str | None = None,
    expertise: list[str] | None = None,
) -> dict[str, object]:
    """M04-01 멘토 자격 부여 (운영자).

    재부여(이미 활성 멘토)는 무시하고 기존 레코드를 반환한다(idempotent).
    해제 상태(is_active=false)였다면 재활성화한다.

    Raises:
        HTTPException 404: 대상 회원 미존재
    """
    # 대상 회원 확인
    try:
        user_row = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id, name, email FROM users "
                    "WHERE id = CAST(:uid AS uuid) LIMIT 1"
                ),
                {"uid": user_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        user_row = None
    if user_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "user_not_found", "message": "대상 회원을 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    reactivated = False
    already_active = False
    try:
        existing = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id, is_active FROM mentors "
                    "WHERE user_id = CAST(:uid AS uuid) LIMIT 1"
                ),
                {"uid": user_id},
            )
        ).first()

        if existing is not None:
            mentor_id = existing.id
            if existing.is_active:
                already_active = True
            else:
                # 해제 상태 → 재활성화
                await db.execute(
                    sa.text(
                        """
                        UPDATE mentors
                        SET is_active = true, revoked_at = NULL,
                            affiliation = COALESCE(:aff, affiliation),
                            expertise = COALESCE(:exp, expertise),
                            granted_at = :now, granted_by = CAST(:op AS uuid),
                            updated_at = :now
                        WHERE id = CAST(:mid AS uuid)
                        """
                    ),
                    {
                        "aff": affiliation,
                        "exp": expertise,
                        "now": now,
                        "op": operator_id,
                        "mid": mentor_id,
                    },
                )
                reactivated = True
        else:
            row = (
                await db.execute(
                    sa.text(
                        """
                        INSERT INTO mentors
                            (user_id, affiliation, expertise, is_active,
                             granted_at, granted_by, created_at, updated_at)
                        VALUES
                            (CAST(:uid AS uuid), :aff, :exp, true,
                             :now, CAST(:op AS uuid), :now, :now)
                        RETURNING id::text AS id
                        """
                    ),
                    {
                        "uid": user_id,
                        "aff": affiliation,
                        "exp": expertise,
                        "now": now,
                        "op": operator_id,
                    },
                )
            ).first()
            mentor_id = row.id if row else None

        await _write_audit(
            db,
            actor_id=operator_id,
            action="create",
            target_type="mentor",
            target_id=str(mentor_id),
            metadata={"event": "mentor_granted", "user_id": user_id},
        )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("grant_mentor_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "grant_failed", "message": "멘토 자격 부여 중 오류가 발생했습니다."},
        ) from exc

    # 안내 이메일 (재부여=이미 활성 은 발송 skip)
    if not already_active and user_row.email:
        base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
        try:
            await notify(
                "notify_mentor_granted",  # type: ignore[arg-type]
                to=str(user_row.email),
                context={
                    "user_name": user_row.name or "회원",
                    "affiliation": affiliation or "",
                    "base_url": base_url,
                    "title": "멘토 자격이 부여되었습니다",
                    "message": "USCP 멘토로 선정되셨습니다. 매칭이 완료되면 별도 안내드립니다.",
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("mentor grant notification failed: %s", exc)

    msg = (
        "이미 멘토 자격이 있는 회원입니다."
        if already_active
        else ("멘토 자격을 재부여했습니다." if reactivated else "멘토 자격을 부여했습니다.")
    )
    return {
        "mentor_id": str(mentor_id),
        "user_id": user_id,
        "already_active": already_active,
        "reactivated": reactivated,
        "message": msg,
    }


# ════════════════════════════════════════════════════════════════
#  M04-02 멘토 자격 해제
# ════════════════════════════════════════════════════════════════


async def revoke_mentor_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    mentor_id: str,
) -> dict[str, object]:
    """M04-02 멘토 자격 해제 (운영자, soft).

    진행 중(active) 매칭이 남아 있으면 경고 플래그를 응답에 포함하되 해제는 수행한다.
    과거 활동 이력(matching_activities)은 보존한다.

    Raises:
        HTTPException 404: 멘토 미존재
    """
    try:
        mentor = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id, is_active FROM mentors "
                    "WHERE id = CAST(:mid AS uuid) LIMIT 1"
                ),
                {"mid": mentor_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        mentor = None
    if mentor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "mentor_not_found", "message": "멘토를 찾을 수 없습니다."},
        )

    # 진행 중 매칭 카운트 (경고용)
    active_matchings = 0
    try:
        cnt = (
            await db.execute(
                sa.text(
                    "SELECT COUNT(*) AS c FROM matchings "
                    "WHERE mentor_id = CAST(:mid AS uuid) AND status = 'active'"
                ),
                {"mid": mentor_id},
            )
        ).first()
        active_matchings = int(cnt.c) if cnt else 0
    except Exception:  # noqa: BLE001
        active_matchings = 0

    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                UPDATE mentors
                SET is_active = false, revoked_at = :now, updated_at = :now
                WHERE id = CAST(:mid AS uuid)
                """
            ),
            {"now": now, "mid": mentor_id},
        )
        await _write_audit(
            db,
            actor_id=operator_id,
            action="update",
            target_type="mentor",
            target_id=mentor_id,
            metadata={"event": "mentor_revoked", "active_matchings": active_matchings},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("revoke_mentor_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "revoke_failed", "message": "멘토 자격 해제 중 오류가 발생했습니다."},
        ) from exc

    return {
        "mentor_id": mentor_id,
        "active_matchings_warning": active_matchings > 0,
        "active_matchings": active_matchings,
        "message": (
            f"멘토 자격을 해제했습니다. 진행 중 매칭 {active_matchings}건이 남아 있어 별도 해제를 권장합니다."
            if active_matchings > 0
            else "멘토 자격을 해제했습니다."
        ),
    }


# ════════════════════════════════════════════════════════════════
#  M04-03 멘토 목록·검색
# ════════════════════════════════════════════════════════════════


async def list_mentors_v2(
    db: AsyncSession,
    *,
    q: str | None = None,
    affiliation: str | None = None,
    expertise: str | None = None,
    include_inactive: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, object]:
    """M04-03 멘토 목록·검색 (운영자).

    필터: 이름(q)·소속(affiliation)·전문분야(expertise).
    기본적으로 해제 멘토(is_active=false)는 제외 (include_inactive=true 로 포함).
    """
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    clauses = ["1=1"]
    params: dict[str, object] = {"limit": limit, "offset": offset}

    if not include_inactive:
        clauses.append("m.is_active = true")
    if q:
        clauses.append("u.name ILIKE :q")
        params["q"] = f"%{q}%"
    if affiliation:
        clauses.append("m.affiliation ILIKE :aff")
        params["aff"] = f"%{affiliation}%"
    if expertise:
        clauses.append(":exp = ANY(m.expertise)")
        params["exp"] = expertise

    where = " AND ".join(clauses)
    try:
        total_row = (
            await db.execute(
                sa.text(
                    f"SELECT COUNT(*) AS c FROM mentors m "
                    f"JOIN users u ON u.id = m.user_id WHERE {where}"
                ),
                params,
            )
        ).first()
        total = int(total_row.c) if total_row else 0

        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT m.id::text AS id, m.user_id::text AS user_id,
                           u.name AS name, u.email AS email,
                           m.affiliation, m.expertise, m.is_active,
                           m.granted_at, m.revoked_at
                    FROM mentors m
                    JOIN users u ON u.id = m.user_id
                    WHERE {where}
                    ORDER BY m.is_active DESC, m.granted_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001 — mentors 테이블 미적용 dev fallback
        logger.warning("list_mentors_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "user_id": str(r.user_id),
                "name": r.name,
                "email": r.email,
                "affiliation": r.affiliation,
                "expertise": list(r.expertise) if r.expertise else [],
                "is_active": bool(r.is_active),
                "granted_at": r.granted_at.isoformat() if r.granted_at else None,
                "revoked_at": r.revoked_at.isoformat() if r.revoked_at else None,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }
