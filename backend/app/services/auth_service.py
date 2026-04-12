"""Authentication business logic."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.campus import Campus
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLogin, UserRegister


async def register_user(db: AsyncSession, data: UserRegister) -> User:
    """새 사용자 등록."""
    # 이메일 중복 확인
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 등록된 이메일입니다.",
        )

    campus_id: uuid.UUID | None = None
    if data.campus_code:
        campus_result = await db.execute(
            select(Campus).where(Campus.code == data.campus_code)
        )
        campus = campus_result.scalar_one_or_none()
        if campus:
            campus_id = campus.id

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        role=data.role,
        campus_id=campus_id,
        department=data.department,
        oauth_provider="email",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, data: UserLogin) -> User:
    """이메일+비밀번호 인증."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다.",
        )

    user.last_login_at = datetime.now(UTC)
    await db.flush()
    return user


def issue_tokens(user: User) -> TokenResponse:
    """Access + Refresh 토큰 발급."""
    from app.core.config import settings

    access = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email},
    )
    refresh = create_refresh_token(subject=user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )
