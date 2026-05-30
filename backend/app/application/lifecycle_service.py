"""USCP V2 — Application / Lifecycle Service (M03 리빙랩 라이프사이클).

설계 근거:
  - feature-spec §M03-07 (리빙랩 수정·삭제)
  - feature-spec §M03-13 (리빙랩 상태 변경 — 3단계)
  - design.md §3.2 project_stage ENUM (recruiting/in_progress/completed)
  - design.md §5.5 단계별 이메일 알림 (M03 적용)

Sprint 2 `gatekeeping_service.py` 패턴을 100% 복제 (state machine + history + audit + email).

state machine:
  recruiting → in_progress → completed
  (역방향·건너뛰기 모두 차단)
"""
from __future__ import annotations

import datetime as _dt
import logging
from typing import Final

import sqlalchemy as sa
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.email import notify

logger = logging.getLogger(__name__)


# design.md §3.2 project_stage ENUM (3단계)
ALL_PROJECT_STAGES: Final[tuple[str, ...]] = (
    "recruiting",
    "in_progress",
    "completed",
)

# State machine: recruiting → in_progress → completed (단방향)
PROJECT_TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    "recruiting": frozenset({"in_progress"}),
    "in_progress": frozenset({"completed"}),
    "completed": frozenset(),
}

# 단계 전환 시 발송할 이메일 템플릿
_STAGE_NOTIFY_TEMPLATE: Final[dict[str, str]] = {
    # design.md 의 notify_ 템플릿 활용 — 신규 추가는 §5.5 ext
    "in_progress": "notify_in_progress",  # 의제용 템플릿 재활용 (프로젝트 보강 후 별도 분리 예정)
    "completed": "notify_resolved",
}


# ════════════════════════════════════════════════════════════════
#  M03-13 단계 전환 (state machine)
# ════════════════════════════════════════════════════════════════


async def transition_project_v2(
    db: AsyncSession,
    *,
    project_id: str,
    operator_id: str,
    to_stage: str,
    comment: str | None = None,
) -> dict[str, object]:
    """M03-13 리빙랩 단계 전환 (운영자 전용).

    Raises:
        HTTPException 404: 프로젝트 미존재
        HTTPException 409: state machine 위반 (예: completed→recruiting)
        HTTPException 422: 정의되지 않은 단계
    """
    if to_stage not in ALL_PROJECT_STAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_target_stage",
                "message": "정의되지 않은 단계입니다.",
            },
        )

    project = await _fetch_project(db, project_id)
    current_stage = project["stage"]

    allowed = PROJECT_TRANSITIONS.get(current_stage, frozenset())
    if to_stage not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "invalid_transition",
                "message": (
                    f"현재 단계({current_stage})에서 {to_stage} 로 전환할 수 없습니다."
                ),
                "current_stage": current_stage,
                "allowed_next_stages": sorted(allowed),
            },
        )

    now = _dt.datetime.now(_dt.UTC)

    try:
        # 1. livinglab_projects.stage 업데이트
        await db.execute(
            sa.text(
                """
                UPDATE livinglab_projects
                SET stage = CAST(:next_stage AS project_stage),
                    phase = :next_phase,
                    updated_at = :now
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": project_id,
                "next_stage": to_stage,
                "next_phase": _v1_phase_for(to_stage),
                "now": now,
            },
        )

        # 2. project_stage_history INSERT (자동 기록)
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO project_stage_history
                        (project_id, prev_stage, next_stage, actor_id, reason, created_at)
                    VALUES
                        (CAST(:pid AS uuid),
                         CAST(:prev AS project_stage),
                         CAST(:next AS project_stage),
                         CAST(:actor AS uuid),
                         :reason, :now)
                    """
                ),
                {
                    "pid": project_id,
                    "prev": current_stage,
                    "next": to_stage,
                    "actor": operator_id,
                    "reason": comment or "",
                    "now": now,
                },
            )
        except Exception:  # noqa: BLE001 — 테이블 미존재 dev 환경
            pass

        # 3. audit_logs INSERT (M08-05)
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('stage_change' AS audit_action),
                         'project', CAST(:pid AS uuid),
                         jsonb_build_object('prev_stage', :prev, 'next_stage', :next),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "pid": project_id,
                    "prev": current_stage,
                    "next": to_stage,
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
        logger.exception("transition_project_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "transition_failed",
                "message": "단계 전환 중 오류가 발생했습니다.",
            },
        ) from exc

    # 4. 이메일 알림 (gatekeeping 패턴 복제)
    await _enqueue_project_stage_notification(
        project, next_stage=to_stage, comment=comment
    )

    return {
        "project_id": project_id,
        "prev_stage": current_stage,
        "stage": to_stage,
        "transitioned_at": now.isoformat(),
    }


# ════════════════════════════════════════════════════════════════
#  M03-07 수정·삭제
# ════════════════════════════════════════════════════════════════


