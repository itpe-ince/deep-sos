"""Issue 쓰기 스키마 — 댓글/투표 (Sprint 2)."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class IssueVoteResponse(BaseModel):
    voted: bool
    vote_count: int


class IssueCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    parent_id: uuid.UUID | None = None


class IssueCommentRead(_Base):
    id: uuid.UUID
    issue_id: uuid.UUID
    author_id: uuid.UUID
    parent_id: uuid.UUID | None = None
    content: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
