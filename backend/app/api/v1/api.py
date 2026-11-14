from fastapi import APIRouter

from app.api.v1.endpoints import (
    health,
    auth,
    ideas,
    tasks,
    projects,
    finances,
    chats,
    support,
    ai,
    admin,
    notifications,
    realtime,
    certificates,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(ideas.router, prefix="/ideas", tags=["ideas"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(finances.router, prefix="/finances", tags=["finances"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
api_router.include_router(support.router, prefix="/support", tags=["support"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["certificates"])
api_router.include_router(certificates.router, tags=["certificates_public"])
api_router.include_router(realtime.router, tags=["realtime"])
