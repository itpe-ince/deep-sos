"""USCP V2 — Auth Router (M01-01/02/03/13).

설계 근거:
  - feature-spec §M01-01 (이메일 회원가입)
  - feature-spec §M01-02 (만 14세 이상 확인)
  - feature-spec §M01-03 (개인정보·이용약관 통합 동의)
  - feature-spec §M01-13 (비밀번호 보안 정책)
  - design.md §4.2 M01 + §5.1 인증·세션 흐름

본 V2 라우터는 V1 `app/api/v1/auth.py` 의 신규 가입 경로 (`/auth/register`)
를 대체하지 않고, V2 전용 `/auth/signup` 으로 신설.
로그인·로그아웃·비밀번호 재설정 등 다른 인증 흐름은 V1 라우터 유지.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.auth_service import login_v2, signup_v2
from app.core.database import get_db
from app.core.rate_limit import rate_limit

router = APIRouter()


# ───── Schemas ──────────────────────────────────────────────


class V2Agreements(BaseModel):
    """M01-03 통합 동의 입력 (privacy/service 양쪽 필수)."""

    privacy: bool = Field(
        ...,
        description="개인정보 수집·이용 동의 — 회원가입 진행을 위해 필수",
    )
    service: bool = Field(
        ...,
        description="이용약관 동의 — 회원가입 진행을 위해 필수",
    )


class V2SignupRequest(BaseModel):
    """M01-01 회원가입 요청 본문.

    V1 `/auth/register` 의 role/campus_code 와 달리 본 요청은 시민 회원만
    생성한다. mentor/student/operator 자격은 운영자가 별도 grant 한다.
    """

    email: EmailStr = Field(..., description="이메일 주소 — 로그인 ID, 인증 메일 수신지")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="M01-13 비밀번호 (8자 이상 + 영문/숫자/특수문자 조합)",
    )
    name: str = Field(..., min_length=2, max_length=20)
    birth_year: int = Field(
        ...,
        ge=1900,
        le=9999,
        description="M01-02 만 14세 확인용 (current_year - birth_year >= 14)",
    )
    agreements: V2Agreements


class V2SignupResponse(BaseModel):
    user_id: str
    email: str
    name: str
    email_verification_sent: bool
    message: str = "회원가입이 완료되었습니다. 이메일 인증 메일을 확인해 주세요."


class V2LoginRequest(BaseModel):
    """M01-04 이메일 로그인 요청."""

    email: EmailStr = Field(..., description="가입 이메일")
    password: str = Field(..., min_length=1, max_length=128)


class V2LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="access_token 유효시간 (초)")
    needs_reconsent: bool = Field(
        False,
        description="M07-14 — 신 버전 약관 미동의 시 true. 프론트는 ReconsentModal 노출.",
    )


# ───── Endpoints ────────────────────────────────────────────


@router.post(
    "/signup",
    response_model=V2SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="V2 통합 회원가입 (M01-01/02/03/13)",
    dependencies=[
        # design.md §8.2: 회원가입 rate limit — 시간당 IP 당 5회
        Depends(rate_limit(max_requests=5, window_seconds=3600, key_by="ip")),
    ],
)
async def signup(
    body: V2SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> V2SignupResponse:
    """이메일 회원가입.

    422 응답 detail 의 `code` 값으로 분기:
      - `agreements_required`: 통합 동의 누락
      - `age_below_minimum`: 만 14세 미만
      - `password_too_weak`: 비밀번호 복잡도 위반
    409 응답:
      - `email_already_registered`: 이메일 중복
    """
    result = await signup_v2(
        db,
        email=body.email,
        password=body.password,
        name=body.name,
        birth_year=body.birth_year,
        privacy_agreed=body.agreements.privacy,
        service_agreed=body.agreements.service,
    )
    return V2SignupResponse(**result)  # type: ignore[arg-type]


@router.post(
    "/login",
    response_model=V2LoginResponse,
    summary="V2 이메일 로그인 + 5회 잠금 정책 (M01-04/13)",
    dependencies=[
        # design.md §6.3·§8.2: 로그인 IP당 5req/min — middleware/rate_limit 글로벌 정책과
        # 별개로 endpoint-level 가중 보호.
        Depends(rate_limit(max_requests=5, window_seconds=60, key_by="ip")),
    ],
    responses={
        401: {"description": "이메일 또는 비밀번호 불일치 (잔여 시도 횟수 포함)"},
        403: {"description": "이용정지·탈퇴 계정"},
        423: {
            "description": "5회 연속 실패 잠금 (locked_until + Retry-After)",
        },
    },
)
async def login(
    body: V2LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> V2LoginResponse:
    """이메일 로그인.

    응답:
      - 200: V2LoginResponse — access/refresh + needs_reconsent
      - 401: detail.code='invalid_credentials' + remaining_attempts
      - 403: detail.code='account_disabled' + user_status
      - 423: detail.code='account_locked' + locked_until + Retry-After 헤더
    """
    result = await login_v2(db, email=body.email, password=body.password)
    return V2LoginResponse(**result)  # type: ignore[arg-type]
