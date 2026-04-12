"""Volunteer participation model — BF-5 Sprint 3."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class VolunteerParticipation(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "volunteer_participations"
    __table_args__ = (
        UniqueConstraint(
            "activity_id", "user_id", name="uq_volunteer_part_activity_user"
        ),
    )

    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("volunteer_activities.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), default="applied", nullable=False)
    # applied / confirmed / completed / cancelled
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmed_hours: Mapped[float | None] = mapped_column(Numeric(4, 1))
    note: Mapped[str | None] = mapped_column(Text)
