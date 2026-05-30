"""USCP V2 — Issues Router (M02 제보·게이트키핑).

설계 근거:
  - feature-spec §M02-01 (지역문제 제보 등록)
  - design.md §4.2 M02
  - design.md §5.4 파일 업로드 흐름 (MinIO presigned)

V2 라우터:
  - POST /issues          — M02-01 제보 작성 (citizen+)
  - POST /issues/photos/presign — 사진 업로드 presigned URL 발급 (citizen+)

V1 호환:
  - 기존 V1 `/issues` GET/POST 는 V2 가 우선. V2 미정의 경로 (예: GET /issues/{id})는
    V1 라우터가 처리하므로 점진 마이그레이션 가능.
"""
from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.issue_service import submit_issue_v2
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.user import User

router = APIRouter()


# ───── Schemas ──────────────────────────────────────────────


RegionCode = Literal["daejeon", "gongju", "yesan", "cheonan", "sejong"]


class V2PhotoMeta(BaseModel):
    """업로드 완료된 사진 메타데이터 (presigned URL 업로드 후 클라이언트가 전달)."""

    minio_key: str = Field(..., description="MinIO 객체 키 (presigned 단계에서 발급)")
    filename: str = Field(..., min_length=1, max_length=200)
    mime_type: Literal["image/jpeg", "image/png", "image/webp"]
    size_bytes: int = Field(..., gt=0, le=5 * 1024 * 1024)


class V2SubmitIssueRequest(BaseModel):
    """M02-01 제보 작성 요청 본문."""

    region: RegionCode = Field(..., description="5개 지역 ENUM 코드")
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=10, max_length=5000)
    photos: list[V2PhotoMeta] = Field(
        default_factory=list,
        max_length=5,
        description="사진 첨부 (최대 5장 · 각 5MB · JPG/PNG/WebP)",
    )
    location_lat: float | None = Field(
        None, ge=-90, le=90, description="PostGIS 위도 (선택)"
    )
    location_lng: float | None = Field(
        None, ge=-180, le=180, description="PostGIS 경도 (선택)"
    )


class V2SubmitIssueResponse(BaseModel):
    issue_id: str
    stage: str = "reported"
    region: RegionCode
    created_at: str
    notification_enqueued: bool
    message: str = "제보가 등록되었습니다. 운영자 검토 후 단계가 변경되면 이메일로 안내드립니다."


class V2PhotoPresignRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=200)
    mime_type: Literal["image/jpeg", "image/png", "image/webp"]
    size_bytes: int = Field(..., gt=0, le=5 * 1024 * 1024)


class V2PhotoPresignResponse(BaseModel):
    upload_url: str = Field(..., description="MinIO PUT presigned URL (TTL 5분)")
    minio_key: str = Field(..., description="업로드 완료 후 제보 본문에 첨부할 키")
    expires_in_seconds: int = 300


# ───── Endpoints ────────────────────────────────────────────


