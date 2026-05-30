"""USCP V2 — SMTP 클라이언트 (M09-08).

설계 근거:
  - feature-spec §M09-08 (SMTP 연동)
  - design.md §5.3 이메일 알림 큐 (재시도 정책 + dead-letter)
  - design.md §8.2 보안 (SMTP 인증 실패 즉시 알림)

V1 `app/core/mailer.py` 의 패턴을 보존하면서, V2 infrastructure layer
규약에 맞게 분리. 직접 호출은 테스트·즉시 발송용 `send_now()` 뿐이고,
운영 코드는 `queue.notify()` 만 사용해야 한다 (재시도·dead-letter 정책 적용).
"""
from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings
from app.infrastructure.email.templates import TemplateId, render

logger = logging.getLogger(__name__)


async def send_now(
    template_id: TemplateId,
    to: str,
    context: dict[str, object],
    *,
    subject: str | None = None,
    text_body: str | None = None,
) -> None:
    """큐 우회 즉시 발송.

    개발 모드 (MAIL_DEV_MODE=true 또는 SMTP_HOST 미설정) 시 stdout 로그만 출력.
    운영 모드 실패 시 aiosmtplib 예외를 그대로 호출자에 전파 (queue 가 재시도).
    """
    html_body = render(template_id, context)
    msg_subject = subject or _default_subject(template_id, context)

    if settings.mail_dev_mode or not settings.smtp_host:
        logger.warning(
            "[MAIL_DEV] template=%s to=%s subject=%s",
            template_id,
            to,
            msg_subject,
        )
        logger.debug("[MAIL_DEV body]\n%s", html_body[:500])
        return

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = msg_subject
    msg.set_content(
        text_body
        or "HTML 이메일을 지원하는 클라이언트에서 확인해 주세요.\n"
        "본 메일은 USCP 시스템에서 자동 발송되었습니다."
    )
    msg.add_alternative(html_body, subtype="html")

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        use_tls=settings.smtp_use_tls,
        start_tls=settings.smtp_start_tls,
        timeout=15,
    )


def _default_subject(template_id: TemplateId, context: dict[str, object]) -> str:
    """템플릿 ID 기반 기본 제목 (운영 코드가 subject 미지정 시 fallback)."""
    base = "USCP"
    titles: dict[str, str] = {
        "verify_email": f"{base} — 이메일 주소를 인증해 주세요",
        "password_reset": f"{base} — 비밀번호 재설정 안내",
        "password_changed": f"{base} — 비밀번호가 변경되었습니다",
        "reconsent_required": f"{base} — 약관 재동의가 필요합니다",
        "account_locked": f"{base} — 계정 잠금 안내",
        "notify_new_issue": f"{base} — 신규 지역문제 제보가 등록되었습니다",
        "notify_under_review": f"{base} — 제보하신 의제 검토가 시작되었습니다",
        "notify_published": f"{base} — 의제가 광장에 공개 등록되었습니다",
        "notify_mentor_matched": f"{base} — 멘토단·학생팀이 매칭되었습니다",
        "notify_in_progress": f"{base} — 의제 처리가 시작되었습니다",
        "notify_resolved": f"{base} — 의제가 해결완료되었습니다",
        "notify_rejected": f"{base} — 제보가 반려되었습니다",
        "mou_expiring": f"{base} — MOU 만료가 임박했습니다",
        "terms_updated": f"{base} — 약관이 개정되었습니다",
    }
    issue_title = context.get("issue_title")
    base_subject = titles.get(str(template_id), f"{base} — 알림")
    if issue_title:
        return f"{base_subject} · {issue_title}"
    return base_subject
