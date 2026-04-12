"""KPI 스키마 — Sprint 4 Day 1."""
from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel


class KpiSummary(BaseModel):
    total_users: int
    active_users_30d: int
    total_issues: int
    resolved_issues: int
    resolved_rate: float  # 0.0 ~ 1.0
    active_projects: int
    completed_projects: int
    total_volunteer_hours: float
    success_cases: int


class CampusKpi(BaseModel):
    campus_id: uuid.UUID
    code: str
    name: str
    issues_count: int
    projects_count: int
    volunteer_hours: float


class CategoryKpi(BaseModel):
    category: str
    count: int


class TimeseriesPoint(BaseModel):
    day: date
    new_issues: int
    new_users: int


class TimeseriesResponse(BaseModel):
    days: int
    points: list[TimeseriesPoint]