@router.post(
    "",
    response_model=V2SubmitIssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="V2 제보 작성 (M02-01)",
    dependencies=[
        Depends(rate_limit(max_requests=10, window_seconds=3600, key_by="user")),
    ],
)
async def submit_issue(
    body: V2SubmitIssueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2SubmitIssueResponse:
    """제보 작성. 인증 필수 (citizen+).

    422 분기 (detail.code):
      - `invalid_region`, `invalid_title_length`, `invalid_body_length`
      - `too_many_photos`, `invalid_photo_mime`, `photo_too_large`
    429:
      - `spam_throttled`: 5분 내 같은 지역 3건 초과
    """
    result = await submit_issue_v2(
        db,
        reporter_id=str(current_user.id),
        reporter_email=current_user.email,
        reporter_name=current_user.name,
        region=body.region,
        title=body.title,
        body=body.body,
        photo_keys=[p.minio_key for p in body.photos],
        photo_meta=[p.model_dump() for p in body.photos],
        location_lat=body.location_lat,
        location_lng=body.location_lng,
    )
    return V2SubmitIssueResponse(**result)  # type: ignore[arg-type]


@router.post(
    "/photos/presign",
    response_model=V2PhotoPresignResponse,
    summary="V2 제보 사진 업로드 presigned URL (M02-01 사진 첨부)",
    dependencies=[
        # 사진 업로드 자체에도 IP rate limit (악용 차단)
        Depends(rate_limit(max_requests=30, window_seconds=3600, key_by="ip")),
    ],
)
async def presign_photo(
    body: V2PhotoPresignRequest,
    _db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2PhotoPresignResponse:
    """제보 사진 1장 업로드용 presigned PUT URL 발급.

    클라이언트 흐름:
      1) `POST /issues/photos/presign` (각 사진별 호출, 최대 5회)
      2) 반환된 `upload_url` 에 PUT (Content-Type 일치 필수)
      3) 모든 업로드 완료 후 `POST /issues` 본문에 `photos: [{minio_key, ...}, ...]` 포함

    MinIO 클라이언트 미설정 dev 환경에서는 stub URL 반환 (실 업로드는 prod 에서만).
    """
    # design.md §5.4: presigned URL TTL 5분, key 형식: issues/{user_id}/{uuid}.{ext}
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }
    ext = ext_map.get(body.mime_type, "bin")
    minio_key = f"issues/{current_user.id}/{uuid.uuid4().hex}.{ext}"

    try:
        # app.core.storage 또는 infrastructure/storage/ 의 MinIO 클라이언트 활용 (있을 경우)
        from app.core.storage import get_minio_client  # type: ignore

        client = get_minio_client()
        from app.core.config import settings

        upload_url = client.presigned_put_object(
            bucket_name=settings.minio_bucket,
            object_name=minio_key,
            expires=300,  # 5분
        )
    except Exception:  # noqa: BLE001 — MinIO 미설정 dev 환경 fallback
        # Stub URL — frontend 가 직접 업로드를 건너뛰고 minio_key 만 submit 본문에 포함
        upload_url = f"https://stub-minio/{minio_key}?stub=1"

    return V2PhotoPresignResponse(
        upload_url=upload_url,
        minio_key=minio_key,
        expires_in_seconds=300,
    )


# ════════════════════════════════════════════════════════════════
#  M02-02 ~ M02-05 — 목록·상세·공감·댓글 (Sprint 2 Day 2-3)
# ════════════════════════════════════════════════════════════════
from typing import Optional  # noqa: E402

from app.application.issue_service import (  # noqa: E402
    create_comment_v2,
    delete_comment_v2,
    get_issue_v2,
    list_comments_v2,
    list_issues_v2,
    vote_issue_v2,
)


class V2IssueListItem(BaseModel):
    id: str
    title: str
    body: str | None = None
    region: str | None = None
    stage: str | None = None
    track: str | None = None
    vote_count: int = 0
    comment_count: int = 0
    created_at: str


class V2IssueListResponse(BaseModel):
    data: list[V2IssueListItem]
    meta: dict


class V2IssueDetail(V2IssueListItem):
    reporter: dict
    location: dict | None = None
    voted: bool = False
    history: list[dict] = Field(default_factory=list)
    photos: list[dict] = Field(default_factory=list)
    # M03-14 양방향 연결 — 이 제보가 발전한 리빙랩 프로젝트 {id,title,stage}
    linked_project: dict | None = None


class V2VoteResponse(BaseModel):
    voted: bool
    vote_count: int


class V2CommentItem(BaseModel):
    id: str
    content: str
    is_deleted: bool
    author: dict
    created_at: str


class V2CommentListResponse(BaseModel):
    data: list[V2CommentItem]
    meta: dict


class V2CommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


@router.get(
    "",
    response_model=V2IssueListResponse,
    summary="V2 제보 목록 (M02-02)",
)
async def list_issues(
    region: Optional[str] = None,
    stage: Optional[str] = None,
    track: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "-created_at",
    limit: int = 20,
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> V2IssueListResponse:
    """제보 목록. 공개 (비로그인 가능)."""
    result = await list_issues_v2(
        db,
        region=region,
        stage=stage,
        track=track,
        q=q,
        sort=sort,
        limit=limit,
        cursor=cursor,
    )
    return V2IssueListResponse(**result)  # type: ignore[arg-type]


@router.get(
    "/{issue_id}",
    response_model=V2IssueDetail,
    summary="V2 제보 상세 (M02-03)",
)
async def get_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
) -> V2IssueDetail:
    """제보 상세. 공개 (비로그인 가능).

    본인 공감 여부 (`voted`) 는 Sprint 후반 optional auth 도입 시 채워 넣을 예정.
    현 시점 공감 토글 동기화는 frontend 가 `/issues/{id}/vote` 별도 호출로 처리.
    """
    result = await get_issue_v2(db, issue_id=issue_id, viewer_id=None)
    return V2IssueDetail(**result)  # type: ignore[arg-type]


@router.post(
    "/{issue_id}/vote",
    response_model=V2VoteResponse,
    summary="V2 공감 (M02-04)",
)
async def vote_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2VoteResponse:
    """공감 — 1인 1회 UNIQUE."""
    result = await vote_issue_v2(
        db,
        issue_id=issue_id,
        user_id=str(current_user.id),
        action="vote",
    )
    return V2VoteResponse(**result)  # type: ignore[arg-type]


@router.delete(
    "/{issue_id}/vote",
    response_model=V2VoteResponse,
    summary="V2 공감 취소 (M02-04)",
)
async def unvote_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2VoteResponse:
    """공감 취소."""
    result = await vote_issue_v2(
        db,
        issue_id=issue_id,
        user_id=str(current_user.id),
        action="unvote",
    )
    return V2VoteResponse(**result)  # type: ignore[arg-type]


@router.get(
    "/{issue_id}/comments",
    response_model=V2CommentListResponse,
    summary="V2 댓글 목록 (M02-05)",
)
async def list_comments(
    issue_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> V2CommentListResponse:
    result = await list_comments_v2(db, issue_id=issue_id, limit=limit)
    return V2CommentListResponse(**result)  # type: ignore[arg-type]


@router.post(
    "/{issue_id}/comments",
    response_model=V2CommentItem,
    status_code=status.HTTP_201_CREATED,
    summary="V2 댓글 작성 (M02-05)",
)
async def create_comment(
    issue_id: str,
    body: V2CommentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> V2CommentItem:
    result = await create_comment_v2(
        db,
        issue_id=issue_id,
        author_id=str(current_user.id),
        content=body.content,
    )
    # author name 채우기
    result["author"] = {"id": str(current_user.id), "name": current_user.name}
    return V2CommentItem(**result)  # type: ignore[arg-type]


@router.delete(
    "/comments/{comment_id}",
    summary="V2 댓글 삭제 — 작성자 본인 또는 운영자 (M02-05)",
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
        actor_role=str(current_user.role),
    )
