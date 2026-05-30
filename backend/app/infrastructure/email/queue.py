"""USCP V2 — 이메일 발송 대기열 (M09-07).

설계 근거:
  - feature-spec §M09-07 (이메일 발송 대기열)
  - design.md §5.3 이메일 알림 큐 (Redis Stream + exp backoff + dead-letter)

큐 구조:
  email-queue (Redis Stream)
    { template_id, to, context_json, attempts, scheduled_at, dispatched_at? }

전략:
  - notify() — context_json 직렬화 후 XADD email-queue
  - 워커 (별도 프로세스 또는 gunicorn background task) 가 XREAD BLOCK 으로 수신
  - 실패 시 attempts+1 + exp backoff (1m, 5m, 30m, 2h, 12h)
  - max 5회 초과 시 dead-letter (email-queue-dead) 로 이동 + Sentry 알림

본 모듈은 enqueue/dequeue 의 최소 API 만 제공. 실제 워커 루프는
Sprint 1 후반 또는 Sprint 5 Pre-launch 에 별도 데몬으로 신설 예정.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Final

from redis.asyncio import Redis

from app.core.rate_limit import get_redis
from app.infrastructure.email.templates import TemplateId

logger = logging.getLogger(__name__)


STREAM_KEY: Final[str] = "email-queue"
DEAD_LETTER_KEY: Final[str] = "email-queue-dead"
MAX_ATTEMPTS: Final[int] = 5

# 재시도 간격 (초) — 1m, 5m, 30m, 2h, 12h
BACKOFF_SECONDS: Final[tuple[int, ...]] = (
    60,
    5 * 60,
    30 * 60,
    2 * 60 * 60,
    12 * 60 * 60,
)


@dataclass(frozen=True)
class EmailJob:
    """이메일 발송 작업 단위."""

    template_id: TemplateId
    to: str
    context: dict[str, object]
    attempts: int = 0
    scheduled_at: float = field(default_factory=lambda: time.time())
    subject: str | None = None


async def enqueue(job: EmailJob) -> str:
    """Redis Stream 에 작업 등록. 반환: stream entry ID."""
    redis: Redis = get_redis()
    fields = {
        "template_id": str(job.template_id),
        "to": job.to,
        "context": json.dumps(job.context, ensure_ascii=False),
        "attempts": str(job.attempts),
        "scheduled_at": str(job.scheduled_at),
        "subject": job.subject or "",
    }
    entry_id = await redis.xadd(STREAM_KEY, fields)
    logger.debug(
        "email.enqueue",
        extra={"entry_id": entry_id, "template": job.template_id, "to": job.to},
    )
    return entry_id


async def notify(
    template_id: TemplateId,
    to: str,
    context: dict[str, object],
    *,
    subject: str | None = None,
    scheduled_at: float | None = None,
) -> str:
    """일반 코드에서 이메일 알림 등록 시 사용하는 메인 진입점.

    사용 예 (Sprint 2 M02 게이트키핑 service)::

        from app.infrastructure.email import notify

        await notify(
            "notify_under_review",
            to=issue.reporter_email,
            context={
                "user_name": user.name,
                "issue_title": issue.title,
                "issue_id": str(issue.id),
                "base_url": settings.public_base_url,
            },
        )

    Redis 미가용 환경 (개발·테스트) 에서는 stdout 로그로 fallback.
    """
    try:
        return await enqueue(
            EmailJob(
                template_id=template_id,
                to=to,
                context=context,
                scheduled_at=scheduled_at or time.time(),
                subject=subject,
            )
        )
    except Exception as exc:  # noqa: BLE001 — Redis 장애 시 dev 모드 fallback
        logger.warning(
            "email.enqueue_failed template=%s to=%s err=%s",
            template_id,
            to,
            exc,
        )
        return ""


async def dead_letter(job: EmailJob, reason: str) -> str:
    """재시도 한도 초과 시 dead-letter 스트림으로 이동."""
    redis: Redis = get_redis()
    fields = {
        "template_id": str(job.template_id),
        "to": job.to,
        "context": json.dumps(job.context, ensure_ascii=False),
        "attempts": str(job.attempts),
        "scheduled_at": str(job.scheduled_at),
        "subject": job.subject or "",
        "reason": reason,
    }
    return await redis.xadd(DEAD_LETTER_KEY, fields)


def next_backoff_seconds(attempts: int) -> int:
    """이미 시도한 횟수 기준 다음 재시도 대기시간 (초)."""
    if attempts <= 0:
        return BACKOFF_SECONDS[0]
    idx = min(attempts - 1, len(BACKOFF_SECONDS) - 1)
    return BACKOFF_SECONDS[idx]
