"""USCP V2 — Application / Success Story Service (M03-11/12 성공사례·정책반영).

설계 근거:
  - feature-spec §M03-11 (성공사례 스토리 작성 — 4단계 본문, 운영자 전용)
  - feature-spec §M03-12 (정책 반영 기록 — policy_name·effective_date·policy_detail)
  - design.md §4.2 M03 admin (POST /admin/success-cases, PATCH /admin/success-cases/{id})
  - 분석 D01: V1 success_cases 테이블 재사용 + policy_name/effective_date 보강 (0013)

유의사항 (feature-spec §M03-11):
  - "해결 완료(completed)" 단계 프로젝트에서만 작성 가능
  - 작성 후 별도 게시(is_published=true) 절차를 거쳐야 외부 공개
  - 4단계 본문 = problem_summary / process_summary / result_summary / policy(정책반영)
"""
from __future__ import annotations

import datetime as _dt
import logging
import uuid
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_TITLE_MAX: Final[int] = 200
_POLICY_NAME_MAX: Final[int] = 200


async def _fetch_project_stage(db: AsyncSession, project_id: str) -> str | None:
    """프로젝트 현재 단계 조회 (V2 stage 우선, V1 phase fallback). 없으면 None."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT COALESCE(stage::text, phase) AS stage
                    FROM livinglab_projects
                    WHERE id = CAST(:pid AS uuid)
                    LIMIT 1
                    """
                ),
                {"pid": project_id},
            )
        ).first()
    except Exception:  # noqa: BLE001 — dev 환경 fallback
        return None
    return row.stage if row else None


def _validate_required_text(value: str, field: str, label: str) -> str:
    norm = (value or "").strip()
    if not norm:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": f"missing_{field}",
                "message": f"{label}을(를) 입력해 주세요.",
            },
        )
    return norm


