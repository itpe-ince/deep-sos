"""USCP V2 Presentation / projects — M03 리빙랩 운영 V2 라우터.

설계 근거: docs/02-design/features/uscp-v2.design.md §4.2 M03
"""
from app.presentation.projects.admin_router import router as admin_router
from app.presentation.projects.router import router

__all__ = ["router", "admin_router"]
