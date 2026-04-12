"""JWT 블랙리스트 — Sprint 3 Day 8.

Redis SETEX로 로그아웃된 토큰의 `jti`를 기록하고, 검증 시 조회.
TTL은 토큰 잔여 만료 시간으로 설정하여 자동 청소.
"""
from __future__ import annotations

from app.core.rate_limit import get_redis

_PREFIX = "jwt_blacklist:"


async def blacklist_jti(jti: str, ttl_seconds: int) -> None:
    if ttl_seconds <= 0:
        return
    redis = get_redis()
    await redis.setex(f"{_PREFIX}{jti}", ttl_seconds, "1")


async def is_jti_blacklisted(jti: str) -> bool:
    if not jti:
        return False
    redis = get_redis()
    return bool(await redis.exists(f"{_PREFIX}{jti}"))
