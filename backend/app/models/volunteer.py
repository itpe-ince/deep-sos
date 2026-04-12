"""Volunteer activity model — BF-5 봉사활동."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class VolunteerActivity(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "volunteer_activities"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    activity_type: Mapped[str | None] = mapped_column(String(30))
    # education / environment / welfare / culture / safety

    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campuses.id", ondelete="SET NULL"),
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("livinglab_projects.id", ondelete="SET NULL"),
    )

    location: Mapped[str | None] = mapped_column(Text)
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    max_participants: Mapped[int | None] = mapped_column(Integer)
    current_participants: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    volunteer_hours: Mapped[float] = mapped_column(Numeric(4, 1), default=0, nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="upcoming", nullable=False)
    # upcoming / ongoing / completed / cancelled
