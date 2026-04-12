"""Portfolio 스키마 — BF-6 Sprint 3 Day 7."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class PortfolioUser(BaseModel):
    id: uuid.UUID
    name: str
    role: str
    level: str
    points: int
    department: str | None = None
    organization: str | None = None
    profile_image_url: str | None = None


class PortfolioStats(BaseModel):
    issues_count: int
    projects_count: int
    volunteer_hours: float
    total_votes_received: int


class PortfolioIssue(BaseModel):
    id: uuid.UUID
    title: str
    category: str
    status: str
    vote_count: int
    created_at: datetime


class PortfolioProject(BaseModel):
    id: uuid.UUID
    title: str
    phase: str
    role: str  # leader / member
    joined_at: datetime


class PortfolioVolunteer(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    confirmed_hours: float | None = None
    applied_at: datetime


class PortfolioResponse(BaseModel):
    user: PortfolioUser
    stats: PortfolioStats
    issues: list[PortfolioIssue]
    projects: list[PortfolioProject]
    volunteers: list[PortfolioVolunteer]
