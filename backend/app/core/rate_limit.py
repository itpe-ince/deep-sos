"""Redis 기반 Rate Limiter — Sprint 3 Day 1.

Sliding-bucket counter:
  key = rl:{endpoint}:{subject}:{now // window}
  전략: 시간 버킷 단위 INCR + EXPIRE. 경계 누출은 허용하되 구현 단순성과 O(1) 성능 우선.
"""
from __future__ import annotations

import time
from typing import Literal

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis, from_url

from app.core.config import settings

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = from_url(settings.redis_url, decode_responses=True)
    return _redis


class RateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def check(
        self, key: str, max_requests: int, window_seconds: int
    ) -> tuple[int, int]:
        """버킷 증가 → 초과 시 HTTPException 429 raise.

        Returns (current_count, retry_after_seconds). 초과 아닐 때만 호출자에 반환.
        """
        now = int(time.time())
        bucket = now // window_seconds
        bucket_key = f"rl:{key}:{bucket}"
        pipe = self.redis.pipeline()
        pipe.incr(bucket_key)
        pipe.expire(bucket_key, window_seconds)
        count, _ = await pipe.execute()
        count = int(count)
        if count > max_requests:
            retry = window_seconds - (now % window_seconds)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded ({max_requests}/{window_seconds}s). Retry after {retry}s",
                headers={"Retry-After": str(retry)},
            )
        return count, 0


KeyStrategy = Literal["user", "ip", "user_or_ip"]


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(
    *,
    max_requests: int,
    window_seconds: int,
    key_by: KeyStrategy = "user_or_ip",
    endpoint_key: str | None = None,
):
    """Rate limit dependency factory.

    사용 예:
        @router.post("", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=3600, key_by="user"))])

    key_by:
        - "user": JWT에서 user id. 미인증 시 401.
        - "ip": X-Forwarded-For 또는 client.host.
        - "user_or_ip": 로그인 시 user, 아니면 IP.
    """
    from app.api.v1.auth import get_current_user
    from app.core.security import decode_token
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

    bearer = HTTPBearer(auto_error=False)

    async def _subject(request: Request) -> str:
        creds: HTTPAuthorizationCredentials | None = await bearer(request)
        user_id: str | None = None
        if creds is not None:
            try:
                payload = decode_token(creds.credentials)
                if payload.get("type") == "access":
                    user_id = str(payload.get("sub"))
            except ValueError:
                user_id = None

        if key_by == "user":
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="authentication required",
                )
            return f"u:{user_id}"
        if key_by == "ip":
            return f"ip:{_client_ip(request)}"
        # user_or_ip
        return f"u:{user_id}" if user_id else f"ip:{_client_ip(request)}"

    async def _dep(request: Request) -> None:
        subject = await _subject(request)
        key = f"{endpoint_key or request.url.path}:{subject}"
        limiter = RateLimiter(get_redis())
        await limiter.check(key, max_requests, window_seconds)

    # get_current_user 미사용 경고 회피
    _ = get_current_user
    return _dep
