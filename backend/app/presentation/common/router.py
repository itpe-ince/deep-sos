"""USCP V2 — Common (M09) Public Endpoints.

설계 근거:
  - feature-spec §M09-01 (홈 화면 통계 카드)
  - feature-spec §M09-05~06 (5개 지역 현황 지도 + 의제·리빙랩 위치 표시)
  - design.md §4.2 M09 / §8.1 (응답 캐시 1분)
  - design.md §3.2 region ENUM (daejeon/gongju/yesan/cheonan/sejong)

V1 → V2 데이터 전환 호환성:
  본 라우터는 0009 마이그레이션 직후 V1 잔재 데이터와 V2 신규 컬럼이 공존하는
  상태에서도 정확한 통계를 반환하도록 COALESCE 와 V2 컬럼 우선 패턴을 사용.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


# 5개 지역 메타데이터 (design.md §7.1 region 토큰과 일치)
REGION_META: list[dict[str, Any]] = [
    {
        "code": "daejeon",
        "label": "대전",
        "color": "#1E40AF",
        # 지자체 청사 대표 좌표 (mockup KakaoMap 기본값)
        "lat": 36.3504,
        "lng": 127.3845,
    },
    {
        "code": "gongju",
        "label": "공주",
        "color": "#059669",
        "lat": 36.4467,
        "lng": 127.1190,
    },
    {
        "code": "yesan",
        "label": "예산",
        "color": "#7c3aed",
        "lat": 36.6802,
        "lng": 126.8447,
    },
    {
        "code": "cheonan",
        "label": "천안",
        "color": "#0891b2",
        "lat": 36.8151,
        "lng": 127.1139,
    },
    {
        "code": "sejong",
        "label": "세종",
        "color": "#ea580c",
        "lat": 36.4801,
        "lng": 127.2890,
    },
]


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """홈 화면 통계 카드 (M09-01).

    반환 4종 (mockup/pages/index.html .kpi-grid 매칭):
      - issues_resolved        : 해결완료 의제 수
      - projects_in_progress   : 진행 중 리빙랩 수
      - members_total          : 등록 회원 수 (시민·멘토·학생팀 누적)
      - regions_count          : 운영 지역 수 (상수 5)

    응답 캐시: nginx 또는 FastAPI 측 1분 캐시 권장 (§8.1 캐시 정책).
    """
    # V2 issues.stage='resolved' 우선, V1 status='resolved' fallback
    issues_resolved = await _scalar(
        db,
        text(
            """
            SELECT COUNT(*) FROM issues
            WHERE COALESCE(stage::text, status) = 'resolved'
            """
        ),
    )

    # V2 projects.stage='in_progress' 우선, V1 livinglab_projects.phase 잔재 fallback
    projects_in_progress = await _scalar(
        db,
        text(
            """
            SELECT COUNT(*) FROM livinglab_projects
            WHERE COALESCE(stage::text, phase) IN ('in_progress', 'execute', 'develop', 'verify')
            """
        ),
    )

    # users.is_active=true (V1) 또는 user_status='active' (V2) — 양쪽 호환
    members_total = await _scalar(
        db,
        text(
            """
            SELECT COUNT(*) FROM users
            WHERE COALESCE(user_status::text, CASE WHEN is_active THEN 'active' ELSE 'inactive' END) = 'active'
            """
        ),
    )

    return {
        "issues_resolved": issues_resolved,
        "projects_in_progress": projects_in_progress,
        "members_total": members_total,
        "regions_count": len(REGION_META),
    }


@router.get("/regions/map")
async def get_regions_map(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """5개 지역 지도 핀 데이터 (M09-05/06).

    반환:
      - regions: 5개 지역의 lat/lng/color + per-region stats
      - center : 지도 기본 중심 좌표 (5개 지역 중심)

    KakaoMap 컴포넌트에서 핀 표시 + 클릭 시 /issues?region={code} 이동.
    """
    # V2 region 컬럼 우선, 없으면 빈 결과
    rows = (
        await db.execute(
            text(
                """
                SELECT
                    region::text AS region_code,
                    COUNT(*) FILTER (
                        WHERE COALESCE(stage::text, status) IN ('reviewing', 'published', 'mentor_assigned', 'in_progress')
                    ) AS active_issues,
                    COUNT(*) FILTER (
                        WHERE COALESCE(stage::text, status) = 'resolved'
                    ) AS resolved_issues
                FROM issues
                WHERE region IS NOT NULL
                GROUP BY region
                """
            )
        )
    ).all()
    counts_by_region: dict[str, dict[str, int]] = {
        r.region_code: {
            "active_issues": int(r.active_issues or 0),
            "resolved_issues": int(r.resolved_issues or 0),
        }
        for r in rows
    }

    # 리빙랩 카운트도 region 별로 (V2 projects.region 우선)
    project_rows = (
        await db.execute(
            text(
                """
                SELECT
                    region::text AS region_code,
                    COUNT(*) AS active_projects
                FROM livinglab_projects
                WHERE region IS NOT NULL
                  AND COALESCE(stage::text, phase) IN ('in_progress', 'execute', 'develop', 'verify', 'recruiting')
                GROUP BY region
                """
            )
        )
    ).all()
    projects_by_region: dict[str, int] = {
        r.region_code: int(r.active_projects or 0) for r in project_rows
    }

    regions = []
    for meta in REGION_META:
        code = meta["code"]
        regions.append(
            {
                **meta,
                "active_issues": counts_by_region.get(code, {}).get("active_issues", 0),
                "resolved_issues": counts_by_region.get(code, {}).get(
                    "resolved_issues", 0
                ),
                "active_projects": projects_by_region.get(code, 0),
            }
        )

    # 5개 지역의 평균 좌표 (지도 기본 중심)
    avg_lat = sum(m["lat"] for m in REGION_META) / len(REGION_META)
    avg_lng = sum(m["lng"] for m in REGION_META) / len(REGION_META)

    return {
        "regions": regions,
        "center": {"lat": round(avg_lat, 4), "lng": round(avg_lng, 4)},
    }


@router.get("/health")
async def common_health() -> dict[str, str]:
    """Uptime Kuma 모니터링용 헬스체크 (M09-09 공유).

    `/api/v1/health` 와 동일한 응답 — design.md §8.3 Uptime Kuma 5분 ping.
    """
    return {"status": "ok"}


async def _scalar(db: AsyncSession, stmt: Any) -> int:
    """SELECT COUNT 스칼라 결과 반환. 테이블/컬럼 미존재 시 0 fallback."""
    try:
        result = await db.execute(stmt)
        value = result.scalar()
        return int(value or 0)
    except Exception:  # noqa: BLE001
        # V1 ↔ V2 schema 전환 중 컬럼 미존재 등 안전 처리
        return 0
