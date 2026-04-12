"""사용자 대시보드 스키마 — Sprint 2 Day 5."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class RecentActivity(BaseModel):
    type: str  # issue_created / vote / comment / project_joined
    title: str
    entity_id: uuid.UUID
    created_at: datetime


class UserSummaryResponse(BaseModel):
    my_issues_count: int
    my_projects_count: int
    my_volunteer_hours: float
    total_votes_received: int
    total_comments_received: int
    recent_activities: list[RecentActivity]
