"""USCP V2 Presentation / issues — M02 제보·게이트키핑 V2 라우터.

설계 근거: docs/02-design/features/uscp-v2.design.md §4.2 M02
"""
from app.presentation.issues.admin_router import router as admin_router
from app.presentation.issues.router import router

__all__ = ["router", "admin_router"]
