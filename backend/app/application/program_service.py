"""USCP V2 — Application / Program Service (M05-06).

설계 근거:
  - feature-spec §M05-06 (프로그램 통합 운영 등록 — 리빙랩·멘토단·학생팀 연계)
  - design.md §3.1 programs 테이블 (D02 보강), §4.2 M05

규칙:
  - 등록·수정·삭제는 운영자만 (라우터 _require_operator)
  - 연계(프로젝트/멘토/팀/기관)는 모두 선택 — programs FK 는 SET NULL
  - 별도 제약 없이 자유 등록 (feature-spec 명시)
"""
from __future__ import annotations

import datetime as _dt
import logging

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_NAME_MAX = 200


async def create_program_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    name: str,
    description: str | None = None,
    linked_project_id: str | None = None,
    linked_mentor_id: str | None = None,
    linked_team_id: str | None = None,
    linked_organization_id: str | None = None,
) -> dict[str, object]:
    """M05-06 프로그램 통합 운영 등록 (운영자).

    Raises:
        HTTPException 422: name 길이 위반
    """
    name_norm = (name or "").strip()
    if not (1 <= len(name_norm) <= _NAME_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_name", "message": f"프로그램명은 1~{_NAME_MAX}자로 입력해 주세요."},
        )
    now = _dt.datetime.now(_dt.UTC)
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    INSERT INTO programs
                        (name, description, linked_project_id, linked_mentor_id,
                         linked_team_id, linked_organization_id, created_at, updated_at)
                    VALUES
                        (:name, :desc,
                         CAST(NULLIF(:proj, '') AS uuid),
                         CAST(NULLIF(:mentor, '') AS uuid),
                         CAST(NULLIF(:team, '') AS uuid),
                         CAST(NULLIF(:org, '') AS uuid),
                         :now, :now)
                    RETURNING id::text AS id
                    """
                ),
                {
                    "name": name_norm,
                    "desc": description,
                    "proj": linked_project_id or "",
                    "mentor": linked_mentor_id or "",
                    "team": linked_team_id or "",
                    "org": linked_organization_id or "",
                    "now": now,
                },
            )
        ).first()
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_program_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "program_create_failed", "message": "프로그램 등록 중 오류가 발생했습니다."},
        ) from exc
    return {
        "program_id": row.id if row else None,
        "name": name_norm,
        "message": "통합 프로그램을 등록했습니다.",
    }


async def list_programs_v2(
    db: AsyncSession,
    *,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, object]:
    """M05-06 프로그램 목록 (운영자). 연계 명칭 조인."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    try:
        total_row = (await db.execute(sa.text("SELECT COUNT(*) AS c FROM programs"))).first()
        total = int(total_row.c) if total_row else 0
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT p.id::text AS id, p.name, p.description,
                           p.linked_project_id::text AS linked_project_id,
                           lp.title AS project_title,
                           p.linked_organization_id::text AS linked_organization_id,
                           o.name AS organization_name,
                           p.created_at
                    FROM programs p
                    LEFT JOIN livinglab_projects lp ON lp.id = p.linked_project_id
                    LEFT JOIN organizations o ON o.id = p.linked_organization_id
                    ORDER BY p.created_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {"limit": limit, "offset": offset},
            )
        ).all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_programs_v2 fallback: %s", exc)
        return {"data": [], "meta": {"total": 0, "limit": limit, "offset": offset}}

    return {
        "data": [
            {
                "id": str(r.id),
                "name": r.name,
                "description": r.description,
                "linked_project_id": str(r.linked_project_id) if r.linked_project_id else None,
                "project_title": r.project_title,
                "linked_organization_id": str(r.linked_organization_id)
                if r.linked_organization_id
                else None,
                "organization_name": r.organization_name,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "meta": {"total": total, "limit": limit, "offset": offset},
    }


async def delete_program_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    program_id: str,
) -> dict[str, object]:
    """M05-06 프로그램 삭제 (운영자, hard)."""
    try:
        result = await db.execute(
            sa.text("DELETE FROM programs WHERE id = CAST(:pid AS uuid)"),
            {"pid": program_id},
        )
        if result.rowcount == 0:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "program_not_found", "message": "프로그램을 찾을 수 없습니다."},
            )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_program_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "program_delete_failed", "message": "프로그램 삭제 중 오류가 발생했습니다."},
        ) from exc
    return {"program_id": program_id, "deleted": True, "message": "프로그램을 삭제했습니다."}
