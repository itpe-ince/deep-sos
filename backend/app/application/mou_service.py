"""USCP V2 — Application / MOU Service (M05-03/04/05).

설계 근거:
  - feature-spec §M05-03 (MOU 등록 — 기관·협약명·체결일·만료일·내용·첨부, 날짜 검증)
  - feature-spec §M05-04 (만료 임박 자동 알림 — 30일 전, 1회 발송, 시스템 자동)
  - feature-spec §M05-05 (MOU 공개 목록 — 상태 필터, 만료 자동 표시)
  - design.md §4.2 M05 (`/network/mous`, `/admin/organizations/{id}/mou`, `/admin/mous/expiring`)

규칙:
  - 등록은 운영자만. 공개 목록은 누구나
  - 만료일 ≤ 체결일이면 등록 거부 (DB ck_mous_dates + 앱 검증)
  - status 는 컬럼이 아닌 expires_at 기준 파생: 만료일 < 오늘 → expired, 아니면 active
  - M05-04 만료 임박: expires_at 이 N일(기본 30) 이내 + expire_notification_sent_at IS NULL 대상
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

_TITLE_MAX = 200
_EXPIRE_WINDOW_DAYS = 30


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
                     'mou', CAST(:tid AS uuid), CAST(:meta AS jsonb), :now)
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
    except Exception:  # noqa: BLE001
        pass


# ════════════════════════════════════════════════════════════════
#  M05-03 MOU 등록
# ════════════════════════════════════════════════════════════════


async def create_mou_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    organization_id: str,
    title: str,
    signed_at: _dt.date,
    expires_at: _dt.date,
    body: str | None = None,
    attachment_key: str | None = None,
) -> dict[str, object]:
    """M05-03 MOU 등록 (운영자).

    Raises:
        HTTPException 404: 협약 기관 미존재
        HTTPException 422: 제목 길이·날짜 역전(만료≤체결)
    """
    title_norm = (title or "").strip()
    if not (1 <= len(title_norm) <= _TITLE_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_title", "message": f"협약명은 1~{_TITLE_MAX}자로 입력해 주세요."},
        )
    if expires_at <= signed_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_date_range", "message": "만료일은 체결일 이후여야 합니다."},
        )

    # 기관 존재 확인
    try:
        org = (
            await db.execute(
                sa.text("SELECT id FROM organizations WHERE id = CAST(:oid AS uuid) LIMIT 1"),
                {"oid": organization_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        org = None
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "org_not_found", "message": "협약 기관을 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO mous
                        (organization_id, title, signed_at, expires_at, body,
                         attachment_key, created_at, updated_at)
                    VALUES
                        (CAST(:oid AS uuid), :title, :signed, :expires, :body,
                         :att, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "oid": organization_id,
                    "title": title_norm,
                    "signed": signed_at,
                    "expires": expires_at,
                    "body": body,
                    "att": attachment_key,
                    "now": now,
                },
            )
        ).first()
        mou_id = row.id if row else None
        await _write_audit(
            db, actor_id=operator_id, action="create", target_id=str(mou_id),
            metadata={"event": "mou_created", "organization_id": organization_id},
        )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_mou_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "mou_create_failed", "message": "MOU 등록 중 오류가 발생했습니다."},
        ) from exc

    return {"mou_id": str(mou_id), "title": title_norm, "message": "MOU를 등록했습니다."}


# ════════════════════════════════════════════════════════════════
#  M05-05 MOU 공개 목록 (만료 자동 표시)
# ════════════════════════════════════════════════════════════════


async def list_mous_v2(
    db: AsyncSession,
    *,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, object]:
    """M05-05 MOU 목록 (공개). status 는 expires_at 기준 파생(active/expired).

    status_filter: 'active' | 'expired' | None(전체)
    """
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    clauses = ["1=1"]
    params: dict[str, object] = {"limit": limit, "offset": offset, "today": _dt.date.today()}
    if status_filter == "active":
        clauses.append("m.expires_at >= :today")
    elif status_filter == "expired":
        clauses.append("m.expires_at < :today")
    where = " AND ".join(clauses)
    try:
        total_row = (
            await db.execute(
                sa.text(f"SELECT COUNT(*) AS c FROM mous m WHERE {where}"), params
            )
        ).first()
        total = int(total_row.c) if total_row else 0
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT m.id::text AS id, m.title, m.organization_id::text AS organization_id,
                           o.name AS organization_name,
                           m.signed_at, m.expires_at, m.body, m.attachment_key,
                           (m.expires_at < :today) AS is_expired
                    FROM mous m
                    LEFT JOIN organizations o ON o.id = m.organization_id
                    WHERE {where}
                    ORDER BY m.expires_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_mous_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "title": r.title,
                "organization_id": str(r.organization_id) if r.organization_id else None,
                "organization_name": r.organization_name,
                "signed_at": r.signed_at.isoformat() if r.signed_at else None,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "status": "expired" if r.is_expired else "active",
                "has_attachment": bool(r.attachment_key),
                "body": r.body,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }


# ════════════════════════════════════════════════════════════════
#  M05-04 만료 임박 조회 + 알림 발송
# ════════════════════════════════════════════════════════════════


async def list_expiring_mous_v2(
    db: AsyncSession,
    *,
    within_days: int = _EXPIRE_WINDOW_DAYS,
) -> dict[str, object]:
    """M05-04 만료 임박 MOU 목록 (운영자 화면 + 알림 대상 산출).

    expires_at 이 오늘~within_days 이내이고 아직 만료 전인 MOU.
    """
    today = _dt.date.today()
    horizon = today + _dt.timedelta(days=within_days)
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT m.id::text AS id, m.title, m.expires_at,
                           o.name AS organization_name,
                           m.expire_notification_sent_at
                    FROM mous m
                    LEFT JOIN organizations o ON o.id = m.organization_id
                    WHERE m.expires_at >= :today AND m.expires_at <= :horizon
                    ORDER BY m.expires_at ASC
                    """
                ),
                {"today": today, "horizon": horizon},
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_expiring_mous_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "within_days": within_days}}

    return {
        "data": [
            {
                "id": str(r.id),
                "title": r.title,
                "organization_name": r.organization_name,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "days_left": (r.expires_at - today).days if r.expires_at else None,
                "notified": r.expire_notification_sent_at is not None,
            }
            for r in rows
        ],
        "meta": {"total": len(rows), "within_days": within_days},
    }


