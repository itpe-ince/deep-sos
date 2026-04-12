"""Issue interaction models — 투표, 댓글 (BF-1 Sprint 2)."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKey


class IssueVote(UUIDPrimaryKey, TimestampMixin, Base):
    """이슈 공감(투표). 사용자당 이슈 1표."""

    __tablename__ = "issue_votes"
    __table_args__ = (
        UniqueConstraint("issue_id", "user_id", name="uq_issue_votes_issue_user"),
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )


class IssueComment(UUIDPrimaryKey, TimestampMixin, Base):
    """이슈 댓글. 대댓글은 parent_id로 1단계 지원."""

    __tablename__ = "issue_comments"

    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("issue_comments.id", ondelete="CASCADE"),
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
