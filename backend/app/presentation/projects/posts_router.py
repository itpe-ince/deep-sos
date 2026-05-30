"""USCP V2 — Project Board Router (M03-15~18 멤버 전용 게시판).

설계 근거:
  - feature-spec §M03-15~18
  - design.md §4.2 M03 posts/comments endpoints

마운트:
  - router          → prefix "/projects"  (게시글·댓글 작성/조회/첨부)
  - comments_router → prefix "/comments"  (댓글 단건 수정·삭제)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.project_post_service import (
    create_comment_v2,
    create_post_v2,
    delete_comment_v2,
    delete_post_v2,
    get_post_v2,
    list_comments_v2,
    list_posts_v2,
    presign_post_attachment_v2,
    update_comment_v2,
    update_post_v2,
)
from app.core.database import get_db
from app.models.user import User

router = APIRouter()
comments_router = APIRouter()


def _role(user: User) -> str:
    return str(getattr(user, "role", "") or "")


# ── 요청 스키마 ──────────────────────────────────────────────


class V2CreatePostRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=5_000)
    attachment_key: str | None = Field(None, max_length=500)
    attachment_filename: str | None = Field(None, max_length=255)
    is_pinned: bool = False


class V2UpdatePostRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=100)
    body: str | None = Field(None, min_length=1, max_length=5_000)
    is_pinned: bool | None = None


class V2PostAttachmentPresignRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1, max_length=100)
    size_bytes: int = Field(..., gt=0, le=20 * 1024 * 1024)


class V2CreateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=1_000)


class V2UpdateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=1_000)


# ── M03-16 목록·상세 ─────────────────────────────────────────


@router.get("/{project_id}/posts", summary="M03-16 게시글 목록 (멤버 전용)")
async def list_posts(
    project_id: str,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await list_posts_v2(
        db,
        project_id=project_id,
        user_id=str(current_user.id),
        user_role=_role(current_user),
        limit=limit,
        offset=offset,
    )


@router.get("/{project_id}/posts/{post_id}", summary="M03-16 게시글 상세 (멤버 전용)")
async def get_post(
    project_id: str,
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await get_post_v2(
        db,
        project_id=project_id,
        post_id=post_id,
        user_id=str(current_user.id),
        user_role=_role(current_user),
    )


# ── M03-15 작성·수정·삭제 ────────────────────────────────────


@router.post(
    "/{project_id}/posts",
    status_code=status.HTTP_201_CREATED,
    summary="M03-15 게시글 작성 (멤버 전용)",
)
async def create_post(
    project_id: str,
    body: V2CreatePostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await create_post_v2(
        db,
        project_id=project_id,
        author_id=str(current_user.id),
        author_role=_role(current_user),
        title=body.title,
        body=body.body,
        attachment_key=body.attachment_key,
        attachment_filename=body.attachment_filename,
        is_pinned=body.is_pinned,
    )


@router.patch(
    "/{project_id}/posts/{post_id}",
    summary="M03-15 게시글 수정 (작성자/운영자)",
)
async def update_post(
    project_id: str,
    post_id: str,
    body: V2UpdatePostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await update_post_v2(
        db,
        project_id=project_id,
        post_id=post_id,
        actor_id=str(current_user.id),
        actor_role=_role(current_user),
        title=body.title,
        body=body.body,
        is_pinned=body.is_pinned,
    )


@router.delete(
    "/{project_id}/posts/{post_id}",
    summary="M03-15 게시글 삭제 (작성자/운영자, soft delete)",
)
async def delete_post(
    project_id: str,
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await delete_post_v2(
        db,
        project_id=project_id,
        post_id=post_id,
        actor_id=str(current_user.id),
        actor_role=_role(current_user),
    )


# ── M03-18 첨부파일 presigned URL ────────────────────────────


@router.post(
    "/{project_id}/posts/attachment/presign",
    summary="M03-18 게시글 첨부 presigned URL (멤버 전용, 20MB)",
)
async def presign_post_attachment(
    project_id: str,
    body: V2PostAttachmentPresignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await presign_post_attachment_v2(
        db,
        project_id=project_id,
        user_id=str(current_user.id),
        user_role=_role(current_user),
        filename=body.filename,
        content_type=body.content_type,
        size_bytes=body.size_bytes,
    )


# ── M03-17 댓글 ──────────────────────────────────────────────


@router.get(
    "/{project_id}/posts/{post_id}/comments",
    summary="M03-17 댓글 목록 (멤버 전용)",
)
async def list_comments(
    project_id: str,
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await list_comments_v2(
        db,
        project_id=project_id,
        post_id=post_id,
        user_id=str(current_user.id),
        user_role=_role(current_user),
    )


@router.post(
    "/{project_id}/posts/{post_id}/comments",
    status_code=status.HTTP_201_CREATED,
    summary="M03-17 댓글 작성 (멤버 전용)",
)
async def create_comment(
    project_id: str,
    post_id: str,
    body: V2CreateCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await create_comment_v2(
        db,
        project_id=project_id,
        post_id=post_id,
        author_id=str(current_user.id),
        author_role=_role(current_user),
        body=body.body,
    )


@comments_router.patch(
    "/project-posts/{comment_id}",
    summary="M03-17 댓글 수정 (작성자/운영자)",
)
async def update_comment(
    comment_id: str,
    body: V2UpdateCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await update_comment_v2(
        db,
        comment_id=comment_id,
        actor_id=str(current_user.id),
        actor_role=_role(current_user),
        body=body.body,
    )


@comments_router.delete(
    "/project-posts/{comment_id}",
    summary="M03-17 댓글 삭제 (작성자/운영자, soft delete)",
)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    return await delete_comment_v2(
        db,
        comment_id=comment_id,
        actor_id=str(current_user.id),
        actor_role=_role(current_user),
    )
