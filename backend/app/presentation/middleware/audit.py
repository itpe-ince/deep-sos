"""Audit Middleware — write 요청과 인증 이벤트를 audit_logs 테이블에 기록.

설계 근거: docs/02-design/features/uscp-v2.design.md §6.3, §8.4, M08-04~07

- Write 동사 (POST/PATCH/PUT/DELETE) + 인증 이벤트 (/auth/login, /auth/logout) 만 기록
  → 단순 GET 은 기록하지 않아 부하 최소화 (M08-07: 단순 조회 미기록 정책)
- 응답 status 가 4xx/5xx 인 경우에도 시도 자체는 기록 (M08-04 로그인 실패 기록 의무)
- 비동기 큐 + 백그라운드 task 로 응답 지연 0
- audit_logs 테이블이 아직 신설 전 (0010 마이그레이션 미적용) 인 경우 silent skip
"""
from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass

import sqlalchemy as sa
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger

logger = get_logger(__name__)


# (path 패턴, action 값, target_type)
AUDIT_RULES: tuple[tuple[re.Pattern[str], str, str], ...] = (
    (re.compile(r"^/api/v1/auth/login$"), "login", "user"),
    (re.compile(r"^/api/v1/auth/logout$"), "logout", "user"),
    (re.compile(r"^/api/v1/admin/issues/.+/transition$"), "stage_change", "issue"),
    (re.compile(r"^/api/v1/admin/issues/.+/reject$"), "stage_change", "issue"),
    (re.compile(r"^/api/v1/admin/issues/.+/resolve-by-comment$"), "stage_change", "issue"),
    (re.compile(r"^/api/v1/admin/users/.+$"), "view_pii", "user"),
    # M07-10/11/12 약관 발행 — design.md §6.3 audit 보강
    (re.compile(r"^/api/v1/admin/cms/terms$"), "create", "terms_version"),
)

DEFAULT_WRITE_METHODS = frozenset({"POST", "PATCH", "PUT", "DELETE"})


@dataclass(frozen=True)
class AuditEntry:
    actor_id: str | None
    action: str
    target_type: str | None
    target_id: str | None
    ip: str | None
    user_agent: str | None
    path: str
    method: str
    status_code: int


class AuditMiddleware(BaseHTTPMiddleware):
    """Write 요청·인증 이벤트의 감사 로그 작성."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        action, target_type = self._classify(request)
        if action is None:
            return response

        entry = AuditEntry(
            actor_id=getattr(request.state, "user_id", None),
            action=action,
            target_type=target_type,
            target_id=self._extract_target_id(request.url.path),
            ip=self._client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            path=str(request.url.path),
            method=request.method,
            status_code=response.status_code,
        )

        # 응답을 차단하지 않도록 fire-and-forget
        asyncio.create_task(self._write(entry))
        return response

    def _classify(self, request: Request) -> tuple[str | None, str | None]:
        path = request.url.path
        for pattern, action, target_type in AUDIT_RULES:
            if pattern.match(path):
                return action, target_type
        if request.method.upper() not in DEFAULT_WRITE_METHODS:
            return None, None
        # write 분류 (POST→create, PATCH/PUT→update, DELETE→delete)
        method_action = {
            "POST": "create",
            "PATCH": "update",
            "PUT": "update",
            "DELETE": "delete",
        }
        return method_action.get(request.method.upper()), self._guess_target(path)

    @staticmethod
    def _guess_target(path: str) -> str | None:
        # /api/v1/<segment>/...
        parts = path.strip("/").split("/")
        if len(parts) >= 3 and parts[0] == "api":
            # parts[2] 가 도메인 (issues, users, projects ...)
            return parts[2].rstrip("s") or None
        return None

    @staticmethod
    def _extract_target_id(path: str) -> str | None:
        """경로 마지막 UUID-like 또는 숫자 토큰 추출."""
        parts = path.strip("/").split("/")
        uuid_re = re.compile(r"^[0-9a-f-]{8,}$", re.IGNORECASE)
        for token in reversed(parts):
            if uuid_re.match(token):
                return token
            if token.isdigit():
                return token
        return None

    @staticmethod
    def _client_ip(request: Request) -> str | None:
        fwd = request.headers.get("X-Forwarded-For", "").split(",")
        if fwd and fwd[0].strip():
            return fwd[0].strip()
        client = request.client
        return client.host if client else None

    @staticmethod
    async def _write(entry: AuditEntry) -> None:
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    sa.text(
                        """
                        INSERT INTO audit_logs
                            (actor_id, action, target_type, target_id, ip, user_agent, metadata)
                        VALUES
                            (
                                CAST(:actor_id AS uuid),
                                CAST(:action AS audit_action),
                                :target_type,
                                CAST(NULLIF(:target_id, '') AS uuid),
                                :ip,
                                :user_agent,
                                jsonb_build_object(
                                    'path', :path,
                                    'method', :method,
                                    'status_code', :status_code
                                )
                            )
                        """
                    ),
                    {
                        "actor_id": entry.actor_id,
                        "action": entry.action,
                        "target_type": entry.target_type,
                        "target_id": entry.target_id or "",
                        "ip": entry.ip,
                        "user_agent": entry.user_agent,
                        "path": entry.path,
                        "method": entry.method,
                        "status_code": entry.status_code,
                    },
                )
                await session.commit()
        except Exception as exc:  # noqa: BLE001
            # 테이블 미존재 (0010 마이그레이션 전) 또는 target_id 가 UUID 가 아닌 경우 등
            logger.debug("audit_write_skipped", error=str(exc), path=entry.path)
