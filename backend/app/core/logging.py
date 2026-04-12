"""구조화 로깅 + request_id 미들웨어 — Sprint 5 Day 4.

- structlog: JSON 포맷 (운영) 또는 컬러 콘솔 (dev)
- request_id: ASGI middleware로 ContextVar에 주입 → 모든 로그 라인에 자동 포함
- uvicorn 로그도 structlog로 프록시
"""
from __future__ import annotations

import logging
import sys
import uuid
from contextvars import ContextVar

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def _add_request_id(_: object, __: str, event_dict: dict) -> dict:
    """Processor: ContextVar의 request_id를 로그에 주입."""
    event_dict["request_id"] = _request_id_ctx.get()
    return event_dict


def configure_logging() -> None:
    """앱 시작 시 1회 호출. structlog + stdlib logging 통합."""
    is_prod = settings.is_production
    log_level = logging.INFO if is_prod else logging.DEBUG

    # stdlib logging 기본 설정 (uvicorn 등이 사용)
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _add_request_id,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if is_prod:
        # 운영: JSON 1-라인 (Sentry/로그 수집기 호환)
        processors.append(structlog.processors.JSONRenderer())
    else:
        # 개발: 컬러 컨솔
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    return structlog.get_logger(name)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """각 요청에 고유 request_id를 할당하고 ContextVar에 저장.

    - 요청 헤더 `X-Request-ID`가 있으면 그대로 사용, 없으면 uuid4 생성
    - 응답 헤더에도 동일 값 설정 → 클라이언트/로그 상관관계 추적
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        token = _request_id_ctx.set(request_id)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            _request_id_ctx.reset(token)
