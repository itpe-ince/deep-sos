"""User model — SSO(대학), 이메일, 소셜(카카오/네이버/구글) 로그인 지원."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class User(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "users"

    # ── Identity ──────────────────────────────
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))

    # ── Role & Campus ─────────────────────────
    role: Mapped[str] = mapped_column(String(20), default="citizen", nullable=False)
    # student / professor / staff / citizen / gov_officer / enterprise / admin
    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campuses.id", ondelete="SET NULL"),
    )
    department: Mapped[str | None] = mapped_column(String(100))
    student_number: Mapped[str | None] = mapped_column(String(20))
    organization: Mapped[str | None] = mapped_column(String(200))
    expertise: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    # ── OAuth ─────────────────────────────────
    oauth_provider: Mapped[str | None] = mapped_column(String(20))  # email/kakao/naver/google
    oauth_id: Mapped[str | None] = mapped_column(String(255))

    # ── Profile ───────────────────────────────
    profile_image_url: Mapped[str | None] = mapped_column(String(500))

    # ── Gamification ──────────────────────────
    level: Mapped[str] = mapped_column(String(20), default="newcomer", nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ── Status ────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Relationships ─────────────────────────
    campus: Mapped["Campus | None"] = relationship("Campus", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
