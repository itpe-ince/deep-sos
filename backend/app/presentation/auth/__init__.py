"""USCP V2 Presentation / auth — M01 회원·인증 V2 라우터.

설계 근거: docs/02-design/features/uscp-v2.design.md §4.2 M01

엔드포인트:
  - POST /auth/signup  — V2 통합 회원가입 (M01-01/02/03/13)
  - (V1 /auth/login, /auth/refresh, /auth/logout, /auth/password/* 등은 기존 V1 라우터 유지,
     Sprint 1 후반 단계에서 점진 마이그레이션)
"""
from app.presentation.auth.router import router

__all__ = ["router"]
