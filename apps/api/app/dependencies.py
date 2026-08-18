"""
APTLY API — FastAPI Dependency Injection

Provides reusable FastAPI dependencies for:
- Application settings
- Database sessions
- AI/ML providers (LLM, TTS, Transcription)
- Storage provider

All providers are selected based on configuration at startup.
In Phase 0, all AI providers default to mock implementations.

Usage in a route handler:
    @router.get("/example")
    async def example(
        settings: Annotated[Settings, Depends(get_settings)],
        db: Annotated[AsyncSession, Depends(get_db)],
        llm: Annotated[LLMProvider, Depends(get_llm_provider)],
    ):
        ...
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.security import AuthenticatedUser, decode_supabase_token
from app.services.providers.base import LLMProvider, TranscriptionProvider, TTSProvider
from app.services.providers.mock_llm import MockLLMProvider
from app.services.providers.mock_transcription import MockTranscriptionProvider
from app.services.providers.mock_tts import MockTTSProvider
from app.services.storage.base import StorageProvider
from app.services.storage.local import LocalStorageProvider

logger = get_logger(__name__)


# ── Database ──────────────────────────────────────────────────────────────────


@lru_cache
def get_async_engine(database_url: str) -> AsyncEngine:
    """Create and cache the async SQLAlchemy engine."""
    connect_args = {}
    if "asyncpg" in database_url:
        connect_args["timeout"] = 3.0
        connect_args["command_timeout"] = 5.0

    return create_async_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=connect_args,
    )


@lru_cache
def get_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    """Create and cache the async session factory."""
    engine = get_async_engine(database_url)
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


async def get_db(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: yields a database session per request.

    The session is automatically committed on success
    and rolled back on exception.
    """
    database_url = settings.required_database_url()
    session_factory = get_session_factory(database_url)
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Storage Provider ──────────────────────────────────────────────────────────


@lru_cache
def _get_storage_provider_instance(
    provider: str,
    endpoint: str,
    supabase_url: str = "",
    supabase_service_role_key: str = "",
    bucket_name: str = "aptly-media",
) -> StorageProvider:
    """Create and cache the storage provider (singleton per configuration)."""
    if provider == "local":
        logger.info("storage_provider_init", provider="local", endpoint=endpoint)
        return LocalStorageProvider(root_dir=endpoint)
    if provider == "supabase":
        if not supabase_url or not supabase_service_role_key:
            raise RuntimeError(
                "Supabase Storage is configured but SUPABASE_URL or "
                "SUPABASE_SERVICE_ROLE_KEY is missing. Refusing to fall back "
                "to local storage."
            )
        from app.services.storage.supabase import SupabaseStorageProvider

        logger.info("storage_provider_init", provider="supabase", bucket=bucket_name)
        return SupabaseStorageProvider(
            supabase_url=supabase_url,
            service_role_key=supabase_service_role_key,
            bucket_name=bucket_name,
        )
    # Future providers: s3, r2
    msg = f"Storage provider '{provider}' is not yet implemented"
    raise NotImplementedError(msg)


async def get_storage(
    settings: Annotated[Settings, Depends(get_settings)],
) -> StorageProvider:
    """FastAPI dependency: returns the configured storage provider."""
    return _get_storage_provider_instance(
        settings.storage_provider,
        settings.storage_endpoint,
        settings.supabase_url,
        settings.supabase_service_role_key,
        settings.storage_bucket,
    )


# ── LLM Provider (Google Gemini / Ollama Qwen / Mock) ───────────────────────


@lru_cache
def _get_llm_provider_instance(
    provider: str,
    api_key: str = "",
    model: str = "gemini-2.5-flash",
    ollama_base_url: str = "http://localhost:11434",
    ollama_model: str = "hf.co/mradermacher/interview-assistant-model-GGUF:Q4_K_M",
) -> LLMProvider:
    """Create and cache the LLM provider (singleton)."""
    if provider == "mock":
        logger.info("llm_provider_init", provider="mock")
        return MockLLMProvider()
    if provider in ("qwen", "ollama"):
        from app.services.providers.gemini_llm import GeminiLLMProvider
        from app.services.providers.ollama_llm import OllamaLLMProvider

        logger.info("llm_provider_init", provider="ollama", model=ollama_model)
        fallback = (
            GeminiLLMProvider(api_key=api_key, model=model)
            if api_key
            else MockLLMProvider()
        )
        return OllamaLLMProvider(
            base_url=ollama_base_url,
            model=ollama_model,
            fallback_provider=fallback,
        )
    if provider in ("gemini", "google"):
        from app.services.providers.gemini_llm import GeminiLLMProvider

        logger.info("llm_provider_init", provider="gemini", model=model)
        return GeminiLLMProvider(
            api_key=api_key,
            model=model or "gemini-2.5-flash",
        )
    msg = f"LLM provider '{provider}' is not supported. Use 'gemini', 'ollama', or 'mock'."
    raise NotImplementedError(msg)


async def get_llm_provider(
    settings: Annotated[Settings, Depends(get_settings)],
) -> LLMProvider:
    """FastAPI dependency: returns the configured LLM provider."""
    key = settings.gemini_api_key or settings.llm_api_key
    target_provider = settings.interview_llm_provider or settings.llm_provider
    return _get_llm_provider_instance(
        target_provider,
        key,
        settings.llm_model,
        settings.ollama_base_url,
        settings.ollama_model,
    )


