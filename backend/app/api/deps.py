"""Common FastAPI dependencies — 권한 체크 등."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.api.v1.auth import get_current_user
from app.models.user import User


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """role=admin 인증 dependency."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )
    return current_user
