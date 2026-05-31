"""USCP V2 — Application / Organization Service (M05-01/02/09).

설계 근거:
  - feature-spec §M05-01 (협력기관 등록·수정·삭제 — 지·산·학·관, 활성 MOU 시 삭제 차단)
  - feature-spec §M05-02 (협력기관 공개 목록 — 유형 필터, 비활성 제외)
  - feature-spec §M05-09 (활성·비활성 토글 — 삭제 대안, 이력 보존)
  - design.md §4.2 M05 (`/network/organizations`, `/admin/organizations`)

규칙:
  - 등록·수정·삭제·토글은 운영자만 (라우터 _require_operator)
  - 삭제는 연관 MOU·프로그램 없는 경우만 (DB는 mous FK RESTRICT, 앱에서 사전 검증 409)
  - 공개 목록은 is_active=true 만
  - category ENUM: public(관)/industry(산)/academic(학)/government(지자체)
"""
from __future__ import annotations

import datetime as _dt
import json
import logging
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

VALID_CATEGORIES: Final[frozenset[str]] = frozenset(
    {"public", "industry", "academic", "government"}
)
VALID_REGIONS: Final[frozenset[str]] = frozenset(
    {"daejeon", "gongju", "yesan", "cheonan", "sejong"}
)
_NAME_MAX = 200


