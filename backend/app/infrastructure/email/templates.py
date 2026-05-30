"""USCP V2 — 이메일 본문 템플릿 레지스트리 (M09-09).

설계 근거:
  - feature-spec §M09-09 (이메일 본문 템플릿)
  - design.md §5.5 6단계 ↔ 알림 매핑
  - design.md §8.4 "광고성 정보 X" → 마케팅 발송 없음

본 모듈은 의미 있는 템플릿 ID 와 Jinja2 환경을 정의.
실제 발송은 `smtp_client.send_now()` 또는 `queue.notify()` 가 담당.

기존 `backend/app/templates/email/` 의 V1 템플릿 (password_reset.html 등)을
그대로 사용. V2 신규 템플릿은 본 디렉터리 하위에 점진 추가.
"""
from __future__ import annotations

from pathlib import Path
from typing import Final, Literal

from jinja2 import Environment, FileSystemLoader, select_autoescape

# V1 호환 — 기존 templates/email 에 password_reset.html 가 있으므로 재활용
_V1_TEMPLATES_DIR = (
    Path(__file__).resolve().parents[2] / "templates" / "email"
)
# V2 신규 템플릿은 본 디렉터리 옆 templates/ 에 추가 예정
_V2_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"

# 6단계 워크플로우 + 인증·계정 알림 ID
TemplateId = Literal[
    # 인증·계정 (M01)
    "verify_email",
    "password_reset",
    "password_changed",
    "reconsent_required",
    "account_locked",
    # 의제 6단계 (M02 · §5.5)
    "notify_new_issue",        # reported → 운영자
    "notify_under_review",     # reviewing → 제보자
    "notify_published",        # published → 제보자 + 운영자
    "notify_mentor_matched",   # mentor_assigned → 제보자 + 멘토 + 학생팀
    "notify_in_progress",      # in_progress → 제보자 + 매칭 멘토단
    "notify_resolved",         # resolved → 제보자 + 매칭 멘토단
    "notify_rejected",         # rejected → 제보자
    # MOU 만료 (M05-04)
    "mou_expiring",
    # 약관 개정 (M07-12)
    "terms_updated",
]


# 템플릿 ID → 파일명 매핑.
# V1 잔재 템플릿 (password_reset 등) 은 .html 그대로 사용.
TEMPLATE_REGISTRY: Final[dict[TemplateId, str]] = {
    "verify_email": "verify_email.html",
    "password_reset": "password_reset.html",
    "password_changed": "password_changed.html",
    "reconsent_required": "reconsent_required.html",
    "account_locked": "account_locked.html",
    "notify_new_issue": "notify_new_issue.html",
    "notify_under_review": "notify_under_review.html",
    "notify_published": "notify_published.html",
    "notify_mentor_matched": "notify_mentor_matched.html",
    "notify_in_progress": "notify_in_progress.html",
    "notify_resolved": "notify_resolved.html",
    "notify_rejected": "notify_rejected.html",
    "mou_expiring": "mou_expiring.html",
    "terms_updated": "terms_updated.html",
}


_env = Environment(
    loader=FileSystemLoader(
        [str(_V2_TEMPLATES_DIR), str(_V1_TEMPLATES_DIR)],
    ),
    autoescape=select_autoescape(["html", "htm"]),
    keep_trailing_newline=True,
)


def render(template_id: TemplateId, context: dict[str, object]) -> str:
    """Jinja2 템플릿 → HTML 본문 반환.

    템플릿 미존재 시 기본 fallback 템플릿(brand + 본문 텍스트) 사용 — 발송 중단 방지.
    """
    filename = TEMPLATE_REGISTRY.get(template_id)
    if not filename:
        return _fallback(template_id, context)
    try:
        template = _env.get_template(filename)
    except Exception:  # noqa: BLE001 — Jinja TemplateNotFound 등
        return _fallback(template_id, context)
    return template.render(**context)


def _fallback(template_id: str, context: dict[str, object]) -> str:
    """템플릿 누락 시 안전 fallback (design.md M09-09 유의사항)."""
    body = context.get("body") or context.get("message") or template_id
    title = context.get("title") or template_id
    return (
        "<!doctype html><html lang='ko'><head><meta charset='utf-8'>"
        f"<title>{title}</title></head><body style='font-family:Pretendard,sans-serif;color:#0F172A'>"
        "<div style='max-width:600px;margin:24px auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px'>"
        "<h1 style='color:#1E40AF;margin:0 0 12px'>USCP</h1>"
        f"<div>{body}</div>"
        "<hr style='border:0;border-top:1px solid #e5e7eb;margin:24px 0'>"
        "<p style='font-size:12px;color:#64748B'>본 메일은 USCP 시스템에서 자동 발송되었습니다.</p>"
        "</div></body></html>"
    )
