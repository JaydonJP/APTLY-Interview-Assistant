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

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models
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

    # Verify the Supabase PostgreSQL connection before accepting requests.
    # PostgreSQL may take a few seconds to become ready, so retry the
    # connection while preserving the real failure instead of substituting a
    # local database.
    from sqlalchemy import text

    from app.dependencies import get_async_engine

    async def _check_database(database_url: str) -> None:
        engine = get_async_engine(database_url)
        attempts = 5
        last_error: Exception | None = None

        for attempt in range(1, attempts + 1):
            try:
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
                return
            except Exception as exc:
                last_error = exc
                await engine.dispose()
                if attempt == attempts:
                    raise
                delay_seconds = min(2 * attempt, 8)
                logger.warning(
                    "database_init_retry",
                    attempt=attempt,
                    next_attempt_in_seconds=delay_seconds,
                    error=str(exc)[:200],
                )
                await asyncio.sleep(delay_seconds)

        if last_error:
            raise last_error

    database_url = ""
    database_driver = "unconfigured"
    try:
        database_url = settings.required_database_url()
        database_driver = database_url.split(":", 1)[0]
        await asyncio.wait_for(_check_database(database_url), timeout=45.0)
        logger.info(
            "database_connection_ready",
            database_driver=database_driver,
        )
    except Exception as exc:
        logger.error(
            "database_init_failed",
            database_driver=database_driver,
            error=str(exc)[:300],
        )
        raise RuntimeError(
            "Supabase PostgreSQL is unavailable. Set DATABASE_URL to a reachable "
            "Supabase PostgreSQL connection string before starting APTLY."
        ) from exc

    # Storage is intentionally remote-only in the runtime configuration. A
    # private bucket is checked/created before the API accepts recordings.
    if settings.storage_provider == "supabase":
        from app.dependencies import _get_storage_provider_instance

        storage = _get_storage_provider_instance(
            settings.storage_provider,
            settings.storage_endpoint,
            settings.supabase_url,
            settings.supabase_service_role_key,
            settings.storage_bucket,
        )
        if hasattr(storage, "ensure_private_bucket"):
            await storage.ensure_private_bucket()  # type: ignore[attr-defined]

    yield  # Application is running

    logger.info("aptly_shutdown", app_name=settings.app_name)


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI app."""

    app = FastAPI(
        title=settings.app_name,
        description=(
            "Evidence-Grounded Multimodal AI Interview Coach — REST API\n\n"
            "Role-aware interviews, deterministic speech metrics, adaptive follow-ups, "
            "and evidence-linked coaching reports.\n"
            "See docs/api/contracts.md for API contracts."
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