async def update_project_v2(
    db: AsyncSession,
    *,
    project_id: str,
    operator_id: str,
    title: str | None = None,
    summary: str | None = None,
    region: str | None = None,
    start_at: _dt.date | None = None,
    end_at: _dt.date | None = None,
) -> dict[str, object]:
    """M03-07 리빙랩 수정. None 인 필드는 미변경."""
    await _fetch_project(db, project_id)  # 존재 확인

    updates: list[str] = []
    params: dict[str, object] = {"id": project_id}

    if title is not None:
        title_norm = title.strip()
        if not (1 <= len(title_norm) <= 200):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_title_length",
                    "message": "제목은 1~200자로 입력해 주세요.",
                },
            )
        updates.append("title = :title")
        params["title"] = title_norm

    if summary is not None:
        summary_norm = summary.strip()
        if len(summary_norm) > 500:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_summary_length",
                    "message": "한 줄 요약은 500자 이내로 입력해 주세요.",
                },
            )
        updates.append("summary = :summary, description = :summary")
        params["summary"] = summary_norm

    if region is not None:
        if region not in {
            "daejeon",
            "gongju",
            "yesan",
            "cheonan",
            "sejong",
        }:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_region",
                    "message": "5개 지역 중 하나를 선택해 주세요.",
                },
            )
        updates.append("region = CAST(:region AS region)")
        params["region"] = region

    if start_at is not None:
        updates.append("start_at = :start_at")
        params["start_at"] = start_at
    if end_at is not None:
        updates.append("end_at = :end_at")
        params["end_at"] = end_at

    if not updates:
        return {"project_id": project_id, "updated": False}

    now = _dt.datetime.now(_dt.UTC)
    params["now"] = now
    updates.append("updated_at = :now")

    try:
        await db.execute(
            sa.text(
                f"""
                UPDATE livinglab_projects
                SET {", ".join(updates)}
                WHERE id = CAST(:id AS uuid)
                """
            ),
            params,
        )

        # audit log
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('update' AS audit_action),
                         'project', CAST(:pid AS uuid),
                         jsonb_build_object('fields', :fields),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "pid": project_id,
                    "fields": sorted([u.split(" =")[0].strip() for u in updates if "updated_at" not in u]),
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
        logger.exception("update_project_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "update_failed",
                "message": "수정 중 오류가 발생했습니다.",
            },
        ) from exc

    return {"project_id": project_id, "updated": True}


async def delete_project_v2(
    db: AsyncSession,
    *,
    project_id: str,
    operator_id: str,
) -> dict[str, object]:
    """M03-07 리빙랩 삭제.

    유의사항: 완료(completed) 단계 프로젝트는 이력 보존을 위해 삭제 불가.
    """
    project = await _fetch_project(db, project_id)

    if project["stage"] == "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "completed_protected",
                "message": "완료된 프로젝트는 이력 보존을 위해 삭제할 수 없습니다.",
            },
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        # audit log 먼저 (DELETE 후엔 FK 끊김)
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('delete' AS audit_action),
                         'project', CAST(:pid AS uuid),
                         jsonb_build_object('title', :title, 'stage', :stage),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "pid": project_id,
                    "title": project.get("title"),
                    "stage": project.get("stage"),
                    "now": now,
                },
            )
        except Exception:  # noqa: BLE001
            pass

        await db.execute(
            sa.text(
                "DELETE FROM livinglab_projects WHERE id = CAST(:id AS uuid)"
            ),
            {"id": project_id},
        )
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("delete_project_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "delete_failed",
                "message": "삭제 중 오류가 발생했습니다.",
            },
        ) from exc

    return {"project_id": project_id, "deleted": True}


# ════════════════════════════════════════════════════════════════
#  내부 헬퍼
# ════════════════════════════════════════════════════════════════


def _v1_phase_for(stage: str) -> str:
    """V2 stage → V1 phase 호환 매핑."""
    return {
        "recruiting": "discover",
        "in_progress": "execute",
        "completed": "utilize",
    }.get(stage, "discover")


async def _fetch_project(
    db: AsyncSession, project_id: str
) -> dict[str, object]:
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        id::text                   AS id,
                        title                       AS title,
                        COALESCE(stage::text, phase) AS stage,
                        region::text                AS region,
                        owner_id::text              AS owner_id
                    FROM livinglab_projects
                    WHERE id = CAST(:id AS uuid)
                    LIMIT 1
                    """
                ),
                {"id": project_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        row = None

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "project_not_found",
                "message": "프로젝트를 찾을 수 없습니다.",
            },
        )

    return {
        "id": row.id,
        "title": row.title,
        "stage": row.stage,
        "region": row.region,
        "owner_id": row.owner_id,
    }


async def _enqueue_project_stage_notification(
    project: dict[str, object],
    *,
    next_stage: str,
    comment: str | None,
) -> None:
    template_id = _STAGE_NOTIFY_TEMPLATE.get(next_stage)
    if template_id is None:
        return

    base_url = getattr(settings, "public_base_url", "https://uscp.kongju.ac.kr")
    context = {
        "project_id": str(project["id"]),
        "project_title": project["title"],
        "region": project.get("region"),
        "stage": next_stage,
        "comment": comment or "",
        "project_url": f"{base_url}/projects/{project['id']}",
        "base_url": base_url,
    }

    try:
        # 운영자 inbox 로 일단 발송 (멘토단·학생팀 매칭 도입 후 분기 확장)
        await notify(
            template_id,  # type: ignore[arg-type]
            to=str(getattr(settings, "operator_inbox_email", "operator@uscp.local")),
            context=context,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("project stage notification failed: %s", exc)
