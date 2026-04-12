"""Auth-related Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

UserRole = Literal[
    "student", "professor", "staff", "citizen", "gov_officer", "enterprise", "admin"
]


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=2, max_length=100)
    role: UserRole = "citizen"
    campus_code: str | None = Field(default=None, max_length=10)
    department: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # seconds


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    name: str
    role: str
    campus_id: uuid.UUID | None = None
    department: str | None = None
    profile_image_url: str | None = None
    level: str
    points: int
    is_active: bool
    email_verified: bool
    created_at: datetime


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordForgotRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str = Field(min_length=16, max_length=255)
    new_password: str = Field(min_length=8, max_length=72)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    organization: str | None = Field(default=None, max_length=200)
    profile_image_url: str | None = Field(default=None, max_length=500)


class MessageResponse(BaseModel):
    message: str
