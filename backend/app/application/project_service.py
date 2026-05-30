"""USCP V2 — Application / Project Service (M03 리빙랩 운영).

설계 근거:
  - feature-spec §M03-06 (리빙랩 등록 — 운영자)
  - feature-spec §M03-01/02 (목록·상세)
  - feature-spec §M03-14 (의제↔리빙랩 연결)
  - design.md §4.2 M03 (POST /admin/projects, GET /projects, GET /projects/{id})
  - design.md §3.2 project_stage ENUM (recruiting/in_progress/completed) — 3단계
  - design.md §3.3 region ENUM 5종

Sprint 2 의 `gatekeeping_service.py` 패턴을 복제하여 Sprint 3 에서 점진 확장.

V1 호환:
  - 기존 `livinglab_projects` 테이블 (V1) 을 그대로 사용하되 V2 컬럼 (region/stage/source_issue_id)
    을 우선 채워 V2 ENUM 정합성 확보.
  - 응답은 V2 컬럼 우선, V1 phase 컬럼 fallback.
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


# design.md §3.2 region ENUM (5개 지역)
_VALID_REGIONS: Final[frozenset[str]] = frozenset(
    {"daejeon", "gongju", "yesan", "cheonan", "sejong"}
)

# design.md §3.2 project_stage ENUM (3단계 — feature-spec §M03-13)
_VALID_STAGES: Final[frozenset[str]] = frozenset(
    {"recruiting", "in_progress", "completed"}
)
ALL_PROJECT_STAGES: Final[tuple[str, ...]] = (
    "recruiting",
    "in_progress",
    "completed",
)

# State machine: recruiting → in_progress → completed (단방향, M03-13 유의사항)
PROJECT_TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    "recruiting": frozenset({"in_progress"}),
    "in_progress": frozenset({"completed"}),
    "completed": frozenset(),
}

_TITLE_MAX = 200
_SUMMARY_MAX = 500


# ════════════════════════════════════════════════════════════════
#  M03-06 — 리빙랩 등록 (운영자)
# ════════════════════════════════════════════════════════════════


async def submit_project_v2(
    db: AsyncSession,
    *,
    operator_id: str,
    title: str,
    summary: str | None,
    region: str,
    source_issue_id: str | None = None,
    start_at: _dt.date | None = None,
    end_at: _dt.date | None = None,
) -> dict[str, object]:
    """V2 리빙랩 프로젝트 등록 (M03-06).

    Returns:
        {"project_id": str, "stage": "recruiting", "region": str, "created_at": iso8601}

    Raises:
        HTTPException 422: region 미정의·title 길이 위반·날짜 역전

    Note:
        의제(제보) 연결은 N:M (project_issues join table). 등록 시 source_issue_id 1건을
        선택 연결할 수 있으나, 동일 의제의 다중 프로젝트 연결을 막지 않는다 (H01 N:M 결정).
    """
    # ── 1. 입력 검증 ─────────────────────────────────────────
    region_norm = region.lower().strip()
    if region_norm not in _VALID_REGIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_region",
                "message": "5개 지역(대전·공주·예산·천안·세종) 중 하나를 선택해 주세요.",
                "valid_regions": sorted(_VALID_REGIONS),
            },
        )

    title_norm = title.strip()
    if not (1 <= len(title_norm) <= _TITLE_MAX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_title_length",
                "message": f"제목은 1자 이상 {_TITLE_MAX}자 이내로 입력해 주세요.",
            },
        )

    summary_norm = (summary or "").strip()
    if summary_norm and len(summary_norm) > _SUMMARY_MAX:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_summary_length",
                "message": f"한 줄 요약은 {_SUMMARY_MAX}자 이내로 입력해 주세요.",
            },
        )

    if start_at and end_at and end_at < start_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_date_range",
                "message": "종료 예정일은 시작 예정일 이후여야 합니다.",
            },
        )

    # ── 2. livinglab_projects INSERT (V1 호환 + V2 컬럼) ──────
    # H01: source_issue_id 단일 FK 폐기 → 연결은 project_issues join table 로 일원화.
    project_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)

    try:
        # V1 컬럼 (phase) + V2 컬럼 (stage/region) 동시 채움
        await db.execute(
            sa.text(
                """
                INSERT INTO livinglab_projects
                    (id, title, description, summary,
                     phase, stage, region,
                     start_at, end_at,
                     owner_id,
                     created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), :title, :summary, :summary,
                     'discover', CAST('recruiting' AS project_stage), CAST(:region AS region),
                     :start_at, :end_at,
                     CAST(:owner AS uuid),
                     :now, :now)
                """
            ),
            {
                "id": str(project_id),
                "title": title_norm,
                "summary": summary_norm or title_norm,
                "region": region_norm,
                "start_at": start_at,
                "end_at": end_at,
                "owner": operator_id,
                "now": now,
            },
        )

        # ── 등록 시 선택 의제 연결 (N:M join table, idempotent) ──
        if source_issue_id:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO project_issues (project_id, issue_id, linked_by)
                    VALUES (CAST(:pid AS uuid), CAST(:iid AS uuid), CAST(:actor AS uuid))
                    ON CONFLICT (project_id, issue_id) DO NOTHING
                    """
                ),
                {"pid": str(project_id), "iid": source_issue_id, "actor": operator_id},
            )

        # project_stage_history INSERT — Sprint 3 Day 4-7 의 lifecycle_service 패턴 선반영
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO project_stage_history
                        (project_id, prev_stage, next_stage, actor_id, reason, created_at)
                    VALUES
                        (CAST(:pid AS uuid), NULL,
                         CAST('recruiting' AS project_stage),
                         CAST(:actor AS uuid),
                         :reason, :now)
                    """
                ),
                {
                    "pid": str(project_id),
                    "actor": operator_id,
                    "reason": "운영자 등록 — 모집중 진입",
                    "now": now,
                },
            )
        except Exception:  # noqa: BLE001 — 테이블 미존재 dev 환경
            pass

        # audit_logs INSERT (M08-05)
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('create' AS audit_action),
                         'project', CAST(:pid AS uuid),
                         jsonb_build_object(
                            'title', :title,
                            'region', :region,
                            'source_issue_id', :source_issue_id
                         ),
                         :now)
                    """
                ),
                {
                    "actor": operator_id,
                    "pid": str(project_id),
                    "title": title_norm,
                    "region": region_norm,
                    "source_issue_id": source_issue_id,
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
        logger.exception("submit_project_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "submit_failed",
                "message": "프로젝트 등록 중 오류가 발생했습니다.",
            },
        ) from exc

    return {
        "project_id": str(project_id),
        "stage": "recruiting",
        "region": region_norm,
        "title": title_norm,
        "summary": summary_norm or title_norm,
        "source_issue_id": source_issue_id,
        "created_at": now.isoformat(),
    }


