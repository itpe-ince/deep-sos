"""USCP V2 — Application / Terms Service (M07-10~14 약관 관리).

설계 근거:
  - feature-spec §M07-10 (이용약관 편집)·§M07-11 (개인정보처리방침 편집)
  - feature-spec §M07-12 (버전 관리 — 발행 시 버전 자동 부여, 발행분 본문 불변)
  - feature-spec §M07-13 (동의 이력 — 회원가입·재동의 시 자동 기록)
  - feature-spec §M07-14 (재동의 요청 — require_reconsent, 다음 로그인 시 모달, 거부=로그아웃)
  - design.md §4.2 M07 (`/admin/cms/terms`, `/terms/{kind}/current`, `/auth/reconsent*`)

terms_kind ENUM: service(이용약관) / privacy(개인정보처리방침)
규칙:
  - 발행은 운영자만. 발행분 본문은 불변(수정=새 버전 발행). 버전 자동 증가.
  - 현재 약관(/current)은 누구나. 재동의 체크/응답은 로그인 회원.
  - 재동의 거부 시 force_logout=true 응답 (FE 가 로그아웃·탈퇴 안내).
"""
from __future__ import annotations

import datetime as _dt
import logging
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

VALID_KINDS: Final[frozenset[str]] = frozenset({"service", "privacy"})
_KIND_LABELS = {"service": "이용약관", "privacy": "개인정보처리방침"}


def _next_version(latest: str | None) -> str:
    """버전 자동 부여: v1, v2, ... (직전 vN → vN+1)."""
    if not latest:
        return "v1"
    try:
        n = int(str(latest).lstrip("vV"))
        return f"v{n + 1}"
    except ValueError:
        return "v1"


# ════════════════════════════════════════════════════════════════
#  M07-10~12 약관 발행 (편집 = 새 버전)
# ════════════════════════════════════════════════════════════════


async def publish_terms_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    kind: str,
    body: str,
    effective_at: _dt.datetime | None = None,
    require_reconsent: bool = False,
) -> dict[str, object]:
    """M07-10/11/12 약관 발행 (운영자). 버전 자동 증가, 발행 즉시 현재 버전.

    Raises:
        HTTPException 422: kind 부정·본문 누락
    """
    k = (kind or "").lower().strip()
    if k not in VALID_KINDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_kind", "message": "약관 종류는 service 또는 privacy 여야 합니다."},
        )
    if not (body or "").strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "body_required", "message": "약관 본문을 입력해 주세요."},
        )

    now = _dt.datetime.now(_dt.UTC)
    eff = effective_at or now
    try:
        latest = (
            await db.execute(
                sa.text(
                    "SELECT version FROM terms_versions WHERE kind = CAST(:k AS terms_kind) "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"k": k},
            )
        ).first()
        version = _next_version(latest.version if latest else None)
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO terms_versions
                        (kind, version, body, effective_at, require_reconsent,
                         published_at, published_by, created_at, updated_at)
                    VALUES
                        (CAST(:k AS terms_kind), :version, :body, :eff, :reconsent,
                         :now, CAST(:op AS uuid), :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "k": k,
                    "version": version,
                    "body": body,
                    "eff": eff,
                    "reconsent": require_reconsent,
                    "now": now,
                    "op": operator_id,
                },
            )
        ).first()
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("publish_terms_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "terms_publish_failed", "message": "약관 발행 중 오류가 발생했습니다."},
        ) from exc
    return {
        "terms_id": row.id if row else None,
        "kind": k,
        "version": version,
        "require_reconsent": require_reconsent,
        "message": f"{_KIND_LABELS[k]} {version} 을(를) 발행했습니다.",
    }


