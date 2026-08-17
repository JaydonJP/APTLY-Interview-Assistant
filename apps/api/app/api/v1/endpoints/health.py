"""
APTLY API — Health Check Endpoints

Provides two health endpoints:
    GET /health        — simple liveness probe (no auth required)
    GET /api/v1/health — detailed health with service status

These endpoints:
- Are always public (no auth)
- Do NOT log sensitive info
- Return standardized HealthResponse schema
- Can be used by load balancers and Docker healthchecks
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.dependencies import get_db
from app.schemas.common import HealthResponse, ServiceStatus

logger = get_logger(__name__)

router = APIRouter(tags=["Health"])


async def _check_database(db: AsyncSession) -> ServiceStatus:
    """Ping the database and return its status."""
    import time

    start = time.monotonic()
    try:
        await db.execute(text("SELECT 1"))
        latency_ms = (time.monotonic() - start) * 1000
        return ServiceStatus(
            name="postgresql",
            status="ok",
            latency_ms=round(latency_ms, 2),
        )
    except Exception as exc:
        return ServiceStatus(
            name="postgresql",
            status="unavailable",
            message=str(exc)[:100],  # Truncate — don't leak full error
        )


def _build_health_response(
    settings: Settings,
    services: list[ServiceStatus],
) -> HealthResponse:
    """Build the health response from settings and service statuses."""
    overall_status = (
        "ok"
        if all(s.status == "ok" for s in services)
        else "degraded"
        if any(s.status == "ok" for s in services)
        else "unavailable"
    )
    return HealthResponse(
        status=overall_status,
        app_name=settings.app_name,
        app_version=settings.app_version,
        environment=settings.app_env,
        timestamp=datetime.now(UTC),
        services=services,
        using_mock_providers=settings.using_mock_providers,
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application liveness probe",
    description="Simple health check. No auth required. Used by load balancers.",
)
async def root_health(
    settings: Annotated[Settings, Depends(get_settings)],
) -> HealthResponse:
    """
    Minimal liveness probe — returns immediately without checking dependencies.
    Always returns 200 if the process is running.
    """
    return _build_health_response(settings=settings, services=[])


@router.get(
    "/api/v1/health",
    response_model=HealthResponse,
    summary="Detailed service health",
    description="Checks all downstream dependencies. Includes DB and provider status.",
)
async def v1_health(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HealthResponse:
    """
    Detailed health check — pings all downstream services.
    Returns degraded status if any service is unavailable.
    """
    services: list[ServiceStatus] = []

    # Check database
    db_status = await _check_database(db)
    services.append(db_status)

    # Add provider statuses (Phase 0: always ok for mocks)
    services.append(
        ServiceStatus(
            name=f"llm_provider ({settings.llm_provider})",
            status="ok",
            message="mock" if settings.llm_provider == "mock" else "configured",
        )
    )
    services.append(
        ServiceStatus(
            name=f"tts_provider ({settings.tts_provider})",
            status="ok",
            message="mock" if settings.tts_provider == "mock" else "configured",
        )
    )
    services.append(
        ServiceStatus(
            name=f"transcription_provider ({settings.transcription_provider})",
            status="ok",
            message=(
                "mock" if settings.transcription_provider == "mock" else "configured"
            ),
        )
    )
    services.append(
        ServiceStatus(
            name=f"storage ({settings.storage_provider})",
            status="ok",
        )
    )

    response = _build_health_response(settings=settings, services=services)
    logger.info(
        "health_check",
        status=response.status,
        using_mock_providers=response.using_mock_providers,
    )
    return response
