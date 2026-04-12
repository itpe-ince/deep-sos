"""BF-3 프로젝트 팀원/마일스톤/신청 엔드포인트 — Sprint 3 Day 4."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.pagination import paginated
from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.project import LivinglabProject
from app.models.project_membership import (
    ProjectApplication,
    ProjectMember,
    ProjectMilestone,
)
from app.models.user import User
from app.schemas.project_write import (
    ProjectApplicationCreate,
    ProjectApplicationDecide,
    ProjectApplicationRead,
    ProjectMemberRead,
    ProjectMilestoneCreate,
    ProjectMilestoneRead,
    ProjectMilestoneUpdate,
)
from app.services.notification_service import create_notification

router = APIRouter()


async def _get_project_or_404(
    project_id: uuid.UUID, db: AsyncSession
) -> LivinglabProject:
    result = await db.execute(
        select(LivinglabProject).where(LivinglabProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return project


async def _require_leader(
    project: LivinglabProject, user: User
) -> None:
    if project.leader_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="프로젝트 리더 또는 관리자 권한이 필요합니다.",
        )


# ─────────────────────────────────────────────────
# Members — public 조회
# ─────────────────────────────────────────────────


@router.get("/{project_id}/members")
async def list_members(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_project_or_404(project_id, db)
    stmt = (
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.joined_at.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    items = [ProjectMemberRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, len(items), 1, max(1, len(items)))


# ─────────────────────────────────────────────────
# Applications — 신청
# ─────────────────────────────────────────────────


@router.post(
    "/{project_id}/apply",
    response_model=ProjectApplicationRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(rate_limit(max_requests=10, window_seconds=3600, key_by="user"))
    ],
)
async def apply_project(
    project_id: uuid.UUID,
    data: ProjectApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectApplication:
    project = await _get_project_or_404(project_id, db)
    if project.leader_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="본인이 리드하는 프로젝트에 지원할 수 없습니다.",
        )

    existing = (
        await db.execute(
            select(ProjectApplication).where(
                ProjectApplication.project_id == project_id,
                ProjectApplication.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 신청한 프로젝트입니다.",
        )

    member_existing = (
        await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if member_existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 참여 중인 프로젝트입니다.",
        )

    application = ProjectApplication(
        project_id=project_id,
        user_id=current_user.id,
        message=data.message,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application


@router.delete("/{project_id}/apply", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_application(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(ProjectApplication).where(
            ProjectApplication.project_id == project_id,
            ProjectApplication.user_id == current_user.id,
        )
    )
    app_row = result.scalar_one_or_none()
    if app_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    if app_row.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="처리된 신청은 취소할 수 없습니다.",
        )
    await db.delete(app_row)
    await db.commit()


@router.get("/{project_id}/applications")
async def list_applications(
    project_id: uuid.UUID,
    app_status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    project = await _get_project_or_404(project_id, db)
    await _require_leader(project, current_user)

    stmt = select(ProjectApplication).where(
        ProjectApplication.project_id == project_id
    )
    if app_status:
        stmt = stmt.where(ProjectApplication.status == app_status)

    total = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    stmt = stmt.order_by(ProjectApplication.created_at.desc()).limit(size).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        ProjectApplicationRead.model_validate(r).model_dump(mode="json") for r in rows
    ]
    return paginated(items, total, page, size)


@router.put(
    "/{project_id}/applications/{app_id}",
    response_model=ProjectApplicationRead,
)
async def decide_application(
    project_id: uuid.UUID,
    app_id: uuid.UUID,
    data: ProjectApplicationDecide,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectApplication:
    project = await _get_project_or_404(project_id, db)
    await _require_leader(project, current_user)

    application = (
        await db.execute(
            select(ProjectApplication).where(
                ProjectApplication.id == app_id,
                ProjectApplication.project_id == project_id,
            )
        )
    ).scalar_one_or_none()
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    if application.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="이미 처리된 신청입니다."
        )

    now = datetime.now(UTC)
    application.status = data.status
    application.decided_by = current_user.id
    application.decided_at = now

    if data.status == "accepted":
        member = ProjectMember(
            project_id=project_id,
            user_id=application.user_id,
            role="member",
            joined_at=now,
        )
        db.add(member)
        project.member_count += 1

    # 지원자에게 결과 알림
    notif_type = "project_accepted" if data.status == "accepted" else "project_rejected"
    notif_title = (
        "프로젝트 참여가 수락되었습니다"
        if data.status == "accepted"
        else "프로젝트 참여가 반려되었습니다"
    )
    await create_notification(
        db,
        user_id=application.user_id,
        type=notif_type,
        title=notif_title,
        body=project.title,
        link_url=f"/projects/{project_id}",
    )

    await db.commit()
    await db.refresh(application)
    return application


# ─────────────────────────────────────────────────
# Milestones
# ─────────────────────────────────────────────────


@router.get("/{project_id}/milestones")
async def list_milestones(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_project_or_404(project_id, db)
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.order_index.asc(), ProjectMilestone.created_at.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        ProjectMilestoneRead.model_validate(r).model_dump(mode="json") for r in rows
    ]
    return paginated(items, len(items), 1, max(1, len(items)))


@router.post(
    "/{project_id}/milestones",
    response_model=ProjectMilestoneRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_milestone(
    project_id: uuid.UUID,
    data: ProjectMilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectMilestone:
    project = await _get_project_or_404(project_id, db)
    await _require_leader(project, current_user)

    milestone = ProjectMilestone(
        project_id=project_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        order_index=data.order_index,
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.put(
    "/{project_id}/milestones/{milestone_id}",
    response_model=ProjectMilestoneRead,
)
async def update_milestone(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    data: ProjectMilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectMilestone:
    project = await _get_project_or_404(project_id, db)
    await _require_leader(project, current_user)

    milestone = (
        await db.execute(
            select(ProjectMilestone).where(
                ProjectMilestone.id == milestone_id,
                ProjectMilestone.project_id == project_id,
            )
        )
    ).scalar_one_or_none()
    if milestone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found"
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    await db.commit()
    await db.refresh(milestone)
    return milestone
