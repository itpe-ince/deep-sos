"""OAuth 공통 서비스 — Sprint 4 Day 5.

카카오/네이버/구글 3종 provider 어댑터. `fetch_user(provider, code)`가
code를 access_token으로 교환한 뒤 profile을 조회해 `OAuthUser`를 반환한다.

환경변수 `{PROVIDER}_CLIENT_ID`/`SECRET`/`REDIRECT_URI`가 미설정이면
`OAuthNotConfigured`를 raise — 호출자는 501로 응답.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import httpx

from app.core.config import settings

Provider = Literal["kakao", "naver", "google"]


class OAuthNotConfigured(Exception):
    """Provider client_id/secret 미설정."""


class OAuthError(Exception):
    """Provider 호출 실패 (네트워크/인증/사용자 거부)."""


@dataclass
class OAuthUser:
    provider: Provider
    oauth_id: str
    email: str | None
    name: str
    profile_image_url: str | None


def _require_config(provider: Provider) -> tuple[str, str, str]:
    if provider == "kakao":
        cid = settings.kakao_client_id
        secret = settings.kakao_client_secret
        redirect = settings.kakao_redirect_uri
    elif provider == "naver":
        cid = settings.naver_client_id
        secret = settings.naver_client_secret
        redirect = settings.naver_redirect_uri
    elif provider == "google":
        cid = settings.google_client_id
        secret = settings.google_client_secret
        redirect = settings.google_redirect_uri
    else:
        raise OAuthError(f"Unknown provider: {provider}")

    if not cid:
        raise OAuthNotConfigured(f"{provider} client_id not set")
    return cid, secret, redirect


async def fetch_user(provider: Provider, code: str) -> OAuthUser:
    cid, secret, redirect = _require_config(provider)
    if provider == "kakao":
        return await _fetch_kakao(cid, secret, redirect, code)
    if provider == "naver":
        return await _fetch_naver(cid, secret, redirect, code)
    if provider == "google":
        return await _fetch_google(cid, secret, redirect, code)
    raise OAuthError(f"Unsupported provider: {provider}")


async def _fetch_kakao(
    client_id: str, client_secret: str, redirect_uri: str, code: str
) -> OAuthUser:
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": client_id,
                "client_secret": client_secret or None,
                "redirect_uri": redirect_uri,
                "code": code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise OAuthError(f"kakao token exchange failed: {token_res.text}")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise OAuthError("kakao token response missing access_token")

        user_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            raise OAuthError(f"kakao user fetch failed: {user_res.text}")
        profile = user_res.json()
        account = profile.get("kakao_account", {}) or {}
        k_profile = account.get("profile", {}) or {}

    return OAuthUser(
        provider="kakao",
        oauth_id=str(profile.get("id")),
        email=account.get("email"),
        name=k_profile.get("nickname") or f"kakao_{profile.get('id')}",
        profile_image_url=k_profile.get("profile_image_url"),
    )


async def _fetch_naver(
    client_id: str, client_secret: str, redirect_uri: str, code: str
) -> OAuthUser:
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.get(
            "https://nid.naver.com/oauth2.0/token",
            params={
                "grant_type": "authorization_code",
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
        )
        if token_res.status_code != 200:
            raise OAuthError(f"naver token exchange failed: {token_res.text}")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise OAuthError("naver token response missing access_token")

        user_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            raise OAuthError(f"naver user fetch failed: {user_res.text}")
        body = user_res.json()
        resp = body.get("response", {}) or {}

    return OAuthUser(
        provider="naver",
        oauth_id=str(resp.get("id")),
        email=resp.get("email"),
        name=resp.get("name") or resp.get("nickname") or f"naver_{resp.get('id')}",
        profile_image_url=resp.get("profile_image"),
    )


async def _fetch_google(
    client_id: str, client_secret: str, redirect_uri: str, code: str
) -> OAuthUser:
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "authorization_code",
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )
        if token_res.status_code != 200:
            raise OAuthError(f"google token exchange failed: {token_res.text}")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise OAuthError("google token response missing access_token")

        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            raise OAuthError(f"google user fetch failed: {user_res.text}")
        profile = user_res.json()

    return OAuthUser(
        provider="google",
        oauth_id=str(profile.get("id")),
        email=profile.get("email"),
        name=profile.get("name") or f"google_{profile.get('id')}",
        profile_image_url=profile.get("picture"),
    )
