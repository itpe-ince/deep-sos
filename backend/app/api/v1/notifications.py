"""Notifications endpoints — Sprint 5 Day 8.

- GET /notifications/stream (SSE, 인증 필요): Redis Pub/Sub 구독
- GET /notifications: 히스토리 조회 (unread 필터)
- PUT /notifications/{id}/read: 단일 읽음 처리
- PUT /notifications/read-all: 전부 읽음 처리
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.pagination import paginated
from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.core.rate_limit import get_redis
from app.core.security import decode_token
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationRead
from app.services.notification_service import channel_for

router = APIRouter()


# ─────────────────────────────────────────────────
# SSE — 실시간 스트림
# ─────────────────────────────────────────────────


async def _sse_event_generator(user_id: uuid.UUID, request: Request):
    """Redis Pub/Sub 구독 → SSE data 이벤트로 전달."""
    redis = get_redis()
    pubsub = redis.pubsub()
    channel = channel_for(user_id)
    await pubsub.subscribe(channel)

    # 초기 ping
    yield 'event: ready\ndata: {"connected": true}\n\n'

    try:
        while True:
            if await request.is_disconnected():
                break

            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=15.0
            )
            if message and message.get("type") == "message":
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode()
                yield f"data: {data}\n\n"
            else:
                # keepalive (15초마다 heartbeat)
                yield ": heartbeat\n\n"
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception:
            pass


@router.get("/stream")
async def notifications_stream(
    request: Request,
    token: str | None = Query(default=None),
) -> StreamingResponse:
    """SSE 스트림. EventSource는 Authorization 헤더를 못 보내므로 쿼리 토큰 허용."""
    access_token = token
    if not access_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            access_token = auth[7:]
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="token required"
        )
    try:
        payload = decode_token(access_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token type"
        )
    user_id = uuid.UUID(str(payload["sub"]))

    return StreamingResponse(
        _sse_event_generator(user_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # nginx 버퍼링 비활성화
        },
    )


# ─────────────────────────────────────────────────
# REST
# ─────────────────────────────────────────────────


@router.get("")
async def list_notifications(
    unread: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread is not None:
        stmt = stmt.where(Notification.is_read == (not unread))

    total = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    rows = (
        (
            await db.execute(
                stmt.order_by(Notification.created_at.desc())
                .limit(size)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    items = [NotificationRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.put("/{notification_id}/read", response_model=NotificationRead)
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Notification:
    notif = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if notif is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif


@router.put("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"updated": result.rowcount or 0}
