"""USCP V2 — Network Admin Router (M05-01/03/04/06/07/08/09, 운영자).

설계 근거: design.md §4.2 M05 (`/admin/organizations`, `/admin/mous`, `/admin/programs`, `/admin/community`)

엔드포인트:
  협력기관 : POST /admin/organizations, PATCH/DELETE /{id}, PATCH /{id}/active, POST /{id}/mou
  MOU      : GET /admin/mous/expiring, POST /admin/mous/notify-expiring
  프로그램 : GET/POST /admin/programs, DELETE /{id}
  커뮤니티 : POST/PATCH/DELETE /admin/community(/{id}), POST /admin/community/comments/{id}/moderate

댓글 작성(시민)은 별도 community_router 에서 처리.
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.community_service import (
    create_community_post_v2,
    delete_community_post_v2,
    moderate_comment_v2,
    update_community_post_v2,
)
from app.application.mou_service import (
    create_mou_v2,
    list_expiring_mous_v2,
    send_expiry_notifications_v2,
)
from app.application.organization_service import (
    create_organization_v2,
    delete_organization_v2,
    toggle_organization_active_v2,
    update_organization_v2,
)
from app.application.program_service import (
    create_program_v2,
    delete_program_v2,
    list_programs_v2,
)
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


def _require_operator(user: User) -> None:
    role = str(getattr(user, "role", "") or "").lower()
    if role not in ("operator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "operator_required", "message": "운영자만 접근 가능합니다."},
        )


# ── M05-01/09 협력기관 ──────────────────────────────────────────


class CreateOrgRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., description="public/industry/academic/government")
    region: str | None = None
    contact: str | None = Field(None, max_length=200)
    intro: str | None = None


class UpdateOrgRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    category: str | None = None
    region: str | None = None
    contact: str | None = None
    intro: str | None = None


class ToggleActiveRequest(BaseModel):
    is_active: bool


@router.post("/organizations", summary="M05-01 협력기관 등록 (운영자)")
async def create_org(
    body: CreateOrgRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_name/category/region."""
    _require_operator(current_user)
    return await create_organization_v2(
        db,
        operator_id=str(current_user.id),
        name=body.name,
        category=body.category,
        region=body.region,
        contact=body.contact,
        intro=body.intro,
    )


