"""
APTLY API — API v1 Router

Aggregates all v1 endpoint routers under /api/v1.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import interviews, jobs, realtime

router = APIRouter()

# Register sub-routers
router.include_router(jobs.router)
router.include_router(interviews.router)
router.include_router(realtime.router)
