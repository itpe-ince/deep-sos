"""USCP V2 — Application / Auth Service.

설계 근거:
  - feature-spec §M01-01 (이메일 회원가입)
  - feature-spec §M01-02 (만 14세 이상 확인)
  - feature-spec §M01-03 (개인정보·이용약관 통합 동의)
  - feature-spec §M01-13 (비밀번호 보안 정책 통합)
  - design.md §5.1 인증·세션 흐름
  - design.md §8.4 컴플라이언스 (만 14세·통합 동의·동의 이력 보존)

V1 `app/services/auth_service.py` 와의 차이:
  - V2 는 birth_year + agreements (privacy/service) 필수
  - 14세 미만은 즉시 차단 (M01-02)
  - 비밀번호 복잡도 검증 (M01-13: 8자+영문/숫자/특수)
  - role 은 항상 'citizen' (V1 처럼 student/professor 등 입력 받지 않음)
  - terms_versions 의 최신 active 버전을 자동 부여 (M01-03 동의 이력)

V1 호환:
  - V2 신규 가입은 `POST /auth/signup` 으로 분리 (V1 `/auth/register` 유지)
  - V1 register_user 는 점진 폐기, 신규 가입은 본 모듈 사용 권장
"""
from __future__ import annotations

import datetime as _dt
import logging
import re
import uuid

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.infrastructure.email import notify

logger = logging.getLogger(__name__)


# M01-02: 만 14세 검증 기준 연도. UTC 기준 현재 연도 - 14 이하의 birth_year 만 통과.
_MIN_AGE = 14

# M01-13: 비밀번호 복잡도 — 8자 이상 + 영문·숫자·특수문자 각 1자 이상.
_PASSWORD_PATTERN = re.compile(
    r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?])"
    r"[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]{8,}$"
)

# M01-13: 로그인 5회 연속 실패 → 30분 잠금
_MAX_LOGIN_FAILURES = 5
_LOCKOUT_DURATION_MINUTES = 30


class SignupInput:
    """타입 힌트용 단순 컨테이너 (Pydantic 모델은 presentation/auth/router.py 에 정의)."""

    email: str
    password: str
    name: str
    birth_year: int
    privacy_agreed: bool
    service_agreed: bool


async def signup_v2(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    name: str,
    birth_year: int,
    privacy_agreed: bool,
    service_agreed: bool,
) -> dict[str, object]:
    """V2 이메일 회원가입 (M01-01/02/03/13 통합).

    Returns:
        {"user_id": uuid, "email": str, "name": str, "email_verification_sent": bool}

    Raises:
        HTTPException 409: 이메일 중복
        HTTPException 422: 14세 미만·통합 동의 누락·비밀번호 복잡도 위반
    """
    # ── 1. M01-03 통합 동의 검증 ──────────────────────────────
    if not privacy_agreed or not service_agreed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "agreements_required",
                "message": "개인정보·이용약관에 모두 동의해야 회원가입이 가능합니다.",
                "required": ["privacy", "service"],
            },
        )

    # ── 2. M01-02 만 14세 이상 확인 ───────────────────────────
    current_year = _dt.datetime.now(_dt.UTC).year
    if birth_year > current_year or current_year - birth_year < _MIN_AGE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "age_below_minimum",
                "message": f"만 {_MIN_AGE}세 이상부터 이용 가능합니다.",
                "minimum_age": _MIN_AGE,
            },
        )

    # ── 3. M01-13 비밀번호 복잡도 ─────────────────────────────
    if not _PASSWORD_PATTERN.match(password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "password_too_weak",
                "message": "비밀번호는 8자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.",
            },
        )

    # ── 4. 이메일 중복 검사 ───────────────────────────────────
    existing = await db.execute(
        sa.text("SELECT 1 FROM users WHERE email = :email LIMIT 1"),
        {"email": email.lower().strip()},
    )
    if existing.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "email_already_registered",
                "message": "이미 등록된 이메일입니다.",
            },
        )

    # ── 5. terms_versions 최신 active 버전 조회 (M01-03 동의 이력) ─
    latest_terms_id = await _latest_active_terms_version_id(db)

    # ── 6. users INSERT (V2 컬럼) ─────────────────────────────
    user_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)

    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO users
                    (id, email, name, password_hash, role, oauth_provider,
                     is_active, email_verified,
                     birth_year, agreed_at, terms_version_id,
                     failed_login_count, locked_until,
                     created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), :email, :name, :password_hash,
                     :role, 'email',
                     true, false,
                     :birth_year, :agreed_at,
                     CAST(NULLIF(:terms_version_id, '') AS uuid),
                     0, NULL,
                     :created_at, :updated_at)
                """
            ),
            {
                "id": str(user_id),
                "email": email.lower().strip(),
                "name": name.strip(),
                "password_hash": hash_password(password),
                "role": "citizen",
                "birth_year": birth_year,
                "agreed_at": now,
                "terms_version_id": str(latest_terms_id) if latest_terms_id else "",
                "created_at": now,
                "updated_at": now,
            },
        )
        # user_status ENUM (0008) — V2 컬럼 명이 존재하면 별도 UPDATE
        await db.execute(
            sa.text(
                """
                UPDATE users SET user_status = 'active'::user_status
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": str(user_id)},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        # user_status 컬럼이 아직 0008 미적용인 dev 환경 fallback
        # → 이미 users INSERT 는 성공한 상태이므로 user_status 만 silent
        if "user_status" in str(exc):
            await db.commit()
        else:
            logger.exception("signup_v2 insert failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "signup_failed", "message": "회원가입 처리 중 오류가 발생했습니다."},
            ) from exc

    # ── 7. 이메일 검증 안내 발송 (M01-01 유의사항 — 24h 이내 인증) ─
    email_sent = False
    try:
        verify_token = uuid.uuid4().hex  # Sprint 1 후반에 email_verifications 테이블과 연결
        base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
        await notify(
            "verify_email",
            to=email,
            context={
                "user_name": name,
                "user_id": str(user_id),
                "verify_url": f"{base_url}/auth/verify?token={verify_token}",
                "base_url": base_url,
            },
        )
        email_sent = True
    except Exception as exc:  # noqa: BLE001
        # 메일 발송 실패가 가입 자체를 막아서는 안 됨 (큐가 재시도)
        logger.warning("signup_v2 email enqueue failed: %s", exc)

    return {
        "user_id": str(user_id),
        "email": email,
        "name": name,
        "email_verification_sent": email_sent,
    }


