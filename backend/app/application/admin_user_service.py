"""USCP V2 — Application / Admin User Service (M08-01/02/03 권한 관리).

설계 근거:
  - feature-spec §M08-01 (운영자 계정 추가 — 이메일·이름·임시 비밀번호, 중복 차단, 안내 메일)
  - feature-spec §M08-02 (운영자 삭제·비활성화 — 본인 직접 삭제 금지, 90일 보존)
  - feature-spec §M08-03 (사용자 목록·검색 — 시민·운영자·멘토 통합, 이름/이메일/역할/상태 필터)
  - design.md §4.2 M08 (/admin/users, /admin/operators)

감사 로그:
  - 개인정보 조회(M08-06)·운영자 추가/삭제(M08-07) 는 AuditMiddleware 가 자동 기록
    (/admin/users/{id} → view_pii, POST /admin/operators → create, DELETE → delete).
"""
from __future__ import annotations

import datetime as _dt
import logging
import uuid
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password

logger = logging.getLogger(__name__)

_VALID_ROLES: Final[frozenset[str]] = frozenset(
    {"citizen", "operator", "mentor", "student"}
)
_VALID_STATUSES: Final[frozenset[str]] = frozenset({"active", "suspended", "withdrawn"})
_OPERATOR_RETENTION_DAYS: Final[int] = 90  # M08-02 삭제 후 보존 기간


# ════════════════════════════════════════════════════════════════
#  M08-03 — 사용자 목록·검색
# ════════════════════════════════════════════════════════════════


async def list_users_v2(
    db: AsyncSession,
    *,
    q: str | None = None,
    role: str | None = None,
    user_status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, object]:
    """M08-03 사용자 통합 목록·검색 (운영자). 이름/이메일 부분검색 + 역할/상태 필터."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    clauses = ["1=1"]
    params: dict[str, object] = {"lim": limit, "off": offset}
    if q and q.strip():
        clauses.append("(u.name ILIKE :q OR u.email ILIKE :q)")
        params["q"] = f"%{q.strip()}%"
    if role and role in _VALID_ROLES:
        clauses.append("u.role::text = :role")
        params["role"] = role
    if user_status and user_status in _VALID_STATUSES:
        clauses.append(
            "COALESCE(u.status::text, CASE WHEN u.is_active THEN 'active' ELSE 'suspended' END) = :st"
        )
        params["st"] = user_status

    where = " AND ".join(clauses)
    try:
        total = (
            await db.execute(
                sa.text(f"SELECT COUNT(*) FROM users u WHERE {where}"), params
            )
        ).scalar() or 0
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT
                        u.id::text       AS id,
                        u.email          AS email,
                        u.name           AS name,
                        u.role::text     AS role,
                        COALESCE(u.status::text,
                                 CASE WHEN u.is_active THEN 'active' ELSE 'suspended' END) AS status,
                        u.last_login_at  AS last_login_at,
                        u.created_at     AS created_at
                    FROM users u
                    WHERE {where}
                    ORDER BY u.created_at DESC
                    LIMIT :lim OFFSET :off
                    """
                ),
                params,
            )
        ).mappings().all()
    except Exception as exc:  # noqa: BLE001 — 0008 미적용 dev fallback
        logger.warning("list_users_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r["id"]),
                "email": r["email"],
                "name": r["name"],
                "role": r["role"],
                "status": r["status"],
                "last_login_at": (
                    r["last_login_at"].isoformat()
                    if r["last_login_at"] and hasattr(r["last_login_at"], "isoformat")
                    else None
                ),
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


async def get_user_detail_v2(
    db: AsyncSession,
    *,
    user_id: str,
) -> dict[str, object]:
    """M08-03/06 사용자 상세 (운영자). 개인정보(birth_year) 포함 — 조회 시 view_pii 자동 기록."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        u.id::text       AS id,
                        u.email          AS email,
                        u.name           AS name,
                        u.role::text     AS role,
                        COALESCE(u.status::text,
                                 CASE WHEN u.is_active THEN 'active' ELSE 'suspended' END) AS status,
                        u.birth_year     AS birth_year,
                        u.email_verified AS email_verified,
                        u.last_login_at  AS last_login_at,
                        u.created_at     AS created_at
                    FROM users u
                    WHERE u.id = CAST(:id AS uuid)
                    LIMIT 1
                    """
                ),
                {"id": user_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "user_not_found", "message": "사용자를 찾을 수 없습니다."},
        )
    return {
        "id": str(row.id),
        "email": row.email,
        "name": row.name,
        "role": row.role,
        "status": row.status,
        "birth_year": row.birth_year,
        "email_verified": bool(row.email_verified),
        "last_login_at": (
            row.last_login_at.isoformat()
            if row.last_login_at and hasattr(row.last_login_at, "isoformat")
            else None
        ),
        "created_at": (
            row.created_at.isoformat()
            if hasattr(row.created_at, "isoformat")
            else str(row.created_at)
        ),
    }


# ════════════════════════════════════════════════════════════════
#  M08-01 — 운영자 계정 추가
# ════════════════════════════════════════════════════════════════