# ════════════════════════════════════════════════════════════════
#  M03-01/02 공개 목록·상세
# ════════════════════════════════════════════════════════════════


async def list_projects_v2(
    db: AsyncSession,
    *,
    region: str | None = None,
    stage: str | None = None,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, object]:
    """M03-01 리빙랩 목록 (공개). 필터: 지역·단계."""
    limit = max(1, min(limit, 50))
    clauses = ["1=1"]
    params: dict[str, object] = {"limit_plus_one": limit + 1}

    if region and region in _VALID_REGIONS:
        clauses.append("region::text = :region")
        params["region"] = region
    if stage and stage in _VALID_STAGES:
        clauses.append("COALESCE(stage::text, phase) = :stage")
        params["stage"] = stage
    if cursor:
        clauses.append("created_at < :cursor")
        params["cursor"] = cursor

    sql = f"""
        SELECT
            id::text                   AS id,
            title,
            summary,
            region::text               AS region,
            COALESCE(stage::text, phase) AS stage,
            start_at, end_at,
            created_at
        FROM livinglab_projects
        WHERE {" AND ".join(clauses)}
        ORDER BY created_at DESC
        LIMIT :limit_plus_one
    """
    try:
        rows = (await db.execute(sa.text(sql), params)).mappings().all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_projects_v2 fallback: %s", exc)
        rows = []

    rows_list = list(rows)
    has_more = len(rows_list) > limit
    items = rows_list[:limit]
    next_cursor = (
        items[-1]["created_at"].isoformat()
        if has_more and items and hasattr(items[-1]["created_at"], "isoformat")
        else None
    )

    return {
        "data": [_serialize_project_row(r) for r in items],
        "meta": {"limit": limit, "has_more": has_more, "next_cursor": next_cursor},
    }


