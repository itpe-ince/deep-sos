"""USCP V2 Presentation Layer — Middleware.

설계 근거: docs/02-design/features/uscp-v2.design.md §6.3 (미들웨어 체인)

체인 순서 (요청 진입 순):
    CORS → RequestId → JwtAuth → ReconsentCheck → RateLimit → Audit → Router

FastAPI add_middleware 는 LIFO 로 실행되므로 main.py 에서 역순 등록 필요.
"""
from app.presentation.middleware.audit import AuditMiddleware
from app.presentation.middleware.jwt_auth import JwtAuthMiddleware
from app.presentation.middleware.rate_limit import RateLimitMiddleware
from app.presentation.middleware.reconsent_check import ReconsentCheckMiddleware

__all__ = [
    "AuditMiddleware",
    "JwtAuthMiddleware",
    "RateLimitMiddleware",
    "ReconsentCheckMiddleware",
]
