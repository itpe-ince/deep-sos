"""Issue endpoints — BF-1 지역 문제 (읽기 + Sprint 2 쓰기)."""
from __future__ import annotations

import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.pagination import paginated
from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.core.storage import StorageError, upload_image
from app.models.issue import Issue
from app.models.issue_interaction import IssueComment, IssueVote
from app.models.user import User
from app.services.notification_service import create_notification
from app.schemas.content import IssueRead
from app.schemas.issue_write import (
    IssueCommentCreate,
    IssueCommentRead,
    IssueVoteResponse,
)

router = APIRouter()

_ALLOWED_CATEGORIES = {"environment", "safety", "transport", "welfare", "culture", "other"}


# ─────────────────────────────────────────────────
# 읽기
# ─────────────────────────────────────────────────


@router.get("")
async def list_issues(
    campus_id: uuid.UUID | None = None,
    category: str | None = None,
    issue_status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(Issue)
    if campus_id:
        stmt = stmt.where(Issue.campus_id == campus_id)
    if category:
        stmt = stmt.where(Issue.category == category)
    if issue_status:
        stmt = stmt.where(Issue.status == issue_status)

    total = (
        await db.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    stmt = stmt.order_by(Issue.created_at.desc()).limit(size).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    items = [IssueRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.get("/{issue_id}", response_model=IssueRead)
async def get_issue(issue_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Issue:
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    issue.view_count += 1
    await db.commit()
    await db.refresh(issue)
    return issue


# ─────────────────────────────────────────────────
# 쓰기 — POST (multipart)
# ─────────────────────────────────────────────────


@router.post(
    "",
    response_model=IssueRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            rate_limit(max_requests=10, window_seconds=3600, key_by="user")
        )
    ],
)
async def create_issue(
    title: str = Form(..., min_length=5, max_length=200),
    description: str = Form(..., min_length=10),
    category: str = Form(...),
    campus_id: uuid.UUID | None = Form(default=None),
    location_address: str | None = Form(default=None),
    location_lat: float | None = Form(default=None),
    location_lng: float | None = Form(default=None),
    is_anonymous: bool = Form(default=False),
    images: list[UploadFile] = File(default_factory=list),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Issue:
    if category not in _ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"category must be one of {sorted(_ALLOWED_CATEGORIES)}",
        )
    if len(images) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="최대 5장까지 업로드 가능합니다.",
        )

    # 이미지 업로드 (있는 경우)
    image_urls: list[str] = []
    for upload in images:
        if not upload.filename:
            continue
        body = await upload.read()
        if not body:
            continue
        try:
            url = upload_image(
                __import__("io").BytesIO(body),
                content_type=upload.content_type or "application/octet-stream",
                size=len(body),
                folder="issues",
            )
        except StorageError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            ) from exc
        image_urls.append(url)

    issue = Issue(
        title=title,
        description=description,
        category=category,
        status="submitted",
        priority="normal",
        campus_id=campus_id or current_user.campus_id,
        author_id=current_user.id,
        location_address=location_address,
        location_lat=location_lat,
        location_lng=location_lng,
        image_urls=image_urls or None,
        is_anonymous=is_anonymous,
    )
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    return issue


# ─────────────────────────────────────────────────
# 쓰기 — 투표 토글
# ─────────────────────────────────────────────────