async def get_project_v2(
    db: AsyncSession,
    *,
    project_id: str,
) -> dict[str, object]:
    """M03-02 리빙랩 상세 (공개)."""
    try:
        row = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        id::text                    AS id,
                        title,
                        summary,
                        description,
                        region::text                AS region,
                        COALESCE(stage::text, phase) AS stage,
                        start_at, end_at,
                        owner_id::text              AS owner_id,
                        created_at
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

    linked_issues = await get_linked_issues_v2(db, project_id=project_id)

    return {
        "id": str(row.id),
        "title": row.title,
        "summary": row.summary,
        "description": getattr(row, "description", None),
        "region": row.region,
        "stage": row.stage,
        "linked_issues": linked_issues,
        "start_at": row.start_at.isoformat() if row.start_at else None,
        "end_at": row.end_at.isoformat() if row.end_at else None,
        "owner_id": row.owner_id,
        "created_at": (
            row.created_at.isoformat()
            if hasattr(row.created_at, "isoformat")
            else str(row.created_at)
        ),
    }


# ════════════════════════════════════════════════════════════════
#  내부 헬퍼
# ════════════════════════════════════════════════════════════════


def _serialize_project_row(r: dict[str, object]) -> dict[str, object]:
    created = r["created_at"]
    start = r.get("start_at")
    end = r.get("end_at")
    return {
        "id": str(r["id"]),
        "title": r["title"],
        "summary": r.get("summary"),
        "region": r.get("region"),
        "stage": r.get("stage"),
        "start_at": start.isoformat() if start and hasattr(start, "isoformat") else (str(start) if start else None),
        "end_at": end.isoformat() if end and hasattr(end, "isoformat") else (str(end) if end else None),
        "created_at": (
            created.isoformat() if hasattr(created, "isoformat") else str(created)
        ),
    }


# ════════════════════════════════════════════════════════════════
#  M03-03 활동 타임라인 조회
# ════════════════════════════════════════════════════════════════


async def list_project_timeline_v2(
    db: AsyncSession,
    *,
    project_id: str,
    limit: int = 50,
) -> dict[str, object]:
    """M03-03 활동 타임라인 조회 (공개).

    최근 항목이 먼저 노출되도록 entry_date 내림차순.
    """
    limit = max(1, min(limit, 200))

    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT
                        t.id::text         AS id,
                        t.entry_date       AS entry_date,
                        t.title            AS title,
                        t.description      AS description,
                        t.created_at       AS created_at,
                        t.created_by::text AS created_by_id,
                        u.name             AS created_by_name
                    FROM timeline_entries t
                    LEFT JOIN users u ON u.id = t.created_by
                    WHERE t.project_id = CAST(:pid AS uuid)
                    ORDER BY t.entry_date DESC, t.created_at DESC
                    LIMIT :lim
                    """
                ),
                {"pid": project_id, "lim": limit},
            )
        ).mappings().all()
    except Exception as exc:  # noqa: BLE001 — 0010 미적용 dev 환경 fallback
        logger.warning("list_project_timeline_v2 fallback: %s", exc)
        rows = []

    return {
        "data": [
            {
                "id": str(r["id"]),
                "entry_date": (
                    r["entry_date"].isoformat()
                    if hasattr(r["entry_date"], "isoformat")
                    else str(r["entry_date"])
                ),
                "title": r["title"],
                "description": r["description"],
                "created_at": (
                    r["created_at"].isoformat()
                    if hasattr(r["created_at"], "isoformat")
                    else str(r["created_at"])
                ),
                "created_by": {
                    "id": r["created_by_id"],
                    "name": r["created_by_name"] or "익명",
                },
            }
            for r in rows
        ],
        "meta": {"total": len(rows)},
    }


# ════════════════════════════════════════════════════════════════
#  M03-08 — 활동 타임라인 작성
# ════════════════════════════════════════════════════════════════


async def is_project_member_v2(
    db: AsyncSession,
    *,
    project_id: str,
    user_id: str,
    user_role: str,
) -> bool:
    """`require_project_member` 권한 검증 (design.md §6.2).

    매칭된 멘토/학생팀 또는 operator 이면 True.
    matchings 테이블이 미존재(0010 미적용) 시 owner_id 비교 fallback.
    """
    if str(user_role).lower() in ("operator", "admin"):
        return True

    try:
        row = await db.execute(
            sa.text(
                """
                SELECT 1 FROM matchings
                WHERE project_id = CAST(:pid AS uuid)
                  AND (mentor_id = CAST(:uid AS uuid)
                       OR team_id IN (
                            SELECT team_id FROM team_members
                            WHERE user_id = CAST(:uid AS uuid)
                       ))
                LIMIT 1
                """
            ),
            {"pid": project_id, "uid": user_id},
        )
        if row.first() is not None:
            return True
    except Exception:  # noqa: BLE001 — 0010 테이블 미존재 dev fallback
        pass

    # Fallback: owner_id 비교
    try:
        row = await db.execute(
            sa.text(
                """
                SELECT 1 FROM livinglab_projects
                WHERE id = CAST(:pid AS uuid)
                  AND owner_id = CAST(:uid AS uuid)
                LIMIT 1
                """
            ),
            {"pid": project_id, "uid": user_id},
        )
        return row.first() is not None
    except Exception:  # noqa: BLE001
        return False


async def create_timeline_entry_v2(
    db: AsyncSession,
    *,
    project_id: str,
    author_id: str,
    author_role: str,
    entry_date: _dt.date,
    title: str,
    description: str | None = None,
) -> dict[str, object]:
    """M03-08 활동 타임라인 작성. 매칭 멤버 또는 운영자만."""
    if not await is_project_member_v2(
        db, project_id=project_id, user_id=author_id, user_role=author_role
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "project_member_required",
                "message": "매칭된 멤버 또는 운영자만 타임라인을 작성할 수 있습니다.",
            },
        )

    title_norm = title.strip()
    if not (1 <= len(title_norm) <= 200):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_title_length",
                "message": "제목은 1~200자로 입력해 주세요.",
            },
        )

    entry_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO timeline_entries
                    (id, project_id, entry_date, title, description, created_by, created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), CAST(:pid AS uuid), :entry_date,
                     :title, :description, CAST(:author AS uuid), :now, :now)
                """
            ),
            {
                "id": str(entry_id),
                "pid": project_id,
                "entry_date": entry_date,
                "title": title_norm,
                "description": (description or "").strip() or None,
                "author": author_id,
                "now": now,
            },
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_timeline_entry_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "create_failed",
                "message": "타임라인 작성 실패",
            },
        ) from exc

    return {
        "id": str(entry_id),
        "project_id": project_id,
        "entry_date": entry_date.isoformat(),
        "title": title_norm,
        "description": description,
        "created_at": now.isoformat(),
    }


