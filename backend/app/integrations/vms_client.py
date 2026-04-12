"""VMS / 1365 어댑터 — Sprint 4 Day 7.

환경변수 `VMS_MODE`:
- `mock` (기본): `MockVmsClient` 사용. 로그만 남기고 가짜 record_id 반환.
- `real`: `PortalVmsClient` (1365 Portal API). Sprint 5 이후 실연동.

봉사 완료 시 `PUT /volunteers/{id}/participations/{pid}`가 `status=completed`로
진입하면 `record_hours()` 호출. 실패 시 로그만 남기고 API 응답은 성공 유지
(best-effort; 외부 API 장애가 내부 플로우를 막지 않게).
"""
from __future__ import annotations

import logging
import uuid
from typing import Protocol

import httpx

from app.core.config import settings

_logger = logging.getLogger(__name__)


class VmsClient(Protocol):
    """VMS/1365 어댑터 인터페이스."""

    async def record_hours(
        self,
        user_id: uuid.UUID,
        activity_id: uuid.UUID,
        hours: float,
        *,
        user_email: str | None = None,
        activity_title: str | None = None,
    ) -> str:
        """활동 시간을 외부 시스템에 기록하고 reference id를 반환."""
        ...


class MockVmsClient:
    """개발/테스트용 Mock. 로그 출력 + 가짜 id 반환."""

    async def record_hours(
        self,
        user_id: uuid.UUID,
        activity_id: uuid.UUID,
        hours: float,
        *,
        user_email: str | None = None,
        activity_title: str | None = None,
    ) -> str:
        record_id = f"mock-{uuid.uuid4().hex[:12]}"
        _logger.warning(
            "[VMS_MOCK] recorded: user=%s activity=%s hours=%.1f title=%s → %s",
            user_email or user_id,
            activity_id,
            hours,
            activity_title or "-",
            record_id,
        )
        return record_id


class PortalVmsClient:
    """1365 Portal API 실 구현 (Sprint 5+ 예정).

    현재는 시그니처만 제공하고 구현 시점에 채운다.
    """

    def __init__(self, api_url: str, api_key: str) -> None:
        self.api_url = api_url
        self.api_key = api_key

    async def record_hours(
        self,
        user_id: uuid.UUID,
        activity_id: uuid.UUID,
        hours: float,
        *,
        user_email: str | None = None,
        activity_title: str | None = None,
    ) -> str:
        if not self.api_url or not self.api_key:
            raise RuntimeError("PortalVmsClient: api_url/api_key not configured")

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.api_url.rstrip('/')}/volunteer-records",
                json={
                    "user_id": str(user_id),
                    "activity_id": str(activity_id),
                    "hours": hours,
                    "user_email": user_email,
                    "activity_title": activity_title,
                },
                headers={"X-API-Key": self.api_key},
            )
            res.raise_for_status()
            data = res.json()
            return str(data.get("record_id") or "unknown")


_client_singleton: VmsClient | None = None


def get_vms_client() -> VmsClient:
    """싱글톤 팩토리. VMS_MODE 환경변수에 따라 Mock 또는 Real 인스턴스 반환."""
    global _client_singleton
    if _client_singleton is not None:
        return _client_singleton

    mode = (settings.vms_mode or "mock").lower()
    if mode == "real":
        _client_singleton = PortalVmsClient(
            api_url=settings.portal_1365_api_url,
            api_key=settings.portal_1365_api_key,
        )
    else:
        _client_singleton = MockVmsClient()
    return _client_singleton


async def safe_record_hours(
    user_id: uuid.UUID,
    activity_id: uuid.UUID,
    hours: float,
    *,
    user_email: str | None = None,
    activity_title: str | None = None,
) -> str | None:
    """best-effort wrapper — 실패 시 로그만 남기고 None 반환."""
    try:
        return await get_vms_client().record_hours(
            user_id,
            activity_id,
            hours,
            user_email=user_email,
            activity_title=activity_title,
        )
    except Exception as exc:  # noqa: BLE001
        _logger.error("VMS record_hours failed: %s", exc)
        return None
