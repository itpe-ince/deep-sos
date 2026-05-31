"""USCP V2 — CMS Public/Citizen Router (M07-08/09 배너, M07-10/11 약관, M07-14 재동의).

설계 근거: design.md §4.2 M07 (`/banners`, `/terms/{kind}/current`, `/auth/reconsent*`)

공개:
  - GET /banners                  (M07-08 활성 배너 목록, order asc)
  - GET /terms/{kind}/current      (M07-10/11 현재 약관)
시민(로그인):
  - GET  /auth/reconsent/required  (M07-14 재동의 필요 여부)
  - POST /auth/reconsent           (M07-14 재동의 응답, 거부 시 force_logout)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.application.banner_service import list_banners_v2
from app.application.terms_service import (
    check_reconsent_required_v2,
    get_current_terms_v2,
    submit_reconsent_v2,
)
from app.core.database import get_db
from app.models.user import User

banners_router = APIRouter()
terms_router = APIRouter()
reconsent_router = APIRouter()


@banners_router.get("", summary="M07-08 활성 배너 목록 (공개)")
async def get_banners(db: AsyncSession = Depends(get_db)) -> dict:
    return await list_banners_v2(db, include_inactive=False)


@terms_router.get("/{kind}/current", summary="M07-10/11 현재 약관 (공개)")
async def get_current_terms(kind: str, db: AsyncSession = Depends(get_db)) -> dict:
    """kind: service(이용약관) | privacy(개인정보처리방침). 404: terms_not_found."""
    return await get_current_terms_v2(db, kind=kind)


@reconsent_router.get("/reconsent/required", summary="M07-14 재동의 필요 여부 (로그인)")
async def reconsent_required(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await check_reconsent_required_v2(db, user_id=str(current_user.id))


class ReconsentRequest(BaseModel):
    terms_ids: list[str] = Field(default_factory=list)
    accept: bool


@reconsent_router.post("/reconsent", summary="M07-14 재동의 응답 (로그인, 거부 시 force_logout)")
async def submit_reconsent(
    body: ReconsentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """accept=false → force_logout=true. accept=true → 동의 이력 기록."""
    return await submit_reconsent_v2(
        db, user_id=str(current_user.id), terms_ids=body.terms_ids, accept=body.accept
    )
