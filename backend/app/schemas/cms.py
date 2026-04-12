"""CMS Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ─── Pages ──────────────────────────────────────

class CmsPageRead(_Base):
    id: uuid.UUID
    slug: str
    title: str
    content_json: dict[str, Any]
    content_html: str | None = None
    status: str
    updated_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class CmsPageUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content_json: dict[str, Any]
    content_html: str | None = None
    status: str = Field(default="published", pattern="^(draft|published|archived)$")


# ─── Banners ────────────────────────────────────

class CmsBannerRead(_Base):
    id: uuid.UUID
    position: str
    title: str
    subtitle: str | None = None
    image_url: str | None = None
    link_url: str | None = None
    order_index: int
    is_active: bool
    start_at: datetime | None = None
    end_at: datetime | None = None
    created_at: datetime


class CmsBannerCreate(BaseModel):
    position: str = Field(pattern="^(hero|sub|footer)$")
    title: str = Field(min_length=1, max_length=200)
    subtitle: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    link_url: str | None = Field(default=None, max_length=500)
    order_index: int = 0
    is_active: bool = True
    start_at: datetime | None = None
    end_at: datetime | None = None


class CmsBannerUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    subtitle: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    link_url: str | None = Field(default=None, max_length=500)
    order_index: int | None = None
    is_active: bool | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