async def send_expiry_notifications_v2(
    db: AsyncSession,
    *,
    operator_emails: list[str],
    within_days: int = _EXPIRE_WINDOW_DAYS,
) -> dict[str, object]:
    """M05-04 만료 임박 알림 발송 (시스템 자동 — cron 트리거).

    미발송(expire_notification_sent_at IS NULL) 임박 MOU 에 대해 운영자에게 이메일 1회 발송 후
    발송시각 기록(중복 방지). 외부 cron(`alembic`/시스템 cron)에서 호출하는 진입점.
    """
    today = _dt.date.today()
    horizon = today + _dt.timedelta(days=within_days)
    sent = 0
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT m.id::text AS id, m.title, m.expires_at, o.name AS organization_name
                    FROM mous m
                    LEFT JOIN organizations o ON o.id = m.organization_id
                    WHERE m.expires_at >= :today AND m.expires_at <= :horizon
                      AND m.expire_notification_sent_at IS NULL
                    """
                ),
                {"today": today, "horizon": horizon},
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("send_expiry_notifications_v2 query fallback: %s", exc)
        return {"sent": 0, "message": "만료 임박 MOU 조회 실패 (dev)"}

    base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
    now = _dt.datetime.now(_dt.UTC)
    for r in rows:
        for email in operator_emails:
            try:
                await notify(
                    "mou_expiring",  # type: ignore[arg-type]
                    to=str(email),
                    context={
                        "mou_title": r.title,
                        "organization_name": r.organization_name or "",
                        "expires_at": r.expires_at.isoformat() if r.expires_at else "",
                        "days_left": (r.expires_at - today).days if r.expires_at else "",
                        "base_url": base_url,
                        "title": "MOU 만료 임박 안내",
                        "message": f"「{r.title}」 협약이 곧 만료됩니다. 갱신·후속 협의를 검토해 주세요.",
                    },
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("mou expiry notification failed: %s", exc)
        # 1회 발송 마킹 (중복 방지)
        try:
            await db.execute(
                sa.text(
                    "UPDATE mous SET expire_notification_sent_at = :now "
                    "WHERE id = CAST(:mid AS uuid)"
                ),
                {"now": now, "mid": r.id},
            )
            sent += 1
        except Exception:  # noqa: BLE001
            pass
    try:
        await db.commit()
    except Exception:  # noqa: BLE001
        await db.rollback()

    return {"sent": sent, "message": f"만료 임박 MOU {sent}건 알림 발송 완료."}
