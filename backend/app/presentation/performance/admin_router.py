"""USCP V2 — Performance Admin Router (M06-01/03/06/08 운영자).

설계 근거: design.md §4.2 M06 (`/admin/kpi/indicators`, `/admin/kpi/records`)

엔드포인트 (operator):
  - POST  /admin/kpi/indicators        (M06-01 지표 등록)
  - PATCH /admin/kpi/indicators/{id}   (M06-01 지표 수정)
  - POST  /admin/kpi/records           (M06-03 실적 입력 upsert)
  - GET   /admin/kpi/export.csv        (M06-06 CSV 다운로드)
  - DELETE /admin/resources/{id}       (M06-08 자료 삭제)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.attachment_service import delete_attachment_v2
from app.application.kpi_service import (
    create_kpi_v2,
    export_performance_csv_v2,
    update_kpi_v2,
    upsert_performance_v2,
)
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


def _require_operator(user: User) -> None:
    role = str(getattr(user, "role", "") or "").lower()
    if role not in ("operator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "operator_required", "message": "운영자만 접근 가능합니다."},
        )


class CreateKpiRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    formula: str | None = None
    unit: str | None = Field(None, max_length=20)
    target_value: float | None = None
    auto_count_source: str | None = Field(None, description="예: resolved_issue")


class UpdateKpiRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    formula: str | None = None
    unit: str | None = None
    target_value: float | None = None
    auto_count_source: str | None = None


class RecordRequest(BaseModel):
    kpi_id: str
    period: str = Field(..., description="YYYY-MM 또는 YYYY-Q1")
    value: float


@router.post("/kpi/indicators", summary="M06-01 성과지표 등록 (운영자)")
async def create_kpi(
    body: CreateKpiRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_name."""
    _require_operator(current_user)
    return await create_kpi_v2(
        db,
        operator_id=str(current_user.id),
        name=body.name,
        formula=body.formula,
        unit=body.unit,
        target_value=body.target_value,
        auto_count_source=body.auto_count_source,
    )


@router.patch("/kpi/indicators/{kpi_id}", summary="M06-01 성과지표 수정 (운영자)")
async def update_kpi(
    kpi_id: str,
    body: UpdateKpiRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: kpi_not_found."""
    _require_operator(current_user)
    return await update_kpi_v2(
        db,
        operator_id=str(current_user.id),
        kpi_id=kpi_id,
        name=body.name,
        formula=body.formula,
        unit=body.unit,
        target_value=body.target_value,
        auto_count_source=body.auto_count_source,
    )


@router.post("/kpi/records", summary="M06-03 실적 입력 (운영자, 기간별 덮어쓰기)")
async def create_record(
    body: RecordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: kpi_not_found. 422: invalid_period."""
    _require_operator(current_user)
    return await upsert_performance_v2(
        db,
        operator_id=str(current_user.id),
        kpi_id=body.kpi_id,
        period=body.period,
        value=body.value,
    )


@router.get("/kpi/export.csv", summary="M06-06 실적 CSV 다운로드 (운영자)")
async def export_csv(
    start: str | None = Query(default=None, description="YYYY-MM 시작"),
    end: str | None = Query(default=None, description="YYYY-MM 종료"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """KPI 실적 CSV. UTF-8 BOM 포함(엑셀 한글 호환)."""
    _require_operator(current_user)
    csv_text = await export_performance_csv_v2(db, start=start, end=end)
    return Response(
        content="﻿" + csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="uscp_kpi_performance.csv"'},
    )


@router.delete("/resources/{attachment_id}", summary="M06-08 자료 삭제 (운영자)")
async def delete_resource(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: attachment_not_found."""
    _require_operator(current_user)
    return await delete_attachment_v2(
        db, operator_id=str(current_user.id), attachment_id=attachment_id
    )