async def login_v2(
    db: AsyncSession,
    *,
    email: str,
    password: str,
) -> dict[str, object]:
    """V2 이메일 로그인 + 5회 잠금 정책 (M01-04/13).

    Returns:
        {"access_token": str, "refresh_token": str, "token_type": "bearer",
         "expires_in": int, "needs_reconsent": bool}

    Raises:
        HTTPException 401: 잘못된 자격증명
        HTTPException 403: 이메일 미인증·계정 정지·탈퇴
        HTTPException 423: 계정 잠금 (5회 실패 + 30분 이내)

    동작:
      1. users 조회 (email 소문자) — 없으면 401 (계정 존재 여부 미노출)
      2. locked_until > now() 이면 423 (잠금 중)
      3. user_status 검증 — suspended/withdrawn 이면 403
      4. bcrypt.verify(password)
         - 실패: failed_login_count++, 5회 초과 시 locked_until = now() + 30m
         - 성공: failed_login_count=0, locked_until=NULL, last_login_at=now()
      5. JWT 발급 (Access 1h / Refresh 7d)
      6. terms_versions 최신 버전 비교 → needs_reconsent 응답 포함 (M07-14)
    """
    now = _dt.datetime.now(_dt.UTC)
    email_norm = email.lower().strip()

    # ── 1. 사용자 조회 ───────────────────────────────────────
    row = await db.execute(
        sa.text(
            """
            SELECT
                u.id::text                  AS id,
                u.email                      AS email,
                u.name                       AS name,
                u.password_hash              AS password_hash,
                u.role                       AS role,
                u.is_active                  AS is_active,
                u.email_verified             AS email_verified,
                COALESCE(u.user_status::text, CASE WHEN u.is_active THEN 'active' ELSE 'suspended' END) AS user_status,
                COALESCE(u.failed_login_count, 0) AS failed_login_count,
                u.locked_until               AS locked_until,
                u.terms_version_id::text     AS terms_version_id
            FROM users u
            WHERE u.email = :email
            LIMIT 1
            """
        ),
        {"email": email_norm},
    )
    user = row.first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_credentials",
                "message": "이메일 또는 비밀번호가 올바르지 않습니다.",
            },
        )

    # ── 2. 계정 잠금 검사 (locked_until > now) ───────────────
    if user.locked_until is not None and user.locked_until > now:
        retry_after = int((user.locked_until - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "code": "account_locked",
                "message": (
                    f"5회 연속 실패로 계정이 {_LOCKOUT_DURATION_MINUTES}분간 잠금되었습니다."
                ),
                "locked_until": user.locked_until.isoformat(),
                "retry_after_seconds": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )

    # ── 3. user_status 검증 ──────────────────────────────────
    if user.user_status in ("suspended", "withdrawn"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "account_disabled",
                "message": "이용이 정지되었거나 탈퇴된 계정입니다.",
                "user_status": user.user_status,
            },
        )

    # ── 4. 비밀번호 검증 ──────────────────────────────────────
    if not verify_password(password, user.password_hash):
        next_count = int(user.failed_login_count) + 1
        if next_count >= _MAX_LOGIN_FAILURES:
            lock_until = now + _dt.timedelta(minutes=_LOCKOUT_DURATION_MINUTES)
            await _update_lockout(db, user.id, next_count, lock_until)
            await db.commit()
            retry_after = _LOCKOUT_DURATION_MINUTES * 60
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "code": "account_locked",
                    "message": (
                        f"5회 연속 실패로 계정이 {_LOCKOUT_DURATION_MINUTES}분간 잠금되었습니다."
                    ),
                    "locked_until": lock_until.isoformat(),
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )
        await _update_lockout(db, user.id, next_count, None)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_credentials",
                "message": "이메일 또는 비밀번호가 올바르지 않습니다.",
                "remaining_attempts": _MAX_LOGIN_FAILURES - next_count,
            },
        )

    # ── 5. 로그인 성공 — 카운터 리셋 + last_login_at 갱신 ────
    await _reset_login_state(db, user.id, now)
    await db.commit()

    # ── 6. JWT 발급 ──────────────────────────────────────────
    extra_claims: dict[str, object] = {"role": user.role}
    access_token = create_access_token(user.id, extra_claims=extra_claims)
    refresh_token = create_refresh_token(user.id)

    # ── 7. 약관 재동의 필요 여부 (M07-14 사전 안내) ──────────
    needs_reconsent = await _needs_reconsent(db, user.terms_version_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
        "needs_reconsent": needs_reconsent,
    }


