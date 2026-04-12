"""Campus model — 4개 캠퍼스 (대전/공주/예산/세종)."""
from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class Campus(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "campuses"

    name: Mapped[str] = mapped_column(String(50), nullable=False)  # 대전/공주/예산/세종
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # DJ/GJ/YS/SJ
    livinglab_type: Mapped[str | None] = mapped_column(String(100))  # 청년정착/문화재생/...
    region: Mapped[str | None] = mapped_column(String(100))  # 연계 지자체
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<Campus {self.code}: {self.name}>"