@router.get("/{issue_id}/vote", response_model=IssueVoteResponse)
async def get_vote_status(
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IssueVoteResponse:
    """현재 로그인 사용자의 투표 상태 조회."""
    issue = (
        await db.execute(select(Issue).where(Issue.id == issue_id))
    ).scalar_one_or_none()
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    existing = (
        await db.execute(
            select(IssueVote).where(
                IssueVote.issue_id == issue_id, IssueVote.user_id == current_user.id
            )
        )
    ).scalar_one_or_none()
    return IssueVoteResponse(voted=existing is not None, vote_count=issue.vote_count)


@router.post(
    "/{issue_id}/vote",
    response_model=IssueVoteResponse,
    dependencies=[
        Depends(rate_limit(max_requests=30, window_seconds=60, key_by="user"))
    ],
)
async def vote_issue(
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IssueVoteResponse:
    issue = (await db.execute(select(Issue).where(Issue.id == issue_id))).scalar_one_or_none()
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    existing = (
        await db.execute(
            select(IssueVote).where(
                IssueVote.issue_id == issue_id, IssueVote.user_id == current_user.id
            )
        )
    ).scalar_one_or_none()

    if existing is not None:
        return IssueVoteResponse(voted=True, vote_count=issue.vote_count)

    db.add(IssueVote(issue_id=issue_id, user_id=current_user.id))
    issue.vote_count += 1
    await db.commit()
    await db.refresh(issue)
    return IssueVoteResponse(voted=True, vote_count=issue.vote_count)


@router.delete("/{issue_id}/vote", response_model=IssueVoteResponse)
async def unvote_issue(
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IssueVoteResponse:
    issue = (await db.execute(select(Issue).where(Issue.id == issue_id))).scalar_one_or_none()
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    existing = (
        await db.execute(
            select(IssueVote).where(
                IssueVote.issue_id == issue_id, IssueVote.user_id == current_user.id
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        return IssueVoteResponse(voted=False, vote_count=issue.vote_count)

    await db.delete(existing)
    issue.vote_count = max(0, issue.vote_count - 1)
    await db.commit()
    await db.refresh(issue)
    return IssueVoteResponse(voted=False, vote_count=issue.vote_count)


# ─────────────────────────────────────────────────
# 쓰기 — 댓글
# ─────────────────────────────────────────────────


@router.get("/{issue_id}/comments")
async def list_comments(
    issue_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    base = select(IssueComment).where(IssueComment.issue_id == issue_id)
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    offset = (page - 1) * size
    stmt = base.order_by(IssueComment.created_at.asc()).limit(size).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    items = [IssueCommentRead.model_validate(r).model_dump(mode="json") for r in rows]
    return paginated(items, total, page, size)


@router.post(
    "/{issue_id}/comments",
    response_model=IssueCommentRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(rate_limit(max_requests=30, window_seconds=60, key_by="user"))
    ],
)
async def create_comment(
    issue_id: uuid.UUID,
    data: IssueCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IssueComment:
    issue = (await db.execute(select(Issue).where(Issue.id == issue_id))).scalar_one_or_none()
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    if data.parent_id is not None:
        parent = (
            await db.execute(
                select(IssueComment).where(
                    IssueComment.id == data.parent_id,
                    IssueComment.issue_id == issue_id,
                )
            )
        ).scalar_one_or_none()
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="parent comment not found in this issue",
            )

    comment = IssueComment(
        issue_id=issue_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content,
    )
    db.add(comment)
    issue.comment_count += 1

    # 이슈 작성자에게 알림 (본인 제외)
    if issue.author_id is not None and issue.author_id != current_user.id:
        await create_notification(
            db,
            user_id=issue.author_id,
            type="issue_comment",
            title=f"{current_user.name}님이 내 이슈에 댓글을 남겼어요",
            body=data.content[:100],
            link_url=f"/issues/{issue_id}",
        )

    await db.commit()
    await db.refresh(comment)
    return comment


@router.delete(
    "/{issue_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_comment(
    issue_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    comment = (
        await db.execute(
            select(IssueComment).where(
                IssueComment.id == comment_id, IssueComment.issue_id == issue_id
            )
        )
    ).scalar_one_or_none()
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
        )

    is_author = comment.author_id == current_user.id
    is_admin = current_user.role == "admin"
    if not (is_author or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="작성자 또는 관리자만 삭제할 수 있습니다.",
        )

    comment.is_deleted = True
    comment.content = "[삭제된 댓글입니다]"

    # comment_count 감소
    issue = (await db.execute(select(Issue).where(Issue.id == issue_id))).scalar_one_or_none()
    if issue is not None:
        issue.comment_count = max(0, issue.comment_count - 1)

    await db.commit()
