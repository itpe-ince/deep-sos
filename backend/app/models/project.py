"""LivinglabProject model — BF-3 리빙랩 프로젝트."""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class LivinglabProject(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "livinglab_projects"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    phase: Mapped[str] = mapped_column(String(20), default="discover", nullable=False)
    # discover / execute / develop / verify / utilize
    maker_stage: Mapped[str | None] = mapped_column(String(20))  # idea/proof/policy
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    # draft / active / completed / archived

    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campuses.id", ondelete="SET NULL"),
    )
    leader_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    target_sdgs: Mapped[list[int] | None] = mapped_column(ARRAY(Integer))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    budget: Mapped[float | None] = mapped_column(Numeric(12, 2))

    member_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    partner_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0-100

    outcome_summary: Mapped[str | None] = mapped_column(Text)
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
