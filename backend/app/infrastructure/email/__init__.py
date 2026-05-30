"""USCP V2 Infrastructure / email.

설계 근거:
  - feature-spec §M09-07 (이메일 발송 대기열)
  - feature-spec §M09-08 (SMTP 연동)
  - feature-spec §M09-09 (이메일 본문 템플릿)
  - design.md §5.3 이메일 알림 큐 + §5.5 6단계 ↔ 알림 매핑

Public API:
  - notify(template_id, to, context, scheduled_at=None)
      → 비동기 Redis Stream 큐에 등록 (M09-07)
  - render(template_id, context)
      → Jinja2 템플릿 → HTML 본문 (M09-09)
  - send_now(template_id, to, context)
      → 큐 우회 즉시 발송 (테스트·관리자 알림용)
"""
from app.infrastructure.email.queue import (
    EmailJob,
    enqueue,
    notify,
)
from app.infrastructure.email.smtp_client import send_now
from app.infrastructure.email.templates import (
    TEMPLATE_REGISTRY,
    TemplateId,
    render,
)

__all__ = [
    "EmailJob",
    "TemplateId",
    "TEMPLATE_REGISTRY",
    "enqueue",
    "notify",
    "render",
    "send_now",
]
