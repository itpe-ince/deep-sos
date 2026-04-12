"""Volunteer endpoints — BF-5 봉사활동 (Sprint 1 읽기 + Sprint 3 쓰기)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.api.pagination import paginated
from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.integrations.vms_client import safe_record_hours
from app.services.notification_service import create_notification
from app.models.user import User
from app.models.volunteer import VolunteerActivity
from app.models.volunteer_participation import VolunteerParticipation
from app.schemas.content import VolunteerRead
from app.schemas.volunteer_write import (
    VolunteerApplyRequest,
    VolunteerConfirmRequest,
    VolunteerParticipationRead,
)

router = APIRouter()


@router.get("")
async def list_volunteers(
    campus_id: uuid.UUID | None = None,
    activity_type: str | None = None,
    activity_status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(VolunteerActivity)
    if campus_id:
        stmt = stmt.where(VolunteerActivity.campus_id == campus_id)
    if activity_type:
        stmt = stmt.where(VolunteerActivity.activity_type == activity_type)
    if activity_status:
        stmt = stmt.where(VolunteerActivity.status == activity_status)

    total = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()

    offset = (page - 1) * size
    stmt = stmt.order_by(VolunteerActivity.start_datetime.asc()).limit(size).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    items = [VolunteerRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.get("/{volunteer_id}", response_model=VolunteerRead)
async def get_volunteer(
    volunteer_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> VolunteerActivity:
    result = await db.execute(
        select(VolunteerActivity).where(VolunteerActivity.id == volunteer_id)
    )
    volunteer = result.scalar_one_or_none()
    if volunteer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer activity not found"
        )
    return volunteer


# ─────────────────────────────────────────────────
# Sprint 3 — 신청/취소/확정
# ─────────────────────────────────────────────────


async def _get_activity_or_404(
    activity_id: uuid.UUID, db: AsyncSession
) -> VolunteerActivity:
    result = await db.execute(
        select(VolunteerActivity).where(VolunteerActivity.id == activity_id)
    )
    activity = result.scalar_one_or_none()
    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer activity not found"
        )
    return activity


@router.post(
    "/{activity_id}/apply",
    response_model=VolunteerParticipationRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(rate_limit(max_requests=30, window_seconds=3600, key_by="user"))
    ],
)
async def apply_volunteer(
    activity_id: uuid.UUID,
    data: VolunteerApplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VolunteerParticipation:
    activity = await _get_activity_or_404(activity_id, db)

    if activity.status in ("completed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="종료된 봉사활동입니다.",
        )

    if activity.max_participants is not None:
        if activity.current_participants >= activity.max_participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="모집 인원이 마감되었습니다.",
            )

    existing = (
        await db.execute(
            select(VolunteerParticipation).where(
                VolunteerParticipation.activity_id == activity_id,
                VolunteerParticipation.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 신청한 봉사활동입니다.",
        )

    now = datetime.now(UTC)
    participation = VolunteerParticipation(
        activity_id=activity_id,
        user_id=current_user.id,
        status="applied",
        applied_at=now,
        note=data.note,
    )
    db.add(participation)
    activity.current_participants += 1
    await db.commit()
    await db.refresh(participation)
    return participation


@router.delete(
    "/{activity_id}/apply",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def cancel_volunteer_application(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    participation = (
        await db.execute(
            select(VolunteerParticipation).where(
                VolunteerParticipation.activity_id == activity_id,
                VolunteerParticipation.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if participation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Participation not found"
        )
    if participation.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="완료된 활동은 취소할 수 없습니다.",
        )

    activity = await _get_activity_or_404(activity_id, db)
    activity.current_participants = max(0, activity.current_participants - 1)
    await db.delete(participation)
    await db.commit()


@router.put(
    "/{activity_id}/participations/{participation_id}",
    response_model=VolunteerParticipationRead,
)
async def confirm_participation(
    activity_id: uuid.UUID,
    participation_id: uuid.UUID,
    data: VolunteerConfirmRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> VolunteerParticipation:
    participation = (
        await db.execute(
            select(VolunteerParticipation).where(
                VolunteerParticipation.id == participation_id,
                VolunteerParticipation.activity_id == activity_id,
            )
        )
    ).scalar_one_or_none()
    if participation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Participation not found"
        )

    previous_status = participation.status
    participation.status = data.status
    if data.status in ("confirmed", "completed"):
        participation.confirmed_at = datetime.now(UTC)
        if data.confirmed_hours is not None:
            participation.confirmed_hours = data.confirmed_hours

    await db.commit()
    await db.refresh(participation)

    # 봉사 상태 전이 시 알림 + (completed에서) VMS 동기화
    if data.status != previous_status and data.status in ("confirmed", "completed"):
        activity = await _get_activity_or_404(activity_id, db)
        user = (
            await db.execute(
                select(User).where(User.id == participation.user_id)
            )
        ).scalar_one_or_none()

        notif_type = (
            "volunteer_confirmed"
            if data.status == "confirmed"
            else "volunteer_completed"
        )
        notif_title = (
            "봉사활동 참여가 확정되었습니다"
            if data.status == "confirmed"
            else "봉사활동이 완료 인증되었습니다"
        )
        await create_notification(
            db,
            user_id=participation.user_id,
            type=notif_type,
            title=notif_title,
            body=activity.title,
            link_url=f"/volunteers/{activity_id}",
        )
        await db.commit()

        if (
            data.status == "completed"
            and previous_status != "completed"
            and participation.confirmed_hours is not None
        ):
            await safe_record_hours(
                user_id=participation.user_id,
                activity_id=activity_id,
                hours=float(participation.confirmed_hours),
                user_email=user.email if user else None,
                activity_title=activity.title,
            )

    return participation
