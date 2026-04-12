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

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
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
