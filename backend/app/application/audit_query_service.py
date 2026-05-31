"""USCP V2 — Application / Audit Query Service (M08-08/09 감사 로그 조회·보관).

설계 근거:
  - feature-spec §M08-08 (감사 로그 조회 — 기간·작업자·작업 종류 필터, 본인 작업 구분)
  - feature-spec §M08-09 (보관 정책 — 최소 1년, 동의 이력 등은 5년)
  - design.md §4.2 M08 (/admin/audit/logins, /gatekeeping, /all)

audit_logs 는 AuditMiddleware(M08-04~07) 가 자동 적재. 본 서비스는 조회·보관만 담당.
"""
from __future__ import annotations

import datetime as _dt
import logging
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# audit_action ENUM (0007): login/logout/create/update/delete/view_pii/stage_change
_VALID_ACTIONS: Final[frozenset[str]] = frozenset(
    {"login", "logout", "create", "update", "delete", "view_pii", "stage_change"}
)
_LOGIN_ACTIONS: Final[tuple[str, ...]] = ("login", "logout")
_GATEKEEPING_ACTIONS: Final[tuple[str, ...]] = ("stage_change",)

_AUDIT_RETENTION_DAYS: Final[int] = 365  # M08-09 최소 1년


async def list_audit_logs_v2(
    db: AsyncSession,
    *,
    viewer_id: str,
    actions: tuple[str, ...] | None = None,
    actor_id: str | None = None,
    action: str | None = None,
    start: _dt.date | None = None,
    end: _dt.date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, object]:
    """M08-08 감사 로그 조회 (운영자). 기간·작업자·종류 필터 + 본인 작업 구분(is_self).

    actions: 카테고리 사전필터(logins/gatekeeping). action: 단일 종류 추가필터.
    """
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    clauses = ["1=1"]
    params: dict[str, object] = {"lim": limit, "off": offset, "viewer": viewer_id}

    effective_actions: list[str] = []
    if actions:
        effective_actions = [a for a in actions if a in _VALID_ACTIONS]
    if action and action in _VALID_ACTIONS:
        # 단일 필터는 카테고리와 교집합 (카테고리 밖이면 결과 0)
        effective_actions = (
            [action] if not effective_actions or action in effective_actions else ["__none__"]
        )
    if effective_actions:
        clauses.append("a.action::text = ANY(:actions)")
        params["actions"] = effective_actions

    if actor_id:
        clauses.append("a.actor_id = CAST(:actor AS uuid)")
        params["actor"] = actor_id
    if start:
        clauses.append("a.created_at >= :start")
        params["start"] = _dt.datetime.combine(start, _dt.time.min, tzinfo=_dt.UTC)
    if end:
        clauses.append("a.created_at < :end")
        params["end"] = _dt.datetime.combine(
            end + _dt.timedelta(days=1), _dt.time.min, tzinfo=_dt.UTC
        )

    where = " AND ".join(clauses)
    try:
        total = (
            await db.execute(
                sa.text(f"SELECT COUNT(*) FROM audit_logs a WHERE {where}"), params
            )
        ).scalar() or 0
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT
                        a.id::text        AS id,
                        a.actor_id::text  AS actor_id,
                        u.name            AS actor_name,
                        a.action::text    AS action,
                        a.target_type     AS target_type,
                        a.target_id::text AS target_id,
                        a.ip              AS ip,
                        a.metadata        AS metadata,
                        a.created_at      AS created_at,
                        (a.actor_id = CAST(:viewer AS uuid)) AS is_self
                    FROM audit_logs a
                    LEFT JOIN users u ON u.id = a.actor_id
                    WHERE {where}
                    ORDER BY a.created_at DESC
                    LIMIT :lim OFFSET :off
                    """
                ),
                params,
            )
        ).mappings().all()
    except Exception as exc:  # noqa: BLE001 — audit_logs 미존재 dev fallback
        logger.warning("list_audit_logs_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r["id"]),
                "actor": {
                    "id": r["actor_id"],
                    "name": r["actor_name"] or ("시스템" if r["actor_id"] is None else "(탈퇴)"),
                },
                "action": r["action"],
                "target_type": r["target_type"],
                "target_id": r["target_id"],
                "ip": r["ip"],
                "metadata": r["metadata"],
                "is_self": bool(r["is_self"]),
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


async def list_login_audit_v2(db: AsyncSession, *, viewer_id: str, **kw) -> dict[str, object]:
    """M08-08 로그인 이력 (login/logout) 조회."""
    return await list_audit_logs_v2(db, viewer_id=viewer_id, actions=_LOGIN_ACTIONS, **kw)


async def list_gatekeeping_audit_v2(
    db: AsyncSession, *, viewer_id: str, **kw
) -> dict[str, object]:
    """M08-08 게이트키핑 이력 (stage_change) 조회."""
    return await list_audit_logs_v2(
        db, viewer_id=viewer_id, actions=_GATEKEEPING_ACTIONS, **kw
    )


# ════════════════════════════════════════════════════════════════
#  M08-09 — 보관 정책 (최소 1년, 자동 만료)
# ════════════════════════════════════════════════════════════════


async def purge_expired_audit_logs_v2(
    db: AsyncSession,
    *,
    retention_days: int = _AUDIT_RETENTION_DAYS,
    dry_run: bool = False,
) -> dict[str, object]:
    """M08-09 감사 로그 보관 정책 — retention_days 초과분 삭제.

    매일 cron(예: APScheduler/시스템 crontab → POST /admin/audit/purge)으로 실행.
    개인정보 동의 이력(user_term_agreements)·약관(terms_versions)은 별도 테이블이라
    본 정리 대상에서 제외 (법적 5년 보존 정책 유지).

    dry_run=True 면 삭제 없이 대상 건수만 반환.
    """
    cutoff = _dt.datetime.now(_dt.UTC) - _dt.timedelta(days=retention_days)
    try:
        target = (
            await db.execute(
                sa.text("SELECT COUNT(*) FROM audit_logs WHERE created_at < :c"),
                {"c": cutoff},
            )
        ).scalar() or 0
        if dry_run or target == 0:
            return {
                "deleted": 0,
                "candidates": int(target),
                "cutoff": cutoff.isoformat(),
                "dry_run": dry_run,
            }
        await db.execute(
            sa.text("DELETE FROM audit_logs WHERE created_at < :c"), {"c": cutoff}
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("purge_expired_audit_logs_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "purge_failed", "message": "감사 로그 정리 실패"},
        ) from exc

    return {
        "deleted": int(target),
        "candidates": int(target),
        "cutoff": cutoff.isoformat(),
        "dry_run": False,
    }
