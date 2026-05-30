"""Reconsent Check Middleware — 약관 신 버전 미동의 회원 차단.

설계 근거: docs/02-design/features/uscp-v2.design.md §6.3, M07-14

흐름:
  1. 인증된 사용자 (request.state.user_id 가 있는 요청) 만 검사
  2. user_id 조회 → users.terms_version_id 와 최신 require_reconsent=True terms_versions 비교
  3. 사용자 동의 버전이 최신 require_reconsent 버전보다 낮으면 409 반환
  4. 예외 경로 (/auth/reconsent, /auth/logout, /auth/me 등) 는 통과
  5. DB 조회 부하 최소화: 60초 캐시 (in-memory dict) — 약관 발행 빈도 낮음

응답: 409 Conflict + needs_reconsent={kind, version, change_summary}
"""
from __future__ import annotations

import re
import time
from typing import Iterable

import sqlalchemy as sa
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.database import AsyncSessionLocal


# 토큰 보유자라도 본 검사를 우회해야 하는 경로
DEFAULT_BYPASS_PATHS: tuple[str, ...] = (
    r"^/api/v1/auth/reconsent.*$",
    r"^/api/v1/auth/logout$",
    r"^/api/v1/auth/me$",
    r"^/api/v1/users/me$",
    r"^/api/v1/terms/.*$",
    r"^/api/v1/common/health$",
    r"^/api/v1/health$",
    r"^/$",
)

_CACHE_TTL_SECONDS = 60


class ReconsentCheckMiddleware(BaseHTTPMiddleware):
    """약관 재동의 필요 여부를 인증된 요청마다 확인."""

    def __init__(self, app, bypass_paths: Iterable[str] | None = None):
        super().__init__(app)
        patterns = tuple(bypass_paths) if bypass_paths else DEFAULT_BYPASS_PATHS
        self._bypass_regex = re.compile("|".join(f"(?:{p})" for p in patterns))
        # cache: {kind: (version_id, version_str, fetched_at)}
        self._latest_required: dict[str, tuple[str, str, float]] = {}

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        user_id = getattr(request.state, "user_id", None)
        if not user_id or self._bypass_regex.match(request.url.path):
            return await call_next(request)

        try:
            mismatch = await self._check_user(user_id)
        except Exception:  # noqa: BLE001
            # 약관 테이블이 아직 0010 마이그레이션 전 상태일 수 있음 → 검사 생략
            return await call_next(request)

        if mismatch is None:
            return await call_next(request)

        return JSONResponse(
            status_code=409,
            content={
                "type": "urn:uscp:problem:needs_reconsent",
                "title": "Reconsent Required",
                "status": 409,
                "detail": "약관이 개정되어 재동의가 필요합니다.",
                "instance": str(request.url.path),
                "needs_reconsent": {
                    "kind": mismatch["kind"],
                    "version": mismatch["version"],
                    "version_id": mismatch["version_id"],
                },
            },
            media_type="application/problem+json",
        )

    async def _check_user(self, user_id: str) -> dict[str, str] | None:
        latest = await self._latest_require_reconsent()
        if not latest:
            return None

        # 사용자 가장 최근 동의 버전 ID
        async with AsyncSessionLocal() as session:
            row = await session.execute(
                sa.text(
                    """
                    SELECT u.terms_version_id::text AS terms_version_id,
                           tv.kind::text AS kind
                    FROM users u
                    LEFT JOIN terms_versions tv ON tv.id = u.terms_version_id
                    WHERE u.id = :uid
                    """
                ),
                {"uid": user_id},
            )
            user_row = row.first()

        if user_row is None:
            return None
        user_version_id = user_row.terms_version_id

        for kind, info in latest.items():
            required_id, required_version, _ = info
            if user_version_id == required_id:
                continue
            return {
                "kind": kind,
                "version": required_version,
                "version_id": required_id,
            }
        return None

    async def _latest_require_reconsent(
        self,
    ) -> dict[str, tuple[str, str, float]]:
        now = time.time()
        fresh = {
            k: v
            for k, v in self._latest_required.items()
            if now - v[2] < _CACHE_TTL_SECONDS
        }
        if fresh:
            return fresh

        async with AsyncSessionLocal() as session:
            rows = await session.execute(
                sa.text(
                    """
                    SELECT DISTINCT ON (kind)
                        id::text AS id, kind::text AS kind, version
                    FROM terms_versions
                    WHERE require_reconsent = true
                      AND effective_at <= now()
                    ORDER BY kind, effective_at DESC
                    """
                )
            )
            result: dict[str, tuple[str, str, float]] = {}
            for r in rows:
                result[r.kind] = (r.id, r.version, now)

        self._latest_required = result
        return result
