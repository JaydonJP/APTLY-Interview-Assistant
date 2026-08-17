"""
APTLY API — API v1 Router

Aggregates all v1 endpoint routers under /api/v1.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import interviews, jobs, live_token, realtime, repair, storage, twin

router = APIRouter()

# Register sub-routers
router.include_router(jobs.router)
router.include_router(interviews.router)
router.include_router(live_token.router)
router.include_router(repair.router)
router.include_router(twin.router)
router.include_router(realtime.router)
router.include_router(storage.router)