@router.patch("/organizations/{org_id}", summary="M05-01 협력기관 수정 (운영자)")
async def update_org(
    org_id: str,
    body: UpdateOrgRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: org_not_found."""
    _require_operator(current_user)
    return await update_organization_v2(
        db,
        operator_id=str(current_user.id),
        organization_id=org_id,
        name=body.name,
        category=body.category,
        region=body.region,
        contact=body.contact,
        intro=body.intro,
    )


@router.delete("/organizations/{org_id}", summary="M05-01 협력기관 삭제 (운영자, FK 가드)")
async def delete_org(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: org_not_found. 409: org_has_dependencies (MOU/프로그램 존재 → 토글 권장)."""
    _require_operator(current_user)
    return await delete_organization_v2(
        db, operator_id=str(current_user.id), organization_id=org_id
    )


@router.patch("/organizations/{org_id}/active", summary="M05-09 협력기관 활성·비활성 토글 (운영자)")
async def toggle_org_active(
    org_id: str,
    body: ToggleActiveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: org_not_found. MOU·프로그램 이력 유지."""
    _require_operator(current_user)
    return await toggle_organization_active_v2(
        db, operator_id=str(current_user.id), organization_id=org_id, is_active=body.is_active
    )


# ── M05-03/04 MOU ───────────────────────────────────────────────


class CreateMouRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    signed_at: date
    expires_at: date
    body: str | None = None
    attachment_key: str | None = Field(None, max_length=500)


@router.post("/organizations/{org_id}/mou", summary="M05-03 MOU 등록 (운영자)")
async def create_mou(
    org_id: str,
    body: CreateMouRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: org_not_found. 422: invalid_title/date_range(만료≤체결)."""
    _require_operator(current_user)
    return await create_mou_v2(
        db,
        operator_id=str(current_user.id),
        organization_id=org_id,
        title=body.title,
        signed_at=body.signed_at,
        expires_at=body.expires_at,
        body=body.body,
        attachment_key=body.attachment_key,
    )


@router.get("/mous/expiring", summary="M05-04 만료 임박 MOU 목록 (운영자)")
async def get_expiring_mous(
    within_days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_expiring_mous_v2(db, within_days=within_days)


@router.post("/mous/notify-expiring", summary="M05-04 만료 임박 알림 발송 (운영자/cron)")
async def notify_expiring_mous(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """만료 임박 MOU 알림을 현재 운영자 이메일로 발송 후 1회 발송 마킹.

    (시스템 자동 발송은 배포 시 시스템 cron 이 본 엔드포인트를 호출하도록 구성)
    """
    _require_operator(current_user)
    email = getattr(current_user, "email", None)
    return await send_expiry_notifications_v2(
        db, operator_emails=[email] if email else []
    )


# ── M05-06 프로그램 ─────────────────────────────────────────────


class CreateProgramRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    linked_project_id: str | None = None
    linked_mentor_id: str | None = None
    linked_team_id: str | None = None
    linked_organization_id: str | None = None


@router.get("/programs", summary="M05-06 프로그램 목록 (운영자)")
async def get_programs(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await list_programs_v2(db, limit=limit, offset=offset)


@router.post("/programs", summary="M05-06 프로그램 통합 운영 등록 (운영자)")
async def create_program(
    body: CreateProgramRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """422: invalid_name."""
    _require_operator(current_user)
    return await create_program_v2(
        db,
        operator_id=str(current_user.id),
        name=body.name,
        description=body.description,
        linked_project_id=body.linked_project_id,
        linked_mentor_id=body.linked_mentor_id,
        linked_team_id=body.linked_team_id,
        linked_organization_id=body.linked_organization_id,
    )


@router.delete("/programs/{program_id}", summary="M05-06 프로그램 삭제 (운영자)")
async def delete_program(
    program_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: program_not_found."""
    _require_operator(current_user)
    return await delete_program_v2(
        db, operator_id=str(current_user.id), program_id=program_id
    )


# ── M05-07/08 커뮤니티 (운영자 작성·조정) ───────────────────────


class CreatePostRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)
    is_pinned: bool = False


class UpdatePostRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    body: str | None = None
    is_pinned: bool | None = None


class ModerateCommentRequest(BaseModel):
    action: str = Field(..., description="hide / unhide / delete")


@router.post("/community", summary="M05-07 커뮤니티 게시글 작성 (운영자)")
async def create_post(
    body: CreatePostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_operator(current_user)
    return await create_community_post_v2(
        db, operator_id=str(current_user.id), title=body.title, body=body.body, is_pinned=body.is_pinned
    )


@router.patch("/community/{post_id}", summary="M05-07 커뮤니티 게시글 수정 (운영자)")
async def update_post(
    post_id: str,
    body: UpdatePostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: post_not_found."""
    _require_operator(current_user)
    return await update_community_post_v2(
        db,
        operator_id=str(current_user.id),
        post_id=post_id,
        title=body.title,
        body=body.body,
        is_pinned=body.is_pinned,
    )


@router.delete("/community/{post_id}", summary="M05-07 커뮤니티 게시글 삭제 (운영자)")
async def delete_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: post_not_found."""
    _require_operator(current_user)
    return await delete_community_post_v2(
        db, operator_id=str(current_user.id), post_id=post_id
    )


@router.post(
    "/community/comments/{comment_id}/moderate",
    summary="M05-08 커뮤니티 댓글 조정 (운영자, hide/unhide/delete)",
)
async def moderate_comment(
    comment_id: str,
    body: ModerateCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """404: comment_not_found. 422: invalid_action."""
    _require_operator(current_user)
    return await moderate_comment_v2(
        db, operator_id=str(current_user.id), comment_id=comment_id, action=body.action
    )