# ════════════════════════════════════════════════════════════════
#  M03-09/10 산출물 — presigned URL + 메타데이터
# ════════════════════════════════════════════════════════════════


_MAX_DELIVERABLE_SIZE_BYTES = 100 * 1024 * 1024  # 100MB (feature-spec §M03-09)


async def presign_deliverable_v2(
    db: AsyncSession,
    *,
    project_id: str,
    uploader_id: str,
    uploader_role: str,
    filename: str,
    content_type: str,
    size_bytes: int,
) -> dict[str, object]:
    """M03-09 산출물 업로드 presigned URL 발급."""
    if not await is_project_member_v2(
        db,
        project_id=project_id,
        user_id=uploader_id,
        user_role=uploader_role,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "project_member_required",
                "message": "매칭된 멤버 또는 운영자만 산출물을 업로드할 수 있습니다.",
            },
        )

    if size_bytes <= 0 or size_bytes > _MAX_DELIVERABLE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "file_too_large",
                "message": "파일은 1byte 이상 100MB 이내여야 합니다.",
                "max_bytes": _MAX_DELIVERABLE_SIZE_BYTES,
                "got_bytes": size_bytes,
            },
        )

    safe_name = filename.split("/")[-1].split("\\")[-1].strip()
    if not safe_name:
        safe_name = uuid.uuid4().hex
    minio_key = f"deliverables/{project_id}/{uuid.uuid4().hex}-{safe_name}"

    try:
        from app.core.storage import get_minio_client  # type: ignore

        client = get_minio_client()
        upload_url = client.presigned_put_object(
            bucket_name=settings.minio_bucket,
            object_name=minio_key,
            expires=300,
        )
    except Exception:  # noqa: BLE001 — dev 환경 stub
        upload_url = f"https://stub-minio/{minio_key}?stub=1"

    return {
        "upload_url": upload_url,
        "minio_key": minio_key,
        "expires_in_seconds": 300,
    }


