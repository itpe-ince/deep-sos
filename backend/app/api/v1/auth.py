"""Auth endpoints — 회원가입, 로그인, 토큰 갱신, 내 정보, 비밀번호 재설정."""
from __future__ import annotations

import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from io import BytesIO

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.mailer import send_password_reset_email
from app.core.rate_limit import rate_limit
from app.core.token_blacklist import blacklist_jti, is_jti_blacklisted
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.storage import StorageError, upload_image
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    MessageResponse,
    PasswordForgotRequest,
    PasswordResetRequest,
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserRead,
    UserRegister,
    UserUpdate,
)
from app.services.auth_service import authenticate_user, issue_tokens, register_user

_logger = logging.getLogger(__name__)
_RESET_TOKEN_TTL_MINUTES = 30

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT → User 조회 dependency."""
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰 타입입니다.",
        )

    jti = payload.get("jti", "")
    if jti and await is_jti_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그아웃된 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    try:
        user_id = uuid.UUID(str(sub))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user id"
        ) from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다."
        )
    return user


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(rate_limit(max_requests=5, window_seconds=3600, key_by="ip"))
    ],
)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> User:
    """이메일 회원가입."""
    return await register_user(db, data)


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[
        Depends(rate_limit(max_requests=10, window_seconds=60, key_by="ip"))
    ],
)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """이메일 로그인 → JWT 발급."""
    user = await authenticate_user(db, data)
    return issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Refresh token으로 새 access token 발급."""
    try:
        payload = decode_token(body.refresh_token, is_refresh=True)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    refresh_jti = payload.get("jti", "")
    if refresh_jti and await is_jti_blacklisted(refresh_jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="로그아웃된 토큰입니다."
        )

    user_id = uuid.UUID(str(payload["sub"]))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다."
        )
    return issue_tokens(user)


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    """내 정보 조회."""
    return current_user


@router.put("/me", response_model=UserRead)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """내 정보 수정."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """프로필 이미지 업로드 → MinIO → profile_image_url 갱신."""
    body = await file.read()
    if not body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="빈 파일입니다."
        )
    try:
        url = upload_image(
            BytesIO(body),
            content_type=file.content_type or "application/octet-stream",
            size=len(body),
            folder="avatars",
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    current_user.profile_image_url = url
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/logout", response_model=MessageResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    _current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """로그아웃 — access 토큰 jti를 Redis 블랙리스트에 추가.

    Refresh 토큰은 별도로 POST /auth/logout/refresh 또는 클라이언트 폐기로 처리.
    """
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        return MessageResponse(message="로그아웃되었습니다.")

    jti = payload.get("jti", "")
    exp = payload.get("exp", 0)
    now_ts = int(datetime.now(UTC).timestamp())
    ttl = max(0, int(exp) - now_ts)
    if jti:
        await blacklist_jti(jti, ttl)
    return MessageResponse(message="로그아웃되었습니다.")


@router.post(
    "/password/forgot",
    response_model=MessageResponse,
    dependencies=[
        Depends(rate_limit(max_requests=10, window_seconds=3600, key_by="ip"))
    ],
)
async def password_forgot(
    data: PasswordForgotRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """비밀번호 재설정 토큰 발급.

    보안상 사용자 존재 여부와 관계없이 동일 응답 반환 (email enumeration 방지).
    dev 환경에서는 토큰을 서버 로그에 출력.
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user is not None and user.is_active:
        plain_token = secrets.token_urlsafe(32)
        token_hash = hash_password(plain_token)
        expires_at = datetime.now(UTC) + timedelta(minutes=_RESET_TOKEN_TTL_MINUTES)

        reset = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(reset)
        await db.commit()

        _logger.warning(
            "[PASSWORD_RESET] user=%s token=%s expires=%s",
            user.email,
            plain_token,
            expires_at.isoformat(),
        )

        try:
            await send_password_reset_email(user.email, plain_token)
        except Exception as exc:  # noqa: BLE001
            _logger.error("Failed to send reset email: %s", exc)

    return MessageResponse(
        message="이메일로 비밀번호 재설정 링크를 전송했습니다. (dev: 서버 로그 확인)"
    )


@router.post("/password/reset", response_model=MessageResponse)
async def password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """토큰으로 비밀번호 재설정."""
    now = datetime.now(UTC)
    result = await db.execute(
        select(PasswordResetToken)
        .where(
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.created_at.desc())
    )
    candidates = result.scalars().all()

    matched: PasswordResetToken | None = None
    for candidate in candidates:
        if verify_password(data.token, candidate.token_hash):
            matched = candidate
            break

    if matched is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않거나 만료된 토큰입니다.",
        )

    user = (
        await db.execute(select(User).where(User.id == matched.user_id))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="사용자를 찾을 수 없습니다.",
        )

    user.password_hash = hash_password(data.new_password)
    matched.used_at = now
    await db.commit()

    return MessageResponse(message="비밀번호가 변경되었습니다.")
