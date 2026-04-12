"""Content schemas — Issues / Projects / Volunteers / Success Cases."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class IssueRead(_Base):
    id: uuid.UUID
    title: str
    description: str
    category: str
    status: str
    priority: str
    campus_id: uuid.UUID | None = None
    location_address: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    image_urls: list[str] | None = None
    vote_count: int
    view_count: int
    comment_count: int
    is_anonymous: bool
    created_at: datetime


class ProjectRead(_Base):
    id: uuid.UUID
    title: str
    description: str
    phase: str
    maker_stage: str | None = None
    status: str
    campus_id: uuid.UUID | None = None
    leader_id: uuid.UUID | None = None
    target_sdgs: list[int] | None = None
    start_date: date | None = None
    end_date: date | None = None
    member_count: int
    partner_count: int
    progress: int
    outcome_summary: str | None = None
    cover_image_url: str | None = None
    created_at: datetime


class VolunteerRead(_Base):
    id: uuid.UUID
    title: str
    description: str
    activity_type: str | None = None
    campus_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    location: str | None = None
    start_datetime: datetime
    end_datetime: datetime
    max_participants: int | None = None
    current_participants: int
    volunteer_hours: float
    status: str
    created_at: datetime


class SuccessCaseRead(_Base):
    id: uuid.UUID
    title: str
    problem_summary: str
    process_summary: str
    result_summary: str
    impact_summary: str | None = None
    sdg_goals: list[int] | None = None
    campus_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    policy_linked: bool
    policy_detail: str | None = None
    global_transfer_candidate: bool
    view_count: int
    is_published: bool
    cover_image_url: str | None = None
    created_at: datetime


class ListResponse(BaseModel):
    total: int
    items: list
