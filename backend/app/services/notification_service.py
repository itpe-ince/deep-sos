"""알림 생성/발행 서비스 — Sprint 5 Day 8.

create_notification():
  1. DB에 Notification 저장
  2. Redis PUBLISH notif:{user_id} — SSE 구독자에게 실시간 전달
"""
from __future__ import annotations

import json
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import get_redis
from app.models.notification import Notification
from app.schemas.notification import NotificationRead

_logger = logging.getLogger(__name__)

_PUBSUB_PREFIX = "notif:"


async def create_notification(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str | None = None,
    link_url: str | None = None,
) -> Notification:
    """DB 저장 + Redis Pub/Sub 발행. 실패해도 상위 플로우 차단하지 않음."""
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link_url=link_url,
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)

    # Redis 발행 (best-effort)
    try:
        payload = NotificationRead.model_validate(notif).model_dump(mode="json")
        redis = get_redis()
        await redis.publish(f"{_PUBSUB_PREFIX}{user_id}", json.dumps(payload))
    except Exception as exc:  # noqa: BLE001
        _logger.warning("notification publish failed: %s", exc)

    return notif


def channel_for(user_id: uuid.UUID) -> str:
    return f"{_PUBSUB_PREFIX}{user_id}"
