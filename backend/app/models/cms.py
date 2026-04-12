"""CMS models — cms_pages, cms_banners (Sprint 2)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class CmsPage(UUIDPrimaryKey, TimestampMixin, Base):
    """관리자가 편집하는 정적 페이지 (P-02 about, P-04 guide)."""

    __tablename__ = "cms_pages"

    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    content_html: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False)
    # draft / published / archived

    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )


class CmsBanner(UUIDPrimaryKey, TimestampMixin, Base):
    """홈/섹션 히어로 배너."""

    __tablename__ = "cms_banners"

    position: Mapped[str] = mapped_column(String(20), nullable=False)
    # hero / sub / footer
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    link_url: Mapped[str | None] = mapped_column(String(500))

    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
