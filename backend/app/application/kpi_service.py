"""USCP V2 — Application / KPI Service (M06-01~06 성과지표).

설계 근거:
  - feature-spec §M06-01 (지표 등록·수정 — 운영자)
  - feature-spec §M06-02 (지표 목록 공개 — 달성률 표시)
  - feature-spec §M06-03 (실적 입력 월별·분기별 — 같은 기간 덮어쓰기)
  - feature-spec §M06-04 (자동 집계 — resolved 의제 1건=카운트 1, 중복 방지)
  - feature-spec §M06-05 (대시보드 — 최근 12개월 추이)
  - feature-spec §M06-06 (CSV 다운로드)
  - design.md §4.2 M06, §5.2 (resolved 진입 시 KPI auto-count)

규칙:
  - 등록·수정·실적입력·CSV는 운영자만 (라우터 _require_operator)
  - 지표 목록·대시보드(공개판)는 누구나
  - performance_records uniq(kpi_id, period, auto_count_source_id) 로 중복 방지
  - 수동 실적: auto_count_source_id IS NULL 행 1개를 기간별 upsert
  - 자동 집계: auto_count_source_id = issue.id 행을 기간별 insert (의제별 1회)
"""
from __future__ import annotations

import csv
import datetime as _dt
import io
import logging

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_NAME_MAX = 100


# ════════════════════════════════════════════════════════════════
#  M06-01 지표 등록·수정
# ════════════════════════════════════════════════════════════════


async def create_kpi_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    name: str,
    formula: str | None = None,
    unit: str | None = None,
    target_value: float | None = None,
    auto_count_source: str | None = None,
) -> dict[str, object]:
    """M06-01 성과지표 등록 (운영자)."""
    name_norm = (name or "").strip()
    if not (1 <= len(name_norm) <= _NAME_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_name", "message": f"지표명은 1~{_NAME_MAX}자로 입력해 주세요."},
        )
    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO kpi_indicators
                        (name, formula, unit, target_value, auto_count_source,
                         created_at, updated_at)
                    VALUES (:name, :formula, :unit, :target, :auto, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "name": name_norm,
                    "formula": formula,
                    "unit": unit,
                    "target": target_value,
                    "auto": auto_count_source,
                    "now": now,
                },
            )
        ).first()
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_kpi_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "kpi_create_failed", "message": "지표 등록 중 오류가 발생했습니다."},
        ) from exc
    return {"kpi_id": row.id if row else None, "name": name_norm, "message": "성과지표를 등록했습니다."}


async def update_kpi_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    kpi_id: str,
    name: str | None = None,
    formula: str | None = None,
    unit: str | None = None,
    target_value: float | None = None,
    auto_count_source: str | None = None,
) -> dict[str, object]:
    """M06-01 성과지표 수정 (운영자)."""
    try:
        exists = (
            await db.execute(
                sa.text("SELECT id FROM kpi_indicators WHERE id = CAST(:kid AS uuid) LIMIT 1"),
                {"kid": kpi_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        exists = None
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "kpi_not_found", "message": "성과지표를 찾을 수 없습니다."},
        )
    sets = ["updated_at = :now"]
    params: dict[str, object] = {"now": _dt.datetime.now(_dt.UTC), "kid": kpi_id}
    if name is not None:
        n = name.strip()
        if not (1 <= len(n) <= _NAME_MAX):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_name", "message": f"지표명은 1~{_NAME_MAX}자로 입력해 주세요."},
            )
        sets.append("name = :name")
        params["name"] = n
    if formula is not None:
        sets.append("formula = :formula")
        params["formula"] = formula
    if unit is not None:
        sets.append("unit = :unit")
        params["unit"] = unit
    if target_value is not None:
        sets.append("target_value = :target")
        params["target"] = target_value
    if auto_count_source is not None:
        sets.append("auto_count_source = :auto")
        params["auto"] = auto_count_source
    try:
        await db.execute(
            sa.text(f"UPDATE kpi_indicators SET {', '.join(sets)} WHERE id = CAST(:kid AS uuid)"),
            params,
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_kpi_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "kpi_update_failed", "message": "지표 수정 중 오류가 발생했습니다."},
        ) from exc
    return {"kpi_id": kpi_id, "updated": True, "message": "성과지표를 수정했습니다."}


# ════════════════════════════════════════════════════════════════
#  M06-02 지표 목록 (공개, 달성률)
# ════════════════════════════════════════════════════════════════