async def create_operator_v2(
    db: AsyncSession,
    *,
    actor_id: str,
    email: str,
    name: str,
    temp_password: str,
) -> dict[str, object]:
    """M08-01 신규 운영자 발급 (운영자 전용).

    Raises:
        HTTPException 409: 이미 가입된 이메일
        HTTPException 422: 입력 검증 실패
    """
    email_norm = email.lower().strip()
    name_norm = name.strip()
    if not name_norm or len(name_norm) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_name", "message": "이름은 1~100자로 입력해 주세요."},
        )
    if len(temp_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "weak_password",
                "message": "임시 비밀번호는 8자 이상이어야 합니다.",
            },
        )

    # 중복 이메일 검증 (M08-01 유의사항)
    try:
        existing = (
            await db.execute(
                sa.text("SELECT 1 FROM users WHERE email = :e LIMIT 1"),
                {"e": email_norm},
            )
        ).first()
    except Exception:  # noqa: BLE001
        existing = None
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "email_already_exists",
                "message": "이미 가입된 이메일입니다.",
            },
        )

    user_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)
    pw_hash = hash_password(temp_password)
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO users
                    (id, email, name, password_hash, role,
                     status, is_active, email_verified,
                     created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), :email, :name, :pw,
                     CAST('operator' AS user_role),
                     CAST('active' AS user_status), true, true,
                     :now, :now)
                """
            ),
            {
                "id": str(user_id),
                "email": email_norm,
                "name": name_norm,
                "pw": pw_hash,
                "now": now,
            },
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_operator_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "operator_create_failed", "message": "운영자 생성 실패"},
        ) from exc

    # 안내 메일 (M08-01 유의사항) — best-effort
    try:
        from app.core.mailer import send_email

        await send_email(
            to=email_norm,
            subject="[USCP] 운영자 계정이 발급되었습니다",
            html_body=(
                f"<p>{name_norm} 님, USCP 운영자 계정이 발급되었습니다.</p>"
                f"<p>임시 비밀번호로 로그인 후 즉시 비밀번호를 변경해 주세요.</p>"
            ),
            text_body=(
                f"{name_norm} 님, USCP 운영자 계정이 발급되었습니다. "
                "임시 비밀번호로 로그인 후 즉시 변경해 주세요."
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("operator_invite_mail_skipped: %s", exc)

    return {
        "id": str(user_id),
        "email": email_norm,
        "name": name_norm,
        "role": "operator",
        "created_at": now.isoformat(),
        "message": "운영자 계정이 발급되었습니다. 안내 메일을 발송했습니다.",
    }


# ════════════════════════════════════════════════════════════════
#  M08-02 — 운영자 삭제·비활성화
# ════════════════════════════════════════════════════════════════


async def deactivate_operator_v2(
    db: AsyncSession,
    *,
    actor_id: str,
    target_id: str,
    mode: str = "deactivate",
) -> dict[str, object]:
    """M08-02 운영자 비활성화·삭제 (운영자 전용, 본인 직접 처리 금지).

    mode: 'deactivate'(정지) | 'delete'(탈퇴 — 90일 보존 후 파기)

    Raises:
        HTTPException 403: 본인 계정 직접 처리 시도 (상호 견제)
        HTTPException 404: 대상 미존재
        HTTPException 422: mode 오류 / 대상이 운영자가 아님
    """
    if mode not in ("deactivate", "delete"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_mode", "message": "mode 는 deactivate 또는 delete 만 가능합니다."},
        )
    if str(target_id) == str(actor_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "cannot_self_delete",
                "message": "본인 계정은 직접 처리할 수 없습니다. 다른 운영자에게 요청하세요.",
            },
        )

    try:
        target = (
            await db.execute(
                sa.text(
                    "SELECT role::text AS role, email FROM users "
                    "WHERE id = CAST(:id AS uuid) LIMIT 1"
                ),
                {"id": target_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        target = None
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "user_not_found", "message": "대상 사용자를 찾을 수 없습니다."},
        )
    if target.role != "operator":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "not_operator", "message": "운영자 계정만 처리할 수 있습니다."},
        )

    new_status = "suspended" if mode == "deactivate" else "withdrawn"
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                UPDATE users
                SET status = CAST(:st AS user_status),
                    is_active = false,
                    updated_at = :now
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"st": new_status, "id": target_id, "now": now},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("deactivate_operator_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "operator_deactivate_failed", "message": "운영자 처리 실패"},
        ) from exc

    purge_after = (
        (now + _dt.timedelta(days=_OPERATOR_RETENTION_DAYS)).date().isoformat()
        if mode == "delete"
        else None
    )
    return {
        "id": target_id,
        "status": new_status,
        "mode": mode,
        "purge_after": purge_after,
        "message": (
            "운영자 계정을 탈퇴 처리했습니다. 90일 후 데이터가 완전히 파기됩니다."
            if mode == "delete"
            else "운영자 계정을 비활성화했습니다."
        ),
    }