async def get_current_terms_v2(db: AsyncSession, *, kind: str) -> dict[str, object]:
    """M07-10/11 현재 약관 조회 (공개). 가장 최근 발행 버전."""
    k = (kind or "").lower().strip()
    if k not in VALID_KINDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_kind", "message": "약관 종류가 올바르지 않습니다."},
        )
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT id::text AS id, kind::text AS kind, version, body,
                           effective_at, require_reconsent
                    FROM terms_versions
                    WHERE kind = CAST(:k AS terms_kind) AND published_at IS NOT NULL
                    ORDER BY created_at DESC LIMIT 1
                    """
                ),
                {"k": k},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "terms_not_found", "message": "발행된 약관이 없습니다."},
        )
    return {
        "id": str(row.id),
        "kind": row.kind,
        "kind_label": _KIND_LABELS.get(row.kind, row.kind),
        "version": row.version,
        "body": row.body,
        "effective_at": row.effective_at.isoformat() if row.effective_at else None,
        "require_reconsent": bool(row.require_reconsent),
    }


async def list_terms_versions_v2(db: AsyncSession, *, kind: str | None = None) -> dict[str, object]:
    """M07-12 약관 버전 이력 (운영자)."""
    clauses = ["1=1"]
    params: dict[str, object] = {}
    if kind and kind in VALID_KINDS:
        clauses.append("kind = CAST(:k AS terms_kind)")
        params["k"] = kind
    where = " AND ".join(clauses)
    try:
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT id::text AS id, kind::text AS kind, version,
                           effective_at, require_reconsent, published_at
                    FROM terms_versions WHERE {where}
                    ORDER BY kind, created_at DESC
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_terms_versions_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0}}
    return {
        "data": [
            {
                "id": str(r.id),
                "kind": r.kind,
                "kind_label": _KIND_LABELS.get(r.kind, r.kind),
                "version": r.version,
                "effective_at": r.effective_at.isoformat() if r.effective_at else None,
                "require_reconsent": bool(r.require_reconsent),
                "published_at": r.published_at.isoformat() if r.published_at else None,
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }


# ════════════════════════════════════════════════════════════════
#  M07-13/14 동의 이력 + 재동의
# ════════════════════════════════════════════════════════════════


async def record_agreement_v2(
    db: AsyncSession,
    *,
    user_id: str,
    terms_version_id: str,
) -> None:
    """M07-13 약관 동의 이력 기록 (회원가입·재동의 시 자동 호출). 중복은 무시."""
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO user_term_agreements (user_id, terms_version_id, agreed_at)
                VALUES (CAST(:uid AS uuid), CAST(:tid AS uuid), :now)
                ON CONFLICT (user_id, terms_version_id) DO NOTHING
                """
            ),
            {"uid": user_id, "tid": terms_version_id, "now": _dt.datetime.now(_dt.UTC)},
        )
        await db.commit()
    except Exception:  # noqa: BLE001 — dev fallback
        await db.rollback()


async def check_reconsent_required_v2(
    db: AsyncSession,
    *,
    user_id: str,
) -> dict[str, object]:
    """M07-14 재동의 필요 여부 (로그인 회원). require_reconsent=true 신 버전 중 미동의분 반환.

    각 kind 별 현재 버전이 require_reconsent=true 이고, 사용자가 그 버전에 미동의면 대상.
    """
    pending: list[dict[str, object]] = []
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT DISTINCT ON (t.kind)
                        t.id::text AS id, t.kind::text AS kind, t.version, t.require_reconsent
                    FROM terms_versions t
                    WHERE t.published_at IS NOT NULL
                    ORDER BY t.kind, t.created_at DESC
                    """
                )
            )
        ).all()
        for r in rows:
            if not r.require_reconsent:
                continue
            agreed = (
                await db.execute(
                    sa.text(
                        "SELECT 1 FROM user_term_agreements "
                        "WHERE user_id = CAST(:uid AS uuid) AND terms_version_id = CAST(:tid AS uuid) LIMIT 1"
                    ),
                    {"uid": user_id, "tid": r.id},
                )
            ).first()
            if agreed is None:
                pending.append(
                    {
                        "terms_id": str(r.id),
                        "kind": r.kind,
                        "kind_label": _KIND_LABELS.get(r.kind, r.kind),
                        "version": r.version,
                    }
                )
    except Exception as exc:  # noqa: BLE001
        logger.warning("check_reconsent_required_v2 fallback: %s", exc)
    return {"required": len(pending) > 0, "pending": pending}


async def submit_reconsent_v2(
    db: AsyncSession,
    *,
    user_id: str,
    terms_ids: list[str],
    accept: bool,
) -> dict[str, object]:
    """M07-14 재동의 응답 (로그인 회원).

    accept=True: 각 terms_id 동의 이력 기록 + users.terms_version_id 갱신.
    accept=False: force_logout=true 반환 (FE 가 로그아웃·탈퇴 안내).
    """
    if not accept:
        return {
            "accepted": False,
            "force_logout": True,
            "message": "재동의를 거부하셨습니다. 로그아웃되며, 계속하시려면 탈퇴 또는 재동의가 필요합니다.",
        }
    if not terms_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "terms_required", "message": "동의할 약관이 없습니다."},
        )
    now = _dt.datetime.now(_dt.UTC)
    try:
        for tid in terms_ids:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO user_term_agreements (user_id, terms_version_id, agreed_at)
                    VALUES (CAST(:uid AS uuid), CAST(:tid AS uuid), :now)
                    ON CONFLICT (user_id, terms_version_id) DO NOTHING
                    """
                ),
                {"uid": user_id, "tid": tid, "now": now},
            )
        # 최신 동의 버전을 users 에 반영(마지막 것)
        await db.execute(
            sa.text(
                "UPDATE users SET terms_version_id = CAST(:tid AS uuid) "
                "WHERE id = CAST(:uid AS uuid)"
            ),
            {"tid": terms_ids[-1], "uid": user_id},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("submit_reconsent_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "reconsent_failed", "message": "재동의 처리 중 오류가 발생했습니다."},
        ) from exc
    return {"accepted": True, "force_logout": False, "message": "재동의가 완료되었습니다."}