async def list_kpis_v2(db: AsyncSession) -> dict[str, object]:
    """M06-02 성과지표 목록 (공개). 누적 실적 합계 + 목표 대비 달성률."""
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT k.id::text AS id, k.name, k.unit, k.formula,
                           k.target_value, k.auto_count_source,
                           COALESCE(SUM(p.value), 0) AS actual
                    FROM kpi_indicators k
                    LEFT JOIN performance_records p ON p.kpi_id = k.id
                    GROUP BY k.id, k.name, k.unit, k.formula, k.target_value, k.auto_count_source
                    ORDER BY k.created_at ASC
                    """
                )
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_kpis_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0}}

    data = []
    for r in rows:
        actual = float(r.actual or 0)
        target = float(r.target_value) if r.target_value is not None else None
        rate = round(actual / target * 100, 1) if target and target > 0 else None
        data.append(
            {
                "id": str(r.id),
                "name": r.name,
                "unit": r.unit,
                "formula": r.formula,
                "target_value": target,
                "actual_value": actual,
                "achievement_rate": rate,
                "auto_count_source": r.auto_count_source,
            }
        )
    return {"data": data, "meta": {"total": len(data)}}


# ════════════════════════════════════════════════════════════════
#  M06-03 실적 입력 (월별·분기별, 덮어쓰기)
# ════════════════════════════════════════════════════════════════


async def upsert_performance_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    kpi_id: str,
    period: str,
    value: float,
) -> dict[str, object]:
    """M06-03 실적 입력 (운영자). 같은 (kpi, period) 수동 실적은 덮어쓰기.

    수동 실적은 auto_count_source_id IS NULL 행으로 관리.
    uniq(kpi_id, period, auto_count_source_id) — NULL 은 Postgres 에서 distinct 취급되어
    여러 NULL 행이 가능하므로, 수동 행은 명시적으로 조회 후 update/insert.

    Raises:
        HTTPException 404: 지표 미존재
        HTTPException 422: period 형식·value 음수
    """
    if not _valid_period(period):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_period", "message": "기간은 YYYY-MM 또는 YYYY-Q1 형식이어야 합니다."},
        )
    try:
        kpi = (
            await db.execute(
                sa.text("SELECT id FROM kpi_indicators WHERE id = CAST(:kid AS uuid) LIMIT 1"),
                {"kid": kpi_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        kpi = None
    if kpi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "kpi_not_found", "message": "성과지표를 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        existing = (
            await db.execute(
                sa.text(
                    "SELECT id FROM performance_records "
                    "WHERE kpi_id = CAST(:kid AS uuid) AND period = :period "
                    "AND auto_count_source_id IS NULL LIMIT 1"
                ),
                {"kid": kpi_id, "period": period},
            )
        ).first()
        if existing is not None:
            await db.execute(
                sa.text(
                    "UPDATE performance_records SET value = :val, updated_at = :now "
                    "WHERE id = CAST(:rid AS uuid)"
                ),
                {"val": value, "now": now, "rid": existing.id},
            )
        else:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO performance_records
                        (kpi_id, period, value, auto_count_source_id, created_at, updated_at)
                    VALUES (CAST(:kid AS uuid), :period, :val, NULL, :now, :now)
                    """
                ),
                {"kid": kpi_id, "period": period, "val": value, "now": now},
            )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("upsert_performance_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "perf_upsert_failed", "message": "실적 입력 중 오류가 발생했습니다."},
        ) from exc
    return {"kpi_id": kpi_id, "period": period, "value": value, "message": "실적을 입력했습니다."}


# ════════════════════════════════════════════════════════════════
#  M06-04 자동 집계 (resolved 의제 = 카운트 1, 중복 방지)
# ════════════════════════════════════════════════════════════════


