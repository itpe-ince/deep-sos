"""Notification 스키마 — Sprint 5 Day 8."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    body: str | None = None
    link_url: str | None = None
    is_read: bool
    created_at: datetime
