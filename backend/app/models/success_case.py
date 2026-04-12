"""Success Case model — BF-7 성공 사례."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class SuccessCase(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "success_cases"

    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("livinglab_projects.id", ondelete="SET NULL"),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    problem_summary: Mapped[str] = mapped_column(Text, nullable=False)
    process_summary: Mapped[str] = mapped_column(Text, nullable=False)
    result_summary: Mapped[str] = mapped_column(Text, nullable=False)
    impact_summary: Mapped[str | None] = mapped_column(Text)

    sdg_goals: Mapped[list[int] | None] = mapped_column(ARRAY(Integer))
    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campuses.id", ondelete="SET NULL"),
    )

    policy_linked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    policy_detail: Mapped[str | None] = mapped_column(Text)
    global_transfer_candidate: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
