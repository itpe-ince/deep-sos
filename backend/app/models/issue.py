"""Issue model — BF-1 지역 문제."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class Issue(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "issues"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    # environment / safety / transport / welfare / culture / other
    status: Mapped[str] = mapped_column(String(20), default="submitted", nullable=False)
    # submitted / reviewing / assigned / progress / resolved / rejected
    priority: Mapped[str] = mapped_column(String(10), default="normal", nullable=False)

    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campuses.id", ondelete="SET NULL"),
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    location_lat: Mapped[float | None] = mapped_column(Numeric(10, 8))
    location_lng: Mapped[float | None] = mapped_column(Numeric(11, 8))
    location_address: Mapped[str | None] = mapped_column(Text)

    image_urls: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    vote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    linked_project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
