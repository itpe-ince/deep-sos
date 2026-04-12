"""Redis 캐시 헬퍼 — Sprint 5 Day 6.

단순 key-value 캐시 + 패턴 기반 무효화.
`@cached` 데코레이터로 FastAPI 라우터 함수에 투명 적용.

사용 예:
    @router.get("/admin/kpi/summary")
    @cached("kpi:summary", ttl=300)
    async def kpi_summary(...): ...

캐시 키 전략:
- 고정 prefix + (선택) args 해시
- 쓰기 엔드포인트는 `invalidate(pattern)` 명시 호출
"""
from __future__ import annotations

import functools
import hashlib
import json
import logging
from typing import Any, Awaitable, Callable, TypeVar

from app.core.rate_limit import get_redis

_logger = logging.getLogger(__name__)
_CACHE_PREFIX = "cache:"

T = TypeVar("T")


def _serialize(value: Any) -> str:
    return json.dumps(value, default=str, ensure_ascii=False)


def _deserialize(raw: str) -> Any:
    return json.loads(raw)


def _make_key(base: str, *, extra: dict[str, Any] | None = None) -> str:
    key = f"{_CACHE_PREFIX}{base}"
    if extra:
        blob = json.dumps(extra, sort_keys=True, default=str)
        digest = hashlib.md5(blob.encode()).hexdigest()[:8]
        key = f"{key}:{digest}"
    return key


async def cache_get(key: str) -> Any | None:
    try:
        raw = await get_redis().get(key)
        return _deserialize(raw) if raw else None
    except Exception as exc:  # noqa: BLE001
        _logger.warning("cache_get failed: %s", exc)
        return None


async def cache_set(key: str, value: Any, ttl: int) -> None:
    try:
        await get_redis().setex(key, ttl, _serialize(value))
    except Exception as exc:  # noqa: BLE001
        _logger.warning("cache_set failed: %s", exc)


async def invalidate(pattern: str) -> int:
    """패턴 매칭 키 일괄 삭제. 전체 prefix는 자동 부착."""
    full = f"{_CACHE_PREFIX}{pattern}"
    redis = get_redis()
    deleted = 0
    try:
        async for key in redis.scan_iter(match=full):
            await redis.delete(key)
            deleted += 1
    except Exception as exc:  # noqa: BLE001
        _logger.warning("cache invalidate(%s) failed: %s", pattern, exc)
    return deleted


def cached(
    key_base: str,
    *,
    ttl: int,
    vary_on: list[str] | None = None,
):
    """FastAPI 라우터 함수 캐싱 데코레이터.

    - `key_base`: 캐시 키 접두사 (예: "kpi:summary")
    - `ttl`: 초 단위 유효기간
    - `vary_on`: 캐시 키에 포함할 kwargs 이름 리스트 (예: ["slug", "page"])
    """

    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            extra = None
            if vary_on:
                extra = {name: kwargs.get(name) for name in vary_on}
            key = _make_key(key_base, extra=extra)

            cached_value = await cache_get(key)
            if cached_value is not None:
                return cached_value  # type: ignore[return-value]

            result = await func(*args, **kwargs)

            # Pydantic / SQLAlchemy 객체는 JSON 직렬화가 안 되므로
            # dict로 이미 변환된 엔드포인트에서만 사용.
            try:
                await cache_set(key, result, ttl)
            except (TypeError, ValueError) as exc:
                _logger.warning("cache serialize failed for %s: %s", key_base, exc)

            return result

        return wrapper

    return decorator
