"""Success case endpoints — BF-7 성공 사례."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.pagination import paginated
from app.core.database import get_db
from app.models.success_case import SuccessCase
from app.schemas.content import SuccessCaseRead

router = APIRouter()


@router.get("")
async def list_cases(
    campus_id: uuid.UUID | None = None,
    is_published: bool | None = True,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(SuccessCase)
    if campus_id:
        stmt = stmt.where(SuccessCase.campus_id == campus_id)
    if is_published is not None:
        stmt = stmt.where(SuccessCase.is_published == is_published)

    total = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()

    offset = (page - 1) * size
    stmt = stmt.order_by(SuccessCase.created_at.desc()).limit(size).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    items = [SuccessCaseRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.get("/{case_id}", response_model=SuccessCaseRead)
async def get_case(case_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> SuccessCase:
    result = await db.execute(select(SuccessCase).where(SuccessCase.id == case_id))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Success case not found"
        )
    case.view_count += 1
    await db.commit()
    await db.refresh(case)
    return case
