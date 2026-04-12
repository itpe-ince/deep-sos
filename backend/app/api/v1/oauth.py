"""OAuth endpoints — Kakao / Naver / Google (Sprint 4 실연동).

Sprint 1: 501 stub
Sprint 4 Day 5: 실제 code → token → userinfo → User upsert → JWT 발급 → 프론트 redirect

client_id/secret 미설정 시 기존 501 동작 유지.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import cast
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.services.oauth_service import (
    OAuthError,
    OAuthNotConfigured,
    Provider,
    fetch_user,
)

router = APIRouter()

_PROVIDER_AUTH_URL = {
    "kakao": "https://kauth.kakao.com/oauth/authorize",
    "naver": "https://nid.naver.com/oauth2.0/authorize",
    "google": "https://accounts.google.com/o/oauth2/v2/auth",
}


def _client_config(provider: str) -> tuple[str, str]:
    mapping = {
        "kakao": (settings.kakao_client_id, settings.kakao_redirect_uri),
        "naver": (settings.naver_client_id, settings.naver_redirect_uri),
        "google": (settings.google_client_id, settings.google_redirect_uri),
    }
    if provider not in mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown provider: {provider}"
        )
    return mapping[provider]


@router.get("/oauth/{provider}")
async def oauth_start(provider: str) -> RedirectResponse:
    client_id, redirect_uri = _client_config(provider)
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"{provider} OAuth is not configured yet",
        )
    base = _PROVIDER_AUTH_URL[provider]
    scope = "profile email" if provider == "google" else "profile"
    url = (
        f"{base}?response_type=code&client_id={client_id}"
        f"&redirect_uri={redirect_uri}&scope={scope}"
    )
    return RedirectResponse(url)


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"OAuth error: {error}"
        )
    if provider not in _PROVIDER_AUTH_URL:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown provider: {provider}"
        )
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code"
        )

    try:
        oauth_user = await fetch_user(cast(Provider, provider), code)
    except OAuthNotConfigured:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"{provider} OAuth is not configured yet",
        )
    except OAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth failure: {exc}",
        ) from exc

    # User upsert
    result = await db.execute(
        select(User).where(
            User.oauth_provider == provider,
            User.oauth_id == oauth_user.oauth_id,
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        # 이메일 중복 체크 (같은 이메일에 다른 provider 연결 방지)
        if oauth_user.email:
            existing_email = (
                await db.execute(select(User).where(User.email == oauth_user.email))
            ).scalar_one_or_none()
            if existing_email is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"해당 이메일은 이미 다른 방법으로 가입되어 있습니다. "
                        f"기존 계정으로 로그인 후 소셜 계정을 연결해주세요."
                    ),
                )

        user = User(
            email=oauth_user.email or f"{provider}_{oauth_user.oauth_id}@oauth.local",
            name=oauth_user.name,
            role="citizen",
            oauth_provider=provider,
            oauth_id=oauth_user.oauth_id,
            profile_image_url=oauth_user.profile_image_url,
            email_verified=bool(oauth_user.email),
        )
        db.add(user)
    else:
        # 프로필 갱신
        if oauth_user.profile_image_url:
            user.profile_image_url = oauth_user.profile_image_url

    user.last_login_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)

    access = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email},
    )
    refresh = create_refresh_token(subject=user.id)

    frontend_callback = f"{settings.frontend_url}/auth/oauth/{provider}"
    query = urlencode({"token": access, "refresh": refresh})
    return RedirectResponse(f"{frontend_callback}?{query}")