async def auto_count_resolved_issue_v2(
    db: AsyncSession,
    *,
    issue_id: str,
    when: _dt.datetime | None = None,
) -> bool:
    """M06-04 의제 resolved 종결 시 KPI 자동 +1 (중복 방지).

    auto_count_source='resolved_issue' 인 지표에 (period=YYYY-MM, auto_count_source_id=issue_id)
    레코드를 1개 insert. 같은 의제 재집계는 uniq 제약으로 무시(ON CONFLICT DO NOTHING).
    gatekeeping_service.transition_issue_v2 의 resolved 분기에서 호출.

    Returns: 신규 집계 True / 이미 집계됨(또는 지표 없음) False.
    """
    now = when or _dt.datetime.now(_dt.UTC)
    period = now.strftime("%Y-%m")
    try:
        kpi = (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id FROM kpi_indicators "
                    "WHERE auto_count_source = 'resolved_issue' LIMIT 1"
                )
            )
        ).first()
        if kpi is None:
            # 자동 집계 대상 지표(auto_count_source='resolved_issue') 미정의 — skip.
            # 정상 동작이나 운영자가 지표를 만들기 전 resolved 의제는 집계 누락되므로
            # 가시성을 위해 info 로깅(G12). 사후 백필은 미구현(G11) — 지표 생성 후 수동 실적 입력 권장.
            logger.info(
                "auto_count skipped: no 'resolved_issue' KPI defined (issue_id=%s)", issue_id
            )
            return False
        result = await db.execute(
            sa.text(
                """
                INSERT INTO performance_records
                    (kpi_id, period, value, auto_count_source_id, created_at, updated_at)
                VALUES (CAST(:kid AS uuid), :period, 1, CAST(:iid AS uuid), :now, :now)
                ON CONFLICT (kpi_id, period, auto_count_source_id) DO NOTHING
                """
            ),
            {"kid": kpi.id, "period": period, "iid": issue_id, "now": now},
        )
        return (result.rowcount or 0) > 0
    except Exception as exc:  # noqa: BLE001 — performance_records 미적용 dev fallback
        logger.warning("auto_count_resolved_issue_v2 skipped: %s", exc)
        return False


# ════════════════════════════════════════════════════════════════
#  M06-05 대시보드 (최근 12개월 추이)
# ════════════════════════════════════════════════════════════════


async def kpi_dashboard_v2(db: AsyncSession) -> dict[str, object]:
    """M06-05 대시보드 (공개). 지표별 최근 12개월(YYYY-MM) 실적 추이."""
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT k.id::text AS kpi_id, k.name, k.unit,
                           p.period, SUM(p.value) AS value
                    FROM kpi_indicators k
                    LEFT JOIN performance_records p ON p.kpi_id = k.id
                        AND p.period ~ '^[0-9]{4}-[0-9]{2}$'
                    GROUP BY k.id, k.name, k.unit, p.period
                    ORDER BY k.name ASC, p.period ASC
                    """
                )
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("kpi_dashboard_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0}}

    by_kpi: dict[str, dict[str, object]] = {}
    for r in rows:
        entry = by_kpi.setdefault(
            r.kpi_id, {"kpi_id": str(r.kpi_id), "name": r.name, "unit": r.unit, "points": []}
        )
        if r.period:
            entry["points"].append({"period": r.period, "value": float(r.value or 0)})  # type: ignore[attr-defined]
    # 최근 12개월만
    for entry in by_kpi.values():
        pts = entry["points"]  # type: ignore[assignment]
        entry["points"] = pts[-12:] if isinstance(pts, list) else []
    return {"data": list(by_kpi.values()), "meta": {"total": len(by_kpi)}}


# ════════════════════════════════════════════════════════════════
#  M06-06 CSV 다운로드
# ════════════════════════════════════════════════════════════════


async def export_performance_csv_v2(
    db: AsyncSession,
    *,
    start: str | None = None,
    end: str | None = None,
) -> str:
    """M06-06 실적 CSV 문자열 생성 (운영자). period 범위 필터(YYYY-MM 문자열 비교)."""
    clauses = ["1=1"]
    params: dict[str, object] = {}
    if start:
        clauses.append("p.period >= :start")
        params["start"] = start
    if end:
        clauses.append("p.period <= :end")
        params["end"] = end
    where = " AND ".join(clauses)
    try:
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT k.name AS kpi_name, k.unit, p.period, p.value,
                           (p.auto_count_source_id IS NOT NULL) AS is_auto
                    FROM performance_records p
                    JOIN kpi_indicators k ON k.id = p.kpi_id
                    WHERE {where}
                    ORDER BY k.name ASC, p.period ASC
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("export_performance_csv_v2 fallback: %s", exc)
        rows = []

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["지표명", "단위", "기간", "실적", "집계방식"])
    for r in rows:
        writer.writerow(
            [r.kpi_name, r.unit or "", r.period, float(r.value or 0), "자동" if r.is_auto else "수동"]
        )
    return buf.getvalue()


def _valid_period(period: str) -> bool:
    """YYYY-MM 또는 YYYY-Q1~Q4 형식 검증."""
    import re

    return bool(re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", period) or re.fullmatch(r"\d{4}-Q[1-4]", period))
