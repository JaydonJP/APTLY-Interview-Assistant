"""
APTLY API — FastAPI Application Entry Point

Configures and assembles the FastAPI application.

Architecture:
- CORS is applied globally for the configured origins
- Request ID middleware runs on every request
- Exception handlers produce standard error envelopes
- Health endpoints are registered at both / and /api/v1/
- V1 business routes are under /api/v1/
- Lifespan handles startup/shutdown (DB pool, provider init)

Phase 0 startup:
1. Configure logging (structured JSON in prod, pretty in dev)
2. Validate settings (warns on insecure defaults)
3. Open DB connection pool
4. Register all routes
5. Log startup summary

To start locally:
    cd apps/api
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.router import router as v1_router
from app.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestIDMiddleware

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown logic."""
    logger = get_logger("aptly.startup")

    # Configure logging first so all subsequent messages are structured
    configure_logging(is_development=settings.is_development)

    logger.info(
        "aptly_startup",
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        using_mock_providers=settings.using_mock_providers,
        storage_provider=settings.storage_provider,
        llm_provider=settings.llm_provider,
        tts_provider=settings.tts_provider,
        transcription_provider=settings.transcription_provider,
    )

    if settings.using_mock_providers:
        logger.warning(
            "mock_providers_active",
            message=(
                "All AI providers are in MOCK mode. "
                "No real LLM/TTS/transcription calls will be made. "
                "Set LLM_PROVIDER, TTS_PROVIDER, TRANSCRIPTION_PROVIDER to enable real providers."
            ),
        )

    # Initialize database tables on startup for local dev
    try:
        import asyncio
        from app.dependencies import get_async_engine
        from app.models.base import Base

        async def _init_db() -> None:
            engine = get_async_engine(settings.database_url)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

        await asyncio.wait_for(_init_db(), timeout=3.0)
        logger.info("database_schema_ready", db_url=settings.database_url)
    except Exception as exc:
        logger.warning(
            "database_init_fallback",
            error=str(exc),
            note="Using local async fallback database for immediate offline readiness.",
        )
        try:
            from app.dependencies import get_async_engine
            from app.models.base import Base
            fallback_engine = get_async_engine("sqlite+aiosqlite:///./aptly.db")
            async with fallback_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("database_schema_ready", db_url="sqlite+aiosqlite:///./aptly.db")
        except Exception as fb_exc:
            logger.warning("database_fallback_failed", error=str(fb_exc))

    yield  # Application is running

    logger.info("aptly_shutdown", app_name=settings.app_name)


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI app."""

    app = FastAPI(
        title=settings.app_name,
        description=(
            "Evidence-Grounded Multimodal AI Interview Coach — REST API\n\n"
            "Phase 0: Foundation scaffold. See /docs for OpenAPI specification.\n"
            "See docs/api/contracts.md for planned endpoint contracts."
        ),
        version=settings.app_version,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters — outermost runs first) ─────────────────────
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # ── Exception Handlers ────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routes ────────────────────────────────────────────────────────────────
    # Root health (liveness probe — no prefix)
    app.include_router(health_router)

    # All v1 business routes
    app.include_router(
        v1_router,
        prefix=settings.api_v1_prefix,
    )

    return app


# Module-level app instance for uvicorn
app = create_app()
