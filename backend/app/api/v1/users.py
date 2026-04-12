"""User dashboard endpoints — Sprint 2 Day 5.

공개 조회가 아닌 '내 활동' 집계 API. 모두 인증 필요.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.pagination import paginated
from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.issue import Issue
from app.models.project import LivinglabProject
from app.models.project_membership import ProjectMember
from app.models.user import User
from app.models.volunteer import VolunteerActivity
from app.models.volunteer_participation import VolunteerParticipation
from app.schemas.content import IssueRead, ProjectRead, VolunteerRead
from app.schemas.dashboard import RecentActivity, UserSummaryResponse
from app.schemas.portfolio import (
    PortfolioIssue,
    PortfolioProject,
    PortfolioResponse,
    PortfolioStats,
    PortfolioUser,
    PortfolioVolunteer,
)
from app.services.pdf_service import upload_portfolio_pdf

router = APIRouter()


@router.get("/me/summary", response_model=UserSummaryResponse)
async def user_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserSummaryResponse:
    """내 활동 요약 — P-11 대시보드 상단 카드."""

    my_issues_count = (
        await db.execute(
            select(func.count()).select_from(
                select(Issue).where(Issue.author_id == current_user.id).subquery()
            )
        )
    ).scalar_one()

    # 리더 프로젝트 + 멤버 참여 프로젝트 합집합 (project_id 기준)
    leader_ids_stmt = select(LivinglabProject.id).where(
        LivinglabProject.leader_id == current_user.id
    )
    member_ids_stmt = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    union_ids = leader_ids_stmt.union(member_ids_stmt).subquery()
    my_projects_count = (
        await db.execute(select(func.count()).select_from(union_ids))
    ).scalar_one()

    # 확정된 봉사 시간 실집계
    my_volunteer_hours = (
        await db.execute(
            select(func.coalesce(func.sum(VolunteerParticipation.confirmed_hours), 0)).where(
                VolunteerParticipation.user_id == current_user.id,
                VolunteerParticipation.status.in_(["confirmed", "completed"]),
            )
        )
    ).scalar_one()

    votes_received = (
        await db.execute(
            select(func.coalesce(func.sum(Issue.vote_count), 0)).where(
                Issue.author_id == current_user.id
            )
        )
    ).scalar_one()

    comments_received = (
        await db.execute(
            select(func.coalesce(func.sum(Issue.comment_count), 0)).where(
                Issue.author_id == current_user.id
            )
        )
    ).scalar_one()

    # 최근 활동 — 내 이슈 5건
    recent_issues = (
        (
            await db.execute(
                select(Issue)
                .where(Issue.author_id == current_user.id)
                .order_by(Issue.created_at.desc())
                .limit(5)
            )
        )
        .scalars()
        .all()
    )
    recent_activities = [
        RecentActivity(
            type="issue_created",
            title=issue.title,
            entity_id=issue.id,
            created_at=issue.created_at,
        )
        for issue in recent_issues
    ]

    return UserSummaryResponse(
        my_issues_count=int(my_issues_count),
        my_projects_count=int(my_projects_count),
        my_volunteer_hours=float(my_volunteer_hours),
        total_votes_received=int(votes_received),
        total_comments_received=int(comments_received),
        recent_activities=recent_activities,
    )


@router.get("/me/issues")
async def my_issues(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """내가 등록한 이슈 목록."""
    base = select(Issue).where(Issue.author_id == current_user.id)
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    rows = (
        (
            await db.execute(
                base.order_by(Issue.created_at.desc()).limit(size).offset(offset)
            )
        )
        .scalars()
        .all()
    )
    items = [IssueRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.get("/me/projects")
async def my_projects(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """내가 참여하는 프로젝트 (리더 + 팀원). Sprint 3 project_members 확장."""
    leader_ids = select(LivinglabProject.id).where(
        LivinglabProject.leader_id == current_user.id
    )
    member_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    base = select(LivinglabProject).where(
        LivinglabProject.id.in_(leader_ids.union(member_ids))
    )
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    rows = (
        (
            await db.execute(
                base.order_by(LivinglabProject.created_at.desc())
                .limit(size)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    items = [ProjectRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.get("/me/volunteers")
async def my_volunteers(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """내가 신청·참여한 봉사활동 (Sprint 3 복원)."""
    participation_activity_ids = select(VolunteerParticipation.activity_id).where(
        VolunteerParticipation.user_id == current_user.id
    )
    base = select(VolunteerActivity).where(
        VolunteerActivity.id.in_(participation_activity_ids)
    )
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    rows = (
        (
            await db.execute(
                base.order_by(VolunteerActivity.start_datetime.desc())
                .limit(size)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    items = [VolunteerRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.get("/{user_id}/portfolio", response_model=PortfolioResponse)
async def get_portfolio(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PortfolioResponse:
    """BF-6 공개 포트폴리오 — 이슈/프로젝트/봉사 집계."""
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # 이슈 (내가 등록, 최신 20건)
    issues_rows = (
        (
            await db.execute(
                select(Issue)
                .where(Issue.author_id == user_id)
                .order_by(Issue.created_at.desc())
                .limit(20)
            )
        )
        .scalars()
        .all()
    )
    portfolio_issues = [
        PortfolioIssue(
            id=i.id,
            title=i.title,
            category=i.category,
            status=i.status,
            vote_count=i.vote_count,
            created_at=i.created_at,
        )
        for i in issues_rows
    ]

    # 프로젝트 (리더 + 팀원, 리더 우선)
    leader_projects = (
        (
            await db.execute(
                select(LivinglabProject)
                .where(LivinglabProject.leader_id == user_id)
                .order_by(LivinglabProject.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    member_rows = (
        (
            await db.execute(
                select(ProjectMember, LivinglabProject)
                .join(
                    LivinglabProject,
                    LivinglabProject.id == ProjectMember.project_id,
                )
                .where(ProjectMember.user_id == user_id)
                .order_by(ProjectMember.joined_at.desc())
            )
        )
        .all()
    )
    portfolio_projects = [
        PortfolioProject(
            id=p.id,
            title=p.title,
            phase=p.phase,
            role="leader",
            joined_at=p.created_at,
        )
        for p in leader_projects
    ] + [
        PortfolioProject(
            id=proj.id,
            title=proj.title,
            phase=proj.phase,
            role="member",
            joined_at=member.joined_at,
        )
        for member, proj in member_rows
    ]

    # 봉사 (participation join volunteer_activities)
    volunteer_rows = (
        (
            await db.execute(
                select(VolunteerParticipation, VolunteerActivity)
                .join(
                    VolunteerActivity,
                    VolunteerActivity.id == VolunteerParticipation.activity_id,
                )
                .where(VolunteerParticipation.user_id == user_id)
                .order_by(VolunteerParticipation.applied_at.desc())
            )
        )
        .all()
    )
    portfolio_volunteers = [
        PortfolioVolunteer(
            id=act.id,
            title=act.title,
            status=part.status,
            confirmed_hours=float(part.confirmed_hours)
            if part.confirmed_hours is not None
            else None,
            applied_at=part.applied_at,
        )
        for part, act in volunteer_rows
    ]

    # 통계
    volunteer_hours_sum = sum(
        float(part.confirmed_hours or 0)
        for part, _ in volunteer_rows
        if part.status in ("confirmed", "completed")
    )
    total_votes = sum(i.vote_count for i in issues_rows)

    stats = PortfolioStats(
        issues_count=len(issues_rows),
        projects_count=len(portfolio_projects),
        volunteer_hours=volunteer_hours_sum,
        total_votes_received=total_votes,
    )

    return PortfolioResponse(
        user=PortfolioUser(
            id=user.id,
            name=user.name,
            role=user.role,
            level=user.level,
            points=user.points,
            department=user.department,
            organization=user.organization,
            profile_image_url=user.profile_image_url,
        ),
        stats=stats,
        issues=portfolio_issues,
        projects=portfolio_projects,
        volunteers=portfolio_volunteers,
    )


@router.post(
    "/me/portfolio/pdf",
    dependencies=[
        Depends(rate_limit(max_requests=5, window_seconds=3600, key_by="user"))
    ],
)
async def generate_my_portfolio_pdf(
    current_user: User = Depends(get_current_user),
) -> dict:
    """내 포트폴리오 PDF 생성 (동기). 5/hr rate limit."""
    try:
        url = await upload_portfolio_pdf(current_user.id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF 생성 실패: {exc}",
        )
    return {"url": url, "user_id": str(current_user.id)}
