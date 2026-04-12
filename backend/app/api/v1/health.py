"""Health check endpoints — Sprint 5 Day 4 강화."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import get_redis
from app.core.storage import get_minio_client

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe — 서버 가동 여부만 확인 (K8s liveness)."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "time": datetime.now(UTC).isoformat(),
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Readiness probe — DB/Redis/MinIO 3종 ping (K8s readiness).

    하나라도 실패하면 503 반환 — K8s가 해당 파드로 트래픽 라우팅 중단.
    """
    checks: dict[str, str] = {}

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["database"] = f"error: {type(exc).__name__}"

    try:
        redis = get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"error: {type(exc).__name__}"

    try:
        client = get_minio_client()
        client.list_buckets()
        checks["minio"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["minio"] = f"error: {type(exc).__name__}"

    all_ok = all(v == "ok" for v in checks.values())
    body = {
        "status": "ready" if all_ok else "degraded",
        "checks": checks,
        "time": datetime.now(UTC).isoformat(),
    }
    return JSONResponse(
        status_code=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=body,
    )
