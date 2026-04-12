"""이메일 발송 헬퍼 — Sprint 3 Day 2.

운영: aiosmtplib (SMTP_HOST 설정 시)
개발: MAIL_DEV_MODE=true → stdout 로그만 출력
"""
from __future__ import annotations

import logging
from email.message import EmailMessage
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

_logger = logging.getLogger(__name__)

_templates_dir = Path(__file__).resolve().parent.parent / "templates" / "email"
_env = Environment(
    loader=FileSystemLoader(str(_templates_dir)),
    autoescape=select_autoescape(["html"]),
)


def _render(template_name: str, context: dict) -> str:
    template = _env.get_template(template_name)
    return template.render(**context)


async def send_email(
    to: str, subject: str, html_body: str, text_body: str | None = None
) -> None:
    """이메일 발송. dev mode 또는 SMTP_HOST 미설정 시 로그로 대체."""
    if settings.mail_dev_mode or not settings.smtp_host:
        _logger.warning(
            "[MAIL_DEV] to=%s subject=%s\n---\n%s\n---", to, subject, text_body or html_body
        )
        return

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text_body or "HTML 이메일을 지원하는 클라이언트에서 확인해주세요.")
    msg.add_alternative(html_body, subtype="html")

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        start_tls=settings.smtp_use_tls,
    )
    _logger.info("sent email to=%s subject=%s", to, subject)


async def send_password_reset_email(email: str, token: str) -> None:
    reset_url = f"{settings.frontend_url}/password/reset?token={token}"
    html = _render(
        "password_reset.html",
        {"reset_url": reset_url, "expires_minutes": 30},
    )
    text = (
        f"SOS랩 비밀번호 재설정\n\n"
        f"아래 링크를 클릭해 새 비밀번호를 설정해주세요. 30분간 유효합니다.\n\n"
        f"{reset_url}\n\n"
        f"본인이 요청하지 않았다면 이 메일을 무시해주세요."
    )
    await send_email(
        to=email,
        subject="[SOS랩] 비밀번호 재설정 안내",
        html_body=html,
        text_body=text,
    )
