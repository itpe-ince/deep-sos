"""PDF 생성 서비스 — Sprint 5 Day 7.

Playwright headless Chromium으로 프론트엔드 `/portfolio/{user_id}?pdf=1`
페이지를 렌더하고 A4 PDF로 변환. 생성 시간이 길기 때문에 호출부는
FastAPI `BackgroundTasks`로 비동기 처리 권장.
"""
from __future__ import annotations

import logging
import uuid

from playwright.async_api import async_playwright

from app.core.config import settings
from app.core.storage import StorageError, upload_pdf

_logger = logging.getLogger(__name__)


async def render_portfolio_pdf(user_id: uuid.UUID) -> bytes:
    """Playwright로 포트폴리오 페이지 PDF 생성."""
    url = f"{settings.frontend_url}/portfolio/{user_id}?pdf=1"
    _logger.info("pdf render start: %s", url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            context = await browser.new_context(
                viewport={"width": 1024, "height": 1400},
                device_scale_factor=2,
            )
            page = await context.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30_000)
            # 하이드레이션 + API 페치 대기
            await page.wait_for_timeout(500)
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "16mm", "right": "12mm", "bottom": "16mm", "left": "12mm"},
            )
        finally:
            await browser.close()

    _logger.info("pdf render complete: %s bytes", len(pdf_bytes))
    return pdf_bytes


async def upload_portfolio_pdf(user_id: uuid.UUID) -> str:
    """포트폴리오 PDF 생성 + MinIO 업로드 → presigned URL 반환."""
    pdf_bytes = await render_portfolio_pdf(user_id)
    try:
        return upload_pdf(pdf_bytes, folder="portfolios")
    except StorageError as exc:
        _logger.error("pdf upload failed: %s", exc)
        raise
