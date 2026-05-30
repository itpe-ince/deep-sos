"""Global Rate Limit Middleware — IP/사용자 기반 60req/min, 로그인은 5req/min.

설계 근거: docs/02-design/features/uscp-v2.design.md §6.3, §8.2

- 글로벌 기본: 60 req / 60 sec / subject
- 로그인 (POST /api/v1/auth/login): 5 req / 60 sec / IP
- subject 우선순위: state.user_id > X-Forwarded-For 첫 토큰 > client.host
- Redis 미가용 시 fail-open (로그만 남기고 통과)
- 기존 ``app.core.rate_limit.RateLimiter`` 와 동일한 Redis 키 패턴 사용
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass

from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.rate_limit import get_redis


@dataclass(frozen=True)
class RateLimitRule:
    """매칭 패턴과 한도."""

    pattern: re.Pattern[str]
    methods: frozenset[str]
    max_requests: int
    window_seconds: int
    key_prefix: str


# 좁은 규칙부터 평가 (login 강제, 그 외 글로벌)
DEFAULT_RULES: tuple[RateLimitRule, ...] = (
    RateLimitRule(
        pattern=re.compile(r"^/api/v1/auth/(login|password/reset-request)$"),
        methods=frozenset({"POST"}),
        max_requests=5,
        window_seconds=60,
        key_prefix="login",
    ),
    RateLimitRule(
        pattern=re.compile(r"^/api/v1/.*$"),
        methods=frozenset({"GET", "POST", "PATCH", "PUT", "DELETE"}),
        max_requests=60,
        window_seconds=60,
        key_prefix="global",
    ),
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """글로벌 rate limit. Redis 의존."""

    def __init__(self, app, rules: tuple[RateLimitRule, ...] = DEFAULT_RULES):
        super().__init__(app)
        self._rules = rules

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        rule = self._match_rule(request)
        if rule is None:
            return await call_next(request)

        subject = self._subject(request)
        try:
            current, retry_after = await self._increment(
                rule, subject, request.url.path
            )
        except Exception:  # noqa: BLE001
            # Redis 장애 시 fail-open
            return await call_next(request)

        if current > rule.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "type": "urn:uscp:problem:rate_limited",
                    "title": "Too Many Requests",
                    "status": 429,
                    "detail": (
                        f"{rule.window_seconds}초 동안 {rule.max_requests}회를 초과했습니다."
                    ),
                    "instance": str(request.url.path),
                },
                headers={"Retry-After": str(retry_after)},
                media_type="application/problem+json",
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(rule.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, rule.max_requests - current)
        )
        response.headers["X-RateLimit-Window"] = str(rule.window_seconds)
        return response

    def _match_rule(self, request: Request) -> RateLimitRule | None:
        for rule in self._rules:
            if request.method.upper() not in rule.methods:
                continue
            if rule.pattern.match(request.url.path):
                return rule
        return None

    @staticmethod
    def _subject(request: Request) -> str:
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"u:{user_id}"
        fwd = request.headers.get("X-Forwarded-For", "").split(",")
        if fwd and fwd[0].strip():
            return f"ip:{fwd[0].strip()}"
        client = request.client
        return f"ip:{client.host if client else 'unknown'}"

    @staticmethod
    async def _increment(
        rule: RateLimitRule, subject: str, path: str
    ) -> tuple[int, int]:
        """Redis 버킷 INCR. 반환: (현재 카운트, 다음 윈도우까지 남은 초)."""
        redis: Redis = get_redis()
        now = int(time.time())
        bucket = now // rule.window_seconds
        key = f"rl:{rule.key_prefix}:{subject}:{bucket}"
        pipe = redis.pipeline()
        pipe.incr(key, 1)
        pipe.expire(key, rule.window_seconds + 1)
        results = await pipe.execute()
        current = int(results[0])
        retry_after = rule.window_seconds - (now % rule.window_seconds)
        # path 는 향후 디버깅용 — 키에는 미포함 (subject 단위 글로벌)
        _ = path
        return current, retry_after
