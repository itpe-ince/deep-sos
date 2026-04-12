"""Volunteer participation 스키마 — Sprint 3 Day 5."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class VolunteerApplyRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class VolunteerConfirmRequest(BaseModel):
    status: str = Field(pattern="^(confirmed|completed|cancelled)$")
    confirmed_hours: float | None = Field(default=None, ge=0, le=99.9)


class VolunteerParticipationRead(_Base):
    id: uuid.UUID
    activity_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    applied_at: datetime
    confirmed_at: datetime | None = None
    confirmed_hours: float | None = None
    note: str | None = None
    created_at: datetime