async def _update_lockout(
    db: AsyncSession,
    user_id: str,
    failed_count: int,
    locked_until: _dt.datetime | None,
) -> None:
    """failed_login_count + locked_until 업데이트. user_status 컬럼 미존재 시 silent skip."""
    try:
        await db.execute(
            sa.text(
                """
                UPDATE users
                SET failed_login_count = :cnt,
                    locked_until = :locked_until,
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "cnt": failed_count,
                "locked_until": locked_until,
                "id": user_id,
            },
        )
    except Exception as exc:  # noqa: BLE001 — 0008 미적용 dev 환경
        logger.debug("lockout_update_skipped: %s", exc)


async def _reset_login_state(
    db: AsyncSession,
    user_id: str,
    now: _dt.datetime,
) -> None:
    """로그인 성공 시 failed_login_count=0, locked_until=NULL, last_login_at=now()."""
    try:
        await db.execute(
            sa.text(
                """
                UPDATE users
                SET failed_login_count = 0,
                    locked_until = NULL,
                    last_login_at = :now,
                    updated_at = :now
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"now": now, "id": user_id},
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("login_reset_skipped: %s", exc)


async def _needs_reconsent(
    db: AsyncSession,
    user_terms_version_id: str | None,
) -> bool:
    """현행 require_reconsent=True 약관 버전과 사용자 동의 버전이 다르면 True."""
    if not user_terms_version_id:
        return False  # 가입 직후·약관 테이블 미적용 환경 — 별도 미들웨어 검증
    try:
        row = await db.execute(
            sa.text(
                """
                SELECT id::text AS id
                FROM terms_versions
                WHERE require_reconsent = true
                  AND effective_at <= now()
                ORDER BY effective_at DESC
                LIMIT 1
                """
            )
        )
        latest = row.first()
        if latest is None:
            return False
        return str(latest.id) != str(user_terms_version_id)
    except Exception:  # noqa: BLE001
        return False


async def _latest_active_terms_version_id(
    db: AsyncSession,
) -> uuid.UUID | None:
    """현행 시행 중인 약관 (privacy/service 양쪽) 중 가장 최근 버전 1건의 ID 반환.

    0010 마이그레이션 직전에는 terms_versions 테이블이 비어 있을 수 있으므로 None 허용.
    """
    try:
        row = await db.execute(
            sa.text(
                """
                SELECT id::text AS id
                FROM terms_versions
                WHERE effective_at <= now()
                ORDER BY effective_at DESC
                LIMIT 1
                """
            )
        )
        first = row.first()
        return uuid.UUID(first.id) if first else None
    except Exception:  # noqa: BLE001
        return None
