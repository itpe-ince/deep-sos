"""Admin KPI 대시보드 — Sprint 4 Day 1.

플랫폼/캠퍼스/카테고리/시계열 집계. 모두 admin 권한.
"""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.cache import cache_get, cache_set
from app.core.database import get_db
from app.models.campus import Campus
from app.models.issue import Issue
from app.models.project import LivinglabProject
from app.models.success_case import SuccessCase
from app.models.user import User
from app.models.volunteer import VolunteerActivity
from app.models.volunteer_participation import VolunteerParticipation
from app.schemas.kpi import (
    CampusKpi,
    CategoryKpi,
    KpiSummary,
    TimeseriesPoint,
    TimeseriesResponse,
)

router = APIRouter()


@router.get("/summary", response_model=KpiSummary)
async def kpi_summary(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    # 5분 캐시 — 집계 쿼리 중 가장 무거움
    cached = await cache_get("cache:kpi:summary")
    if cached is not None:
        return cached

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()

    cutoff = datetime.now(UTC) - timedelta(days=30)
    active_users = (
        await db.execute(
            select(func.count()).select_from(User).where(User.last_login_at >= cutoff)
        )
    ).scalar_one()

    total_issues = (
        await db.execute(select(func.count()).select_from(Issue))
    ).scalar_one()
    resolved_issues = (
        await db.execute(
            select(func.count()).select_from(Issue).where(Issue.status == "resolved")
        )
    ).scalar_one()
    resolved_rate = (
        round(float(resolved_issues) / total_issues, 4) if total_issues else 0.0
    )

    active_projects = (
        await db.execute(
            select(func.count())
            .select_from(LivinglabProject)
            .where(LivinglabProject.status == "active")
        )
    ).scalar_one()
    completed_projects = (
        await db.execute(
            select(func.count())
            .select_from(LivinglabProject)
            .where(LivinglabProject.status == "completed")
        )
    ).scalar_one()

    total_hours = (
        await db.execute(
            select(
                func.coalesce(func.sum(VolunteerParticipation.confirmed_hours), 0)
            ).where(
                VolunteerParticipation.status.in_(["confirmed", "completed"])
            )
        )
    ).scalar_one()

    success_cases = (
        await db.execute(
            select(func.count())
            .select_from(SuccessCase)
            .where(SuccessCase.is_published.is_(True))
        )
    ).scalar_one()

    result = KpiSummary(
        total_users=int(total_users),
        active_users_30d=int(active_users),
        total_issues=int(total_issues),
        resolved_issues=int(resolved_issues),
        resolved_rate=resolved_rate,
        active_projects=int(active_projects),
        completed_projects=int(completed_projects),
        total_volunteer_hours=float(total_hours),
        success_cases=int(success_cases),
    )
    await cache_set("cache:kpi:summary", result.model_dump(mode="json"), ttl=300)
    return result


@router.get("/campuses")
async def kpi_campuses(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    campuses = (await db.execute(select(Campus).order_by(Campus.code))).scalars().all()

    results: list[CampusKpi] = []
    for campus in campuses:
        issues_count = (
            await db.execute(
                select(func.count())
                .select_from(Issue)
                .where(Issue.campus_id == campus.id)
            )
        ).scalar_one()
        projects_count = (
            await db.execute(
                select(func.count())
                .select_from(LivinglabProject)
                .where(LivinglabProject.campus_id == campus.id)
            )
        ).scalar_one()
        hours = (
            await db.execute(
                select(
                    func.coalesce(func.sum(VolunteerParticipation.confirmed_hours), 0)
                )
                .select_from(VolunteerParticipation)
                .join(
                    VolunteerActivity,
                    VolunteerActivity.id == VolunteerParticipation.activity_id,
                )
                .where(
                    VolunteerParticipation.status.in_(["confirmed", "completed"]),
                    VolunteerActivity.campus_id == campus.id,
                )
            )
        ).scalar_one()

        results.append(
            CampusKpi(
                campus_id=campus.id,
                code=campus.code,
                name=campus.name,
                issues_count=int(issues_count),
                projects_count=int(projects_count),
                volunteer_hours=float(hours),
            )
        )

    return {"data": [c.model_dump(mode="json") for c in results]}


@router.get("/categories")
async def kpi_categories(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    rows = (
        await db.execute(
            select(Issue.category, func.count().label("count"))
            .group_by(Issue.category)
            .order_by(func.count().desc())
        )
    ).all()
    data = [CategoryKpi(category=r.category, count=int(r.count)) for r in rows]
    return {"data": [c.model_dump(mode="json") for c in data]}


@router.get("/timeseries", response_model=TimeseriesResponse)
async def kpi_timeseries(
    days: int = Query(default=30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> TimeseriesResponse:
    start = datetime.now(UTC).date() - timedelta(days=days - 1)

    issue_rows = (
        await db.execute(
            select(
                cast(Issue.created_at, Date).label("day"),
                func.count().label("count"),
            )
            .where(cast(Issue.created_at, Date) >= start)
            .group_by(cast(Issue.created_at, Date))
        )
    ).all()
    user_rows = (
        await db.execute(
            select(
                cast(User.created_at, Date).label("day"),
                func.count().label("count"),
            )
            .where(cast(User.created_at, Date) >= start)
            .group_by(cast(User.created_at, Date))
        )
    ).all()

    issue_map: dict[date, int] = {r.day: int(r.count) for r in issue_rows}
    user_map: dict[date, int] = {r.day: int(r.count) for r in user_rows}

    points: list[TimeseriesPoint] = []
    for i in range(days):
        day = start + timedelta(days=i)
        points.append(
            TimeseriesPoint(
                day=day,
                new_issues=issue_map.get(day, 0),
                new_users=user_map.get(day, 0),
            )
        )

    return TimeseriesResponse(days=days, points=points)
