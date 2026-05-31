"""USCP V2 — Community Comment Router (M05-08 시민 댓글 작성·수정).

설계 근거: feature-spec §M05-08 (댓글 작성=시민 회원 이상, 본인 댓글만 수정)

엔드포인트 (로그인 필요):
  - POST  /network/community/{post_id}/comments  (댓글 작성)
  - PATCH /network/community/comments/{comment_id} (본인 댓글 수정)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.community_service import (
    create_community_comment_v2,
    update_own_comment_v2,
)
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


class CreateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1)


class UpdateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1)


@router.post(
    "/community/{post_id}/comments",
    status_code=status.HTTP_201_CREATED,
    summary="M05-08 커뮤니티 댓글 작성 (로그인 시민 회원 이상)",
)
async def create_comment(
    post_id: str,
    body: CreateCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: post_not_found. 422: body_required."""
    return await create_community_comment_v2(
        db, post_id=post_id, author_id=str(current_user.id), body=body.body
    )


@router.patch(
    "/community/comments/{comment_id}",
    summary="M05-08 본인 댓글 수정 (작성자 본인만)",
)
async def update_comment(
    comment_id: str,
    body: UpdateCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """403: not_author. 404: comment_not_found."""
    return await update_own_comment_v2(
        db, comment_id=comment_id, user_id=str(current_user.id), body=body.body
    )
