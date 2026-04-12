"""Project membership/milestones/applications 스키마 — Sprint 3."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Members ──────────────────────────────
class ProjectMemberRead(_Base):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime


# ── Applications ─────────────────────────
class ProjectApplicationCreate(BaseModel):
    message: str | None = Field(default=None, max_length=1000)


class ProjectApplicationDecide(BaseModel):
    status: str = Field(pattern="^(accepted|rejected)$")


class ProjectApplicationRead(_Base):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    message: str | None = None
    status: str
    decided_by: uuid.UUID | None = None
    decided_at: datetime | None = None
    created_at: datetime


# ── Milestones ───────────────────────────
class ProjectMilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    due_date: date | None = None
    order_index: int = 0


class ProjectMilestoneUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    due_date: date | None = None
    status: str | None = Field(default=None, pattern="^(pending|in_progress|done)$")
    order_index: int | None = None


class ProjectMilestoneRead(_Base):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None = None
    due_date: date | None = None
    status: str
    order_index: int
    created_at: datetime