async def create_deliverable_v2(
    db: AsyncSession,
    *,
    project_id: str,
    uploader_id: str,
    uploader_role: str,
    title: str,
    minio_key: str,
    content_type: str | None = None,
    size_bytes: int | None = None,
    stage: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, object]:
    """M03-09 산출물 메타데이터 등록 (presigned 업로드 완료 후 호출)."""
    if not await is_project_member_v2(
        db,
        project_id=project_id,
        user_id=uploader_id,
        user_role=uploader_role,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "project_member_required",
                "message": "매칭된 멤버 또는 운영자만 산출물을 등록할 수 있습니다.",
            },
        )

    title_norm = title.strip()
    if not (1 <= len(title_norm) <= 200):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_title_length",
                "message": "제목은 1~200자로 입력해 주세요.",
            },
        )

    deliverable_id = uuid.uuid4()
    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO deliverables
                    (id, project_id, title, stage, tags, minio_key,
                     file_size, content_type, status, uploaded_by,
                     created_at, updated_at)
                VALUES
                    (CAST(:id AS uuid), CAST(:pid AS uuid), :title, :stage,
                     CAST(:tags AS varchar[]), :minio_key,
                     :file_size, :content_type, 'ready',
                     CAST(:uploader AS uuid), :now, :now)
                """
            ),
            {
                "id": str(deliverable_id),
                "pid": project_id,
                "title": title_norm,
                "stage": stage,
                "tags": tags or [],
                "minio_key": minio_key,
                "file_size": size_bytes,
                "content_type": content_type,
                "uploader": uploader_id,
                "now": now,
            },
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("create_deliverable_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "deliverable_create_failed",
                "message": "산출물 등록 실패",
            },
        ) from exc

    return {
        "id": str(deliverable_id),
        "project_id": project_id,
        "title": title_norm,
        "minio_key": minio_key,
        "stage": stage,
        "tags": tags or [],
        "uploaded_by": uploader_id,
        "created_at": now.isoformat(),
    }


async def update_deliverable_meta_v2(
    db: AsyncSession,
    *,
    deliverable_id: str,
    actor_id: str,
    actor_role: str,
    title: str | None = None,
    stage: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, object]:
    """M03-10 산출물 메타데이터 수정 — 업로드자 본인 또는 operator."""
    try:
        row = await db.execute(
            sa.text(
                """
                SELECT
                    project_id::text   AS project_id,
                    uploaded_by::text  AS uploaded_by
                FROM deliverables
                WHERE id = CAST(:id AS uuid)
                LIMIT 1
                """
            ),
            {"id": deliverable_id},
        )
        target = row.first()
    except Exception:  # noqa: BLE001
        target = None

    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "deliverable_not_found",
                "message": "산출물을 찾을 수 없습니다.",
            },
        )

    if (
        str(target.uploaded_by) != actor_id
        and str(actor_role).lower() not in ("operator", "admin")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "not_uploader",
                "message": "업로드자 본인 또는 운영자만 수정할 수 있습니다.",
            },
        )

    updates: list[str] = []
    params: dict[str, object] = {"id": deliverable_id}

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

    if stage is not None:
        updates.append("stage = :stage")
        params["stage"] = stage

    if tags is not None:
        updates.append("tags = CAST(:tags AS varchar[])")
        params["tags"] = tags

    if not updates:
        return {"id": deliverable_id, "updated": False}

    now = _dt.datetime.now(_dt.UTC)
    params["now"] = now
    updates.append("updated_at = :now")

    try:
        await db.execute(
            sa.text(
                f"""
                UPDATE deliverables
                SET {", ".join(updates)}
                WHERE id = CAST(:id AS uuid)
                """
            ),
            params,
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("update_deliverable_meta_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "deliverable_update_failed",
                "message": "산출물 메타데이터 수정 실패",
            },
        ) from exc

    return {"id": deliverable_id, "updated": True}


# ════════════════════════════════════════════════════════════════
#  M03-14 — 의제↔리빙랩 N:M 연결 (운영자, project_issues join table)
# ════════════════════════════════════════════════════════════════


async def get_linked_issues_v2(
    db: AsyncSession,
    *,
    project_id: str,
) -> list[dict[str, object]]:
    """프로젝트에 연결된 의제(제보) 목록 [{id, title, stage}] 반환 (N:M).

    project_issues join table 기준. 없으면 빈 리스트.
    """
    try:
        rows = (
            await db.execute(
                sa.text(
                    """
                    SELECT i.id::text AS id, i.title AS title,
                           COALESCE(i.stage::text, i.status) AS stage,
                           pi.linked_at AS linked_at
                    FROM project_issues pi
                    JOIN issues i ON i.id = pi.issue_id
                    WHERE pi.project_id = CAST(:pid AS uuid)
                    ORDER BY pi.linked_at DESC
                    """
                ),
                {"pid": project_id},
            )
        ).all()
    except Exception:  # noqa: BLE001 — project_issues 미존재 dev fallback
        return []
    return [
        {"id": str(r.id), "title": r.title, "stage": r.stage}
        for r in rows
    ]


async def link_issue_to_project_v2(
    db: AsyncSession,
    *,
    project_id: str,
    issue_id: str,
    operator_id: str,
) -> dict[str, object]:
    """M03-14 의제↔리빙랩 연결 (운영자, N:M).

    project_issues join table 에 (project_id, issue_id) 1행 추가.
    동일 쌍이 이미 있으면 idempotent (ON CONFLICT DO NOTHING) — 409 없음.
    동일 의제의 다중 프로젝트 연결 허용 (H01 N:M 결정).

    Raises:
        HTTPException 404: project 또는 issue 미존재
    """
    # 프로젝트 존재 확인
    try:
        proj = (
            await db.execute(
                sa.text(
                    "SELECT 1 FROM livinglab_projects WHERE id = CAST(:pid AS uuid) LIMIT 1"
                ),
                {"pid": project_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        proj = None
    if proj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "project_not_found", "message": "프로젝트를 찾을 수 없습니다."},
        )

    # 의제 존재 확인
    try:
        issue = (
            await db.execute(
                sa.text("SELECT title FROM issues WHERE id = CAST(:iid AS uuid) LIMIT 1"),
                {"iid": issue_id},
            )
        ).first()
    except Exception:  # noqa: BLE001
        issue = None
    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "issue_not_found", "message": "연결할 제보를 찾을 수 없습니다."},
        )

    now = _dt.datetime.now(_dt.UTC)
    try:
        await db.execute(
            sa.text(
                """
                INSERT INTO project_issues (project_id, issue_id, linked_by)
                VALUES (CAST(:pid AS uuid), CAST(:iid AS uuid), CAST(:actor AS uuid))
                ON CONFLICT (project_id, issue_id) DO NOTHING
                """
            ),
            {"pid": project_id, "iid": issue_id, "actor": operator_id},
        )

        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('update' AS audit_action),
                         'project', CAST(:pid AS uuid),
                         jsonb_build_object('linked_issue_id', :iid),
                         :now)
                    """
                ),
                {"actor": operator_id, "pid": project_id, "iid": issue_id, "now": now},
            )
        except Exception:  # noqa: BLE001
            pass

        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("link_issue_to_project_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "link_failed", "message": "의제 연결 중 오류가 발생했습니다."},
        ) from exc

    linked_issues = await get_linked_issues_v2(db, project_id=project_id)
    return {
        "project_id": project_id,
        "linked_issue": {"id": issue_id, "title": issue.title},
        "linked_issues": linked_issues,
        "message": "의제를 프로젝트에 연결했습니다.",
    }


