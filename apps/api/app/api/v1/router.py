"""
APTLY API — API v1 Router

Aggregates all v1 endpoint routers under /api/v1.

To add a new endpoint group in a future phase:
    1. Create apps/api/app/api/v1/endpoints/your_feature.py
    2. Import its router here
    3. Add router.include_router(your_feature.router, prefix="/your-prefix")
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import interviews

router = APIRouter()

# Health — no prefix (health check at /api/v1/health is registered in main.py directly)
# The /health root-level endpoint is also registered in main.py

# Interview routes
router.include_router(
    interviews.router,
    prefix="",  # Routes are /api/v1/interviews/...
)