async def get_content_analysis_service(
    llm_provider: Annotated[LLMProvider, Depends(get_llm_provider)],
) -> Any:
    """FastAPI dependency: returns the ContentAnalysisService instance."""
    from app.services.content_intelligence.service import ContentAnalysisService

    return ContentAnalysisService(llm_provider=llm_provider)


# ── TTS Provider (ElevenLabs / Mock) ─────────────────────────────────────────


@lru_cache
def _get_tts_provider_instance(
    provider: str,
    api_key: str = "",
    model_id: str = "eleven_flash_v2_5",
    hr_voice_id: str = "21m00Tcm4TlvDq8ikWAM",
    tech_lead_voice_id: str = "ErXwobaYiN019PkySvjV",
    gemini_model: str = "gemini-3.1-flash-tts-preview",
    gemini_voice: str = "Kore",
    timeout_seconds: float = 30.0,
) -> TTSProvider:
    """Create and cache the TTS provider (singleton)."""
    if provider == "mock":
        logger.info("tts_provider_init", provider="mock")
        return MockTTSProvider()
    if provider == "elevenlabs":
        from app.services.providers.elevenlabs_tts import ElevenLabsTTSProvider

        logger.info("tts_provider_init", provider="elevenlabs", model_id=model_id)
        return ElevenLabsTTSProvider(
            api_key=api_key,
            model_id=model_id,
            hr_voice_id=hr_voice_id,
            tech_lead_voice_id=tech_lead_voice_id,
        )
    if provider == "gemini":
        if not api_key:
            logger.warning("tts_provider_fallback", provider="gemini", reason="missing_api_key")
            return MockTTSProvider()
        from app.services.providers.gemini_tts import GeminiTTSProvider

        logger.info("tts_provider_init", provider="gemini", model=gemini_model, voice=gemini_voice)
        return GeminiTTSProvider(
            api_key=api_key,
            model=gemini_model,
            voice=gemini_voice,
            timeout_seconds=timeout_seconds,
        )
    msg = f"TTS provider '{provider}' is not supported. Use 'elevenlabs' or 'mock'."
    raise NotImplementedError(msg)


async def get_tts_provider(
    settings: Annotated[Settings, Depends(get_settings)],
) -> TTSProvider:
    """FastAPI dependency: returns the configured TTS provider."""
    api_key = (
        settings.gemini_api_key
        if settings.tts_provider == "gemini"
        else settings.elevenlabs_api_key or settings.tts_api_key
    )
    provider = settings.tts_provider
    if api_key and provider == "mock":
        provider = "elevenlabs"
    return _get_tts_provider_instance(
        provider,
        api_key,
        settings.elevenlabs_model_id,
        settings.elevenlabs_hr_voice_id,
        settings.elevenlabs_tech_lead_voice_id,
        settings.tts_model,
        settings.tts_voice,
        settings.tts_timeout_seconds,
    )


# ── Transcription Provider ────────────────────────────────────────────────────


@lru_cache
def _get_transcription_provider_instance(
    provider: str,
    model_size: str = "base.en",
    device: str = "auto",
    compute_type: str = "auto",
) -> TranscriptionProvider:
    """Create and cache the transcription provider (singleton)."""
    if provider == "mock":
        logger.info("transcription_provider_init", provider="mock")
        return MockTranscriptionProvider()
    if provider in ("whisperx", "whisper"):
        from app.services.providers.whisperx_transcription import (
            WhisperXTranscriptionProvider,
        )

        logger.info(
            "transcription_provider_init",
            provider="whisperx",
            model=model_size,
            device=device,
        )
        return WhisperXTranscriptionProvider(
            model_size=model_size,
            device=device,
            compute_type=compute_type,
        )
    # Phase 2+: deepgram, etc.
    msg = f"Transcription provider '{provider}' is not yet implemented"
    raise NotImplementedError(msg)


async def get_transcription_provider(
    settings: Annotated[Settings, Depends(get_settings)],
) -> TranscriptionProvider:
    """FastAPI dependency: returns the configured transcription provider."""
    return _get_transcription_provider_instance(
        settings.transcription_provider,
        settings.whisperx_model,
        settings.whisperx_device,
        settings.whisperx_compute_type,
    )


# ── Supabase Authentication ───────────────────────────────────────────────────

security_bearer = HTTPBearer(auto_error=False)


async def get_optional_current_user(
    settings: Annotated[Settings, Depends(get_settings)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_bearer)] = None,
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-ID")] = None,
    x_candidate_id: Annotated[str | None, Header(alias="X-Candidate-ID")] = None,
) -> AuthenticatedUser | None:
    """
    FastAPI dependency: returns the authenticated user if Bearer token or client session
    header (X-User-ID / X-Candidate-ID) is provided, ensuring session isolation.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    if token:
        # Never downgrade an invalid bearer token to a guest identity.
        return decode_supabase_token(
            token,
            secret=settings.supabase_jwt_secret,
            issuer=settings.supabase_jwt_issuer,
            audience=settings.supabase_jwt_audience,
        )

    # Fallback to client session header for isolated practice sessions
    client_id = x_user_id or x_candidate_id
    if settings.allow_guest_sessions and client_id and len(client_id.strip()) > 3:
        import re

        normalized_client_id = client_id.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{3,119}", normalized_client_id):
            return None
        return AuthenticatedUser(
            id=normalized_client_id,
            email=None,
            role="guest",
            metadata={},
        )

    return None


async def get_current_user(
    user: Annotated[AuthenticatedUser | None, Depends(get_optional_current_user)],
) -> AuthenticatedUser:
    """
    FastAPI dependency: requires valid authentication. Raises HTTP 401 if missing/invalid.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Authentication required. Please sign in to access your interview data.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