async def unlink_issue_from_project_v2(
    db: AsyncSession,
    *,
    project_id: str,
    issue_id: str,
    operator_id: str,
) -> dict[str, object]:
    """M03-14 의제 연결 해제 (운영자, N:M).

    project_issues 에서 (project_id, issue_id) 1행 제거. 다른 연결은 보존.

    Raises:
        HTTPException 404: 해당 연결이 존재하지 않음
    """
    now = _dt.datetime.now(_dt.UTC)
    try:
        result = await db.execute(
            sa.text(
                """
                DELETE FROM project_issues
                WHERE project_id = CAST(:pid AS uuid)
                  AND issue_id = CAST(:iid AS uuid)
                """
            ),
            {"pid": project_id, "iid": issue_id},
        )
        if result.rowcount == 0:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "link_not_found",
                    "message": "해당 의제 연결을 찾을 수 없습니다.",
                },
            )

        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO audit_logs
                        (actor_id, action, target_type, target_id, metadata, created_at)
                    VALUES
                        (CAST(:actor AS uuid), CAST('update' AS audit_action),
                         'project', CAST(:pid AS uuid),
                         jsonb_build_object('unlinked_issue_id', :iid),
                         :now)
                    """
                ),
                {"actor": operator_id, "pid": project_id, "iid": issue_id, "now": now},
            )
        except Exception:  # noqa: BLE001
            pass

        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        logger.exception("unlink_issue_from_project_v2 failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "unlink_failed", "message": "연결 해제 중 오류가 발생했습니다."},
        ) from exc

    linked_issues = await get_linked_issues_v2(db, project_id=project_id)
    return {
        "project_id": project_id,
        "linked_issues": linked_issues,
        "message": "의제 연결을 해제했습니다.",
    }