async def create_success_case_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    project_id: str,
    title: str,
    problem_summary: str,
    process_summary: str,
    result_summary: str,
    policy_linked: bool = False,
    policy_name: str | None = None,
    effective_date: _dt.date | None = None,
    policy_detail: str | None = None,
    cover_image_url: str | None = None,
) -> dict[str, object]:
    """M03-11/12 성공사례 작성 (운영자 전용, completed 단계 프로젝트만).

    Raises:
        HTTPException 404: project 미존재
        HTTPException 409: project 가 completed 단계가 아님
        HTTPException 422: 필수 본문 누락·길이 위반
    """
    # ── 1. 본문 검증 (4단계 中 1~3단계) ────────────────────────
    title_norm = title.strip()
    if not (1 <= len(title_norm) <= _TITLE_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_title_length",
                "message": f"제목은 1자 이상 {_TITLE_MAX}자 이내로 입력해 주세요.",
            },
        )
    problem_norm = _validate_required_text(problem_summary, "problem", "① 문제 정의")
    process_norm = _validate_required_text(process_summary, "process", "② 해결 과정")
    result_norm = _validate_required_text(result_summary, "result", "③ 결과")

    # ── 2. M03-12 정책반영 단계 검증 ───────────────────────────
    policy_name_norm = (policy_name or "").strip() or None
    policy_detail_norm = (policy_detail or "").strip() or None
    if policy_name_norm and len(policy_name_norm) > _POLICY_NAME_MAX:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_policy_name_length",
                "message": f"정책 이름은 {_POLICY_NAME_MAX}자 이내로 입력해 주세요.",
            },
        )
    if policy_linked and not (policy_name_norm or policy_detail_norm):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "missing_policy_detail",
                "message": "정책 반영으로 표시한 경우 정책명 또는 반영 내용을 입력해 주세요.",
            },
        )

    # ── 3. completed 단계 검증 (M03-11 유의사항) ───────────────
    stage = await _fetch_project_stage(db, project_id)
    if stage is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "project_not_found",
                "message": "연결할 리빙랩 프로젝트를 찾을 수 없습니다.",
            },
        )
    if stage != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "project_not_completed",
                "message": "해결 완료된 리빙랩에서만 성공사례를 작성할 수 있습니다.",
                "current_stage": stage,
            },
        )

    case_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO success_cases
                    (id, project_id, title,
                     problem_summary, process_summary, result_summary,
                     policy_linked, policy_name, effective_date, policy_detail,
                     is_published, view_count, cover_image_url,
                     created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), CAST(:pid AS uuid), :title,
                     :problem, :process, :result,
                     :policy_linked, :policy_name, :effective_date, :policy_detail,
                     false, 0, :cover,
                     :now, :now)
                """
            ),
            {
                "id": str(case_id),
                "pid": project_id,
                "title": title_norm,
                "problem": problem_norm,
                "process": process_norm,
                "result": result_norm,
                "policy_linked": policy_linked,
                "policy_name": policy_name_norm,
                "effective_date": effective_date,
                "policy_detail": policy_detail_norm,
                "cover": (cover_image_url or "").strip() or None,
                "now": now,
            },
        )

        # audit_logs (M08-05) — best-effort
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('create' AS audit_action),
                         'success_case', CAST(:id AS uuid),
                         jsonb_build_object('title', :title, 'project_id', :pid),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "id": str(case_id),
                    "title": title_norm,
                    "pid": project_id,
                    "now": now,
                },
            )
        except Exception:  # noqa: BLE001
            pass

        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_success_case_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "success_case_create_failed",
                "message": "성공사례 작성 중 오류가 발생했습니다.",
            },
        ) from exc

    return {
        "id": str(case_id),
        "project_id": project_id,
        "title": title_norm,
        "is_published": False,
        "policy_linked": policy_linked,
        "policy_name": policy_name_norm,
        "effective_date": effective_date.isoformat() if effective_date else None,
        "created_at": now.isoformat(),
        "message": "성공사례가 저장되었습니다. 공개하려면 게시 처리해 주세요.",
    }


async def update_success_case_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    case_id: str,
    title: str | None = None,
    problem_summary: str | None = None,
    process_summary: str | None = None,
    result_summary: str | None = None,
    policy_linked: bool | None = None,
    policy_name: str | None = None,
    effective_date: _dt.date | None = None,
    policy_detail: str | None = None,
    is_published: bool | None = None,
    cover_image_url: str | None = None,
) -> dict[str, object]:
    """M03-11/12 성공사례 수정 + 게시(is_published) 토글 (운영자 전용)."""
    try:
        target = (
            await db.execute(
                sa.text(
                    "SELECT id FROM success_cases WHERE id = CAST(:id AS uuid) LIMIT 1"
                ),
                {"id": case_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        target = None
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "success_case_not_found",
                "message": "성공사례를 찾을 수 없습니다.",
            },
        )

    updates: list[str] = []
    params: dict[str, object] = {"id": case_id}

    if title is not None:
        title_norm = title.strip()
        if not (1 <= len(title_norm) <= _TITLE_MAX):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_title_length",
                    "message": f"제목은 1~{_TITLE_MAX}자로 입력해 주세요.",
                },
            )
        updates.append("title = :title")
        params["title"] = title_norm

    _text_fields = {
        "problem_summary": problem_summary,
        "process_summary": process_summary,
        "result_summary": result_summary,
    }
    for col, val in _text_fields.items():
        if val is not None:
            norm = val.strip()
            if not norm:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": f"empty_{col}",
                        "message": "본문 단계는 비워둘 수 없습니다.",
                    },
                )
            updates.append(f"{col} = :{col}")
            params[col] = norm

    if policy_linked is not None:
        updates.append("policy_linked = :policy_linked")
        params["policy_linked"] = policy_linked
    if policy_name is not None:
        updates.append("policy_name = :policy_name")
        params["policy_name"] = policy_name.strip() or None
    if effective_date is not None:
        updates.append("effective_date = :effective_date")
        params["effective_date"] = effective_date
    if policy_detail is not None:
        updates.append("policy_detail = :policy_detail")
        params["policy_detail"] = policy_detail.strip() or None
    if cover_image_url is not None:
        updates.append("cover_image_url = :cover")
        params["cover"] = cover_image_url.strip() or None
    if is_published is not None:
        updates.append("is_published = :is_published")
        params["is_published"] = is_published

    if not updates:
        return {"id": case_id, "updated": False}

    now = _dt.datetime.now(_dt.UTC)
    params["now"] = now
    updates.append("updated_at = :now")

    try:
        await db.execute(
            sa.text(
                f"UPDATE success_cases SET {', '.join(updates)} "
                "WHERE id = CAST(:id AS uuid)"
            ),
            params,
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_success_case_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "success_case_update_failed",
                "message": "성공사례 수정 중 오류가 발생했습니다.",
            },
        ) from exc

    return {
        "id": case_id,
        "updated": True,
        "is_published": params.get("is_published"),
    }


async def list_success_cases_admin_v2(
    db: AsyncSession,
    *,
    project_id: str | None = None,
    include_unpublished: bool = True,
    limit: int = 50,
) -> dict[str, object]:
    """운영자 콘솔용 성공사례 목록 (미게시 포함). M03-11 관리 화면."""
    limit = max(1, min(limit, 100))
    clauses = ["1=1"]
    params: dict[str, object] = {"lim": limit}
    if project_id:
        clauses.append("project_id = CAST(:pid AS uuid)")
        params["pid"] = project_id
    if not include_unpublished:
        clauses.append("is_published = true")

    try:
        rows = (
            await db.execute(
                sa.text(
                    f"""
                    SELECT
                        id::text         AS id,
                        project_id::text AS project_id,
                        title,
                        policy_linked,
                        policy_name,
                        effective_date,
                        is_published,
                        view_count,
                        created_at
                    FROM success_cases
                    WHERE {" AND ".join(clauses)}
                    ORDER BY created_at DESC
                    LIMIT :lim
                    """
                ),
                params,
            )
        ).mappings().all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_success_cases_admin_v2 fallback: %s", exc)
        rows = []

    return {
        "data": [
            {
                "id": str(r["id"]),
                "project_id": r["project_id"],
                "title": r["title"],
                "policy_linked": r["policy_linked"],
                "policy_name": r["policy_name"],
                "effective_date": (
                    r["effective_date"].isoformat()
                    if r["effective_date"] and hasattr(r["effective_date"], "isoformat")
                    else None
                ),
                "is_published": r["is_published"],
                "view_count": r["view_count"],
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r["created_at"], "isoformat")
                    else str(r["created_at"])
                ),
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }
