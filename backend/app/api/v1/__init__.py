"""API v1 router aggregation."""
from fastapi import APIRouter

from app.api.v1 import (
    admin_kpi,
    admin_upload,
    auth,
    cms,
    health,
    issues,
    notifications,
    oauth,
    project_membership,
    projects,
    success_cases,
    users,
    volunteers,
)

# V2 presentation layer routers (Sprint 1+ 점진 도입)
from app.presentation.auth import router as v2_auth_router
from app.presentation.common import router as common_router
from app.presentation.issues import admin_router as v2_admin_issues_router
from app.presentation.issues import router as v2_issues_router
from app.presentation.mentors import admin_router as v2_mentors_admin_router
from app.presentation.mentors import router as v2_matching_activity_router
from app.presentation.network import admin_router as v2_network_admin_router
from app.presentation.network import community_router as v2_community_router
from app.presentation.network import router as v2_network_router
from app.presentation.projects import admin_router as v2_admin_projects_router
from app.presentation.projects import posts_router as v2_posts_router_module
from app.presentation.projects import router as v2_projects_router
from app.presentation.projects import success_admin_router as v2_success_admin_router

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
# V2 M09 공통 라우터 — /common/{stats,regions/map,health} (M09-01/05/06/09)
api_router.include_router(common_router, prefix="/common", tags=["common-v2"])
# V2 M01 인증 라우터 — /auth/signup, /auth/login (M01-01/02/03/04/13).
api_router.include_router(v2_auth_router, prefix="/auth", tags=["auth-v2"])
# V2 M02 제보 라우터 — POST /issues, POST /issues/photos/presign (M02-01).
# V1 /issues GET/POST 와 동일 prefix 이지만 FastAPI 는 정의 순서 우선이므로 V2 가 먼저 매칭.
api_router.include_router(v2_issues_router, prefix="/issues", tags=["issues-v2"])
# V2 M02 게이트키핑 admin 라우터 (M02-06~11) — 운영자 전용.
api_router.include_router(
    v2_admin_issues_router, prefix="/admin/issues", tags=["admin-issues-v2"]
)
# V2 M03 리빙랩 공개 라우터 (M03-01/02) — GET /projects, GET /projects/{id}.
api_router.include_router(
    v2_projects_router, prefix="/projects", tags=["projects-v2"]
)
# V2 M03 리빙랩 admin 라우터 (M03-06+) — POST /admin/projects.
api_router.include_router(
    v2_admin_projects_router, prefix="/admin/projects", tags=["admin-projects-v2"]
)
# V2 M03-11/12 성공사례·정책반영 admin 라우터 — /admin/success-cases (운영자 전용).
api_router.include_router(
    v2_success_admin_router.router, prefix="/admin/success-cases", tags=["admin-success-v2"]
)
# V2 M03-15~18 프로젝트 게시판 (멤버 전용) — /projects/{id}/posts, /comments/project-posts.
api_router.include_router(
    v2_posts_router_module.router, prefix="/projects", tags=["project-board-v2"]
)
api_router.include_router(
    v2_posts_router_module.comments_router, prefix="/comments", tags=["project-board-v2"]
)
# V2 M04 멘토·학생팀 매칭 admin 라우터 (M04-01~07) — /admin/mentors, /admin/teams, /admin/matchings.
api_router.include_router(
    v2_mentors_admin_router.router, prefix="/admin", tags=["mentors-admin-v2"]
)
# V2 M04-08 멘토단 활동 기록 — /projects/{id}/matching-activities (매칭 멘토 본인 + 운영자).
api_router.include_router(
    v2_matching_activity_router.activity_router, prefix="/projects", tags=["matching-activity-v2"]
)
# V2 M04-09 본인 매칭·활동 이력 — /me/matching-history (마이페이지).
api_router.include_router(
    v2_matching_activity_router.history_router, prefix="/me", tags=["matching-activity-v2"]
)
# V2 M04-09 운영자: 특정 멘토 이력 — /admin/mentors/{user_id}/matching-history.
api_router.include_router(
    v2_matching_activity_router.admin_history_router,
    prefix="/admin/mentors",
    tags=["mentors-admin-v2"],
)
# V2 M05 협력 네트워크 공개 라우터 — /network/{organizations,mous,community} (M05-02/05/07).
api_router.include_router(
    v2_network_router.router, prefix="/network", tags=["network-v2"]
)
# V2 M05-08 커뮤니티 댓글 (로그인 시민) — /network/community/{id}/comments.
api_router.include_router(
    v2_community_router.router, prefix="/network", tags=["network-v2"]
)
# V2 M05 협력 네트워크 admin 라우터 (M05-01/03/04/06/07/08/09) — /admin/{organizations,mous,programs,community}.
api_router.include_router(
    v2_network_admin_router.router, prefix="/admin", tags=["network-admin-v2"]
)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(oauth.router, prefix="/auth", tags=["oauth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(issues.router, prefix="/issues", tags=["issues"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(
    project_membership.router, prefix="/projects", tags=["project-membership"]
)
api_router.include_router(volunteers.router, prefix="/volunteers", tags=["volunteers"])
api_router.include_router(
    success_cases.router, prefix="/success-cases", tags=["success-cases"]
)
api_router.include_router(cms.router, prefix="/cms", tags=["cms"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
api_router.include_router(admin_kpi.router, prefix="/admin/kpi", tags=["admin-kpi"])
api_router.include_router(
    admin_upload.router, prefix="/admin/upload", tags=["admin-upload"]
)
