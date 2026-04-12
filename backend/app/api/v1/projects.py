"""Project endpoints — BF-3 리빙랩 프로젝트."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.pagination import paginated
from app.core.database import get_db
from app.models.project import LivinglabProject
from app.schemas.content import ProjectRead

router = APIRouter()


@router.get("")
async def list_projects(
    campus_id: uuid.UUID | None = None,
    phase: str | None = None,
    project_status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(LivinglabProject)
    if campus_id:
        stmt = stmt.where(LivinglabProject.campus_id == campus_id)
    if phase:
        stmt = stmt.where(LivinglabProject.phase == phase)
    if project_status:
        stmt = stmt.where(LivinglabProject.status == project_status)

    total = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()

    offset = (page - 1) * size
    stmt = stmt.order_by(LivinglabProject.created_at.desc()).limit(size).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    items = [ProjectRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> LivinglabProject:
    result = await db.execute(
        select(LivinglabProject).where(LivinglabProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project
