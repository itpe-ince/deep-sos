"""JWT Auth Middleware — Bearer 토큰 → request.state.user_id / .role.

설계 근거: docs/02-design/features/uscp-v2.design.md §6.3

- 토큰 검증은 본 미들웨어에서 한 번만 수행.
- 라우터의 ``Depends(get_current_user)`` 가 본 미들웨어가 채운 state 를 우선 활용.
- 공개 경로 (allowlist) 는 토큰 없어도 통과. 토큰이 있으면 검증 후 state 채움.
- 토큰 위변조·만료는 401 Problem Details 응답 (라우터까지 전달하지 않음).
"""
from __future__ import annotations

import re
from typing import Iterable

from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.security import decode_token


# 토큰 미보유로도 통과 가능한 경로 (정규식)
DEFAULT_PUBLIC_PATHS: tuple[str, ...] = (
    r"^/$",
    r"^/api/v1/docs$",
    r"^/api/v1/redoc$",
    r"^/api/v1/openapi\.json$",
    r"^/api/v1/auth/login$",
    r"^/api/v1/auth/signup$",
    r"^/api/v1/auth/register$",
    r"^/api/v1/auth/refresh$",
    r"^/api/v1/auth/password/reset.*$",
    r"^/api/v1/auth/email/verify$",
    r"^/api/v1/auth/oauth/.*$",
    r"^/api/v1/common/health$",
    r"^/api/v1/health$",
    # 공개 조회 GET — 미들웨어는 method 까지 못 보므로 라우터에서 RBAC 처리
    r"^/api/v1/issues(/.*)?$",
    r"^/api/v1/projects(/.*)?$",
    r"^/api/v1/success-cases(/.*)?$",
    r"^/api/v1/network/.*$",
    r"^/api/v1/performance$",
    r"^/api/v1/contents(/.*)?$",
    r"^/api/v1/resources(/.*)?$",
    r"^/api/v1/terms/.*$",
    r"^/api/v1/common/.*$",
)


class JwtAuthMiddleware(BaseHTTPMiddleware):
    """Bearer 토큰 추출·검증 → request.state 에 user_id, role, jti 적재."""

    def __init__(self, app, public_paths: Iterable[str] | None = None):
        super().__init__(app)
        patterns = tuple(public_paths) if public_paths else DEFAULT_PUBLIC_PATHS
        self._public_regex = re.compile("|".join(f"(?:{p})" for p in patterns))

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # 기본 state 초기화
        request.state.user_id = None
        request.state.user_role = None
        request.state.token_jti = None

        auth_header = request.headers.get("Authorization", "")
        is_public = bool(self._public_regex.match(request.url.path))

        token = self._extract_bearer(auth_header)

        if token is None:
            if is_public or request.method == "OPTIONS":
                return await call_next(request)
            # 비공개 경로 + 토큰 없음 → 라우터의 Depends 가 401 처리
            return await call_next(request)

        try:
            payload = decode_token(token)
        except JWTError as exc:
            return self._unauthorized(
                "invalid_token", f"JWT 검증 실패: {exc}", request
            )

        request.state.user_id = payload.get("sub")
        request.state.user_role = payload.get("role")
        request.state.token_jti = payload.get("jti")

        return await call_next(request)

    @staticmethod
    def _extract_bearer(header: str) -> str | None:
        if not header:
            return None
        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        return parts[1].strip() or None

    @staticmethod
    def _unauthorized(code: str, detail: str, request: Request) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            content={
                "type": f"urn:uscp:problem:{code}",
                "title": "Unauthorized",
                "status": 401,
                "detail": detail,
                "instance": str(request.url.path),
            },
            media_type="application/problem+json",
        )
