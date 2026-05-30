"""USCP V2 Presentation / common — M09 공통 모듈 라우터.

설계 근거: docs/02-design/features/uscp-v2.design.md §2.2, §4.2 M09

엔드포인트:
  - GET /common/stats         — 홈 화면 통계 카드 (M09-01)
  - GET /common/regions/map   — 5개 지역 지도 핀 데이터 (M09-05/06)
  - GET /common/health        — Uptime Kuma 모니터링 (공유)
"""
from app.presentation.common.router import router

__all__ = ["router"]