async def _write_audit(
    db: AsyncSession,
    *,
    actor_id: str,
    action: str,
    target_id: str,
    metadata: dict[str, object],
) -> None:
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO audit_logs
                    (actor_id, action, target_type, target_id, metadata, created_at)
                VALUES
                    (CAST(:actor AS uuid), CAST(:action AS audit_action),
                     'organization', CAST(:tid AS uuid),
                     CAST(:meta AS jsonb), :now)
                """
            ),
            {
                "actor": actor_id,
                "action": action,
                "tid": target_id,
                "meta": json.dumps(metadata, ensure_ascii=False),
                "now": _dt.datetime.now(_dt.UTC),
            },
        )
    except Exception:  # noqa: BLE001 — audit_logs 미적용 dev fallback
        pass


# ════════════════════════════════════════════════════════════════
#  M05-01 협력기관 등록·수정·삭제
# ════════════════════════════════════════════════════════════════


async def create_organization_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    name: str,
    category: str,
    region: str | None = None,
    contact: str | None = None,
    intro: str | None = None,
) -> dict[str, object]:
    """M05-01 협력기관 등록 (운영자).

    Raises:
        HTTPException 422: name 길이·category/region 부정
    """
    name_norm = (name or "").strip()
    if not (1 <= len(name_norm) <= _NAME_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_name", "message": f"기관명은 1~{_NAME_MAX}자로 입력해 주세요."},
        )
    cat = (category or "").lower().strip()
    if cat not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_category",
                "message": "유형은 지(government)·산(industry)·학(academic)·관(public) 중 하나여야 합니다.",
                "valid": sorted(VALID_CATEGORIES),
            },
        )
    region_norm = (region or "").lower().strip() or None
    if region_norm and region_norm not in VALID_REGIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_region", "message": "지역이 올바르지 않습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO organizations
                        (name, category, region, contact, intro, is_active,
                         created_at, updated_at)
                    VALUES
                        (:name, CAST(:cat AS organization_category),
                         CAST(NULLIF(:region, '') AS region),
                         :contact, :intro, true, :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "name": name_norm,
                    "cat": cat,
                    "region": region_norm or "",
                    "contact": contact,
                    "intro": intro,
                    "now": now,
                },
            )
        ).first()
        org_id = row.id if row else None
        await _write_audit(
            db,
            actor_id=operator_id,
            action="create",
            target_id=str(org_id),
            metadata={"event": "org_created", "name": name_norm, "category": cat},
        )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_organization_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "org_create_failed", "message": "협력기관 등록 중 오류가 발생했습니다."},
        ) from exc

    return {
        "organization_id": str(org_id),
        "name": name_norm,
        "category": cat,
        "message": "협력기관을 등록했습니다.",
    }


async def update_organization_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    organization_id: str,
    name: str | None = None,
    category: str | None = None,
    region: str | None = None,
    contact: str | None = None,
    intro: str | None = None,
) -> dict[str, object]:
    """M05-01 협력기관 수정 (운영자).

    Raises:
        HTTPException 404: 기관 미존재
        HTTPException 422: 값 검증 실패
    """
    org = await _fetch_org(db, organization_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "org_not_found", "message": "협력기관을 찾을 수 없습니다."},
        )

    sets = ["updated_at = :now"]
    params: dict[str, object] = {"now": _dt.datetime.now(_dt.UTC), "oid": organization_id}
    if name is not None:
        n = name.strip()
        if not (1 <= len(n) <= _NAME_MAX):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_name", "message": f"기관명은 1~{_NAME_MAX}자로 입력해 주세요."},
            )
        sets.append("name = :name")
        params["name"] = n
    if category is not None:
        cat = category.lower().strip()
        if cat not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_category", "message": "유형이 올바르지 않습니다."},
            )
        sets.append("category = CAST(:cat AS organization_category)")
        params["cat"] = cat
    if region is not None:
        r = region.lower().strip()
        if r and r not in VALID_REGIONS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_region", "message": "지역이 올바르지 않습니다."},
            )
        sets.append("region = CAST(NULLIF(:region, '') AS region)")
        params["region"] = r
    if contact is not None:
        sets.append("contact = :contact")
        params["contact"] = contact
    if intro is not None:
        sets.append("intro = :intro")
        params["intro"] = intro

    try:
        await db.execute(
            sa.text(f"UPDATE organizations SET {', '.join(sets)} WHERE id = CAST(:oid AS uuid)"),
            params,
        )
        await _write_audit(
            db, actor_id=operator_id, action="update",
            target_id=organization_id, metadata={"event": "org_updated"},
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_organization_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "org_update_failed", "message": "협력기관 수정 중 오류가 발생했습니다."},
        ) from exc
    return {"organization_id": organization_id, "updated": True, "message": "협력기관을 수정했습니다."}


async def delete_organization_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    organization_id: str,
) -> dict[str, object]:
    """M05-01 협력기관 삭제 (운영자). 연관 MOU·프로그램 있으면 409 차단.

    Raises:
        HTTPException 404: 기관 미존재
        HTTPException 409: 연관 MOU/프로그램 존재 (토글 권장)
    """
    org = await _fetch_org(db, organization_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "org_not_found", "message": "협력기관을 찾을 수 없습니다."},
        )

    # 연관 MOU / 프로그램 검사 (FK RESTRICT 보강 — 사전 친절 안내)
    mou_count = 0
    program_count = 0
    try:
        mc = (
            await db.execute(
                sa.text("SELECT COUNT(*) AS c FROM mous WHERE organization_id = CAST(:oid AS uuid)"),
                {"oid": organization_id},
            )
        ).first()
        mou_count = int(mc.c) if mc else 0
        pc = (
            await db.execute(
                sa.text(
                    "SELECT COUNT(*) AS c FROM programs "
                    "WHERE linked_organization_id = CAST(:oid AS uuid)"
                ),
                {"oid": organization_id},
            )
        ).first()
        program_count = int(pc.c) if pc else 0
    except Exception:  # noqa: BLE001
        pass

    if mou_count > 0 or program_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "org_has_dependencies",
                "message": (
                    f"연관된 MOU {mou_count}건·프로그램 {program_count}건이 있어 삭제할 수 없습니다. "
                    "비활성 토글(M05-09)을 사용해 주세요."
                ),
                "mou_count": mou_count,
                "program_count": program_count,
            },
        )

    try:
        await db.execute(
            sa.text("DELETE FROM organizations WHERE id = CAST(:oid AS uuid)"),
            {"oid": organization_id},
        )
        await _write_audit(
            db, actor_id=operator_id, action="delete",
            target_id=organization_id, metadata={"event": "org_deleted"},
        )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_organization_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "org_delete_failed", "message": "협력기관 삭제 중 오류가 발생했습니다."},
        ) from exc
    return {"organization_id": organization_id, "deleted": True, "message": "협력기관을 삭제했습니다."}


# ════════════════════════════════════════════════════════════════
#  M05-09 활성·비활성 토글
# ════════════════════════════════════════════════════════════════


async def toggle_organization_active_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    organization_id: str,
    is_active: bool,
) -> dict[str, object]:
    """M05-09 협력기관 활성·비활성 토글 (운영자). MOU·프로그램은 유지(이력 보존).

    Raises:
        HTTPException 404: 기관 미존재
    """
    org = await _fetch_org(db, organization_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "org_not_found", "message": "협력기관을 찾을 수 없습니다."},
        )
    try:
        await db.execute(
            sa.text(
                "UPDATE organizations SET is_active = :active, updated_at = :now "
                "WHERE id = CAST(:oid AS uuid)"
            ),
            {"active": is_active, "now": _dt.datetime.now(_dt.UTC), "oid": organization_id},
        )
        await _write_audit(
            db, actor_id=operator_id, action="update", target_id=organization_id,
            metadata={"event": "org_toggle", "is_active": is_active},
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("toggle_organization_active_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "org_toggle_failed", "message": "활성 토글 중 오류가 발생했습니다."},
        ) from exc
    return {
        "organization_id": organization_id,
        "is_active": is_active,
        "message": "공개로 전환했습니다." if is_active else "비공개(비활성)로 전환했습니다.",
    }


# ════════════════════════════════════════════════════════════════
#  M05-02 협력기관 목록 (공개 + 운영자)
# ════════════════════════════════════════════════════════════════


async def list_organizations_v2(
    db: AsyncSession,
    *,
    category: str | None = None,
    include_inactive: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, object]:
    """M05-02 협력기관 목록. 공개는 include_inactive=false(활성만), 운영자는 true 가능."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    clauses = ["1=1"]
    params: dict[str, object] = {"limit": limit, "offset": offset}
    if not include_inactive:
        clauses.append("is_active = true")
    if category and category.lower() in VALID_CATEGORIES:
        clauses.append("category::text = :cat")
        params["cat"] = category.lower()
    where = " AND ".join(clauses)
    try:
        total_row = (
            await db.execute(
                sa.text(f"SELECT COUNT(*) AS c FROM organizations WHERE {where}"), params
            )
        ).first()
        total = int(total_row.c) if total_row else 0
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT id::text AS id, name, category::text AS category,
                           region::text AS region, contact, intro, is_active, created_at
                    FROM organizations WHERE {where}
                    ORDER BY is_active DESC, name ASC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                params,
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_organizations_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "name": r.name,
                "category": r.category,
                "region": r.region,
                "contact": r.contact,
                "intro": r.intro,
                "is_active": bool(r.is_active),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }


async def _fetch_org(db: AsyncSession, organization_id: str) -> object | None:
    try:
        return (
            await db.execute(
                sa.text(
                    "SELECT id::text AS id FROM organizations "
                    "WHERE id = CAST(:oid AS uuid) LIMIT 1"
                ),
                {"oid": organization_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        return None
