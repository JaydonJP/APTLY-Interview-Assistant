"""
APTLY API — Application Configuration

All settings are loaded from environment variables.
In Phase 0, mock providers allow the app to start without any AI credentials.

Usage:
    from app.config import get_settings
    settings = get_settings()
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Typed application configuration loaded from environment variables.

    AI providers may use safe mock defaults for local development, but the
    application database is always a Supabase PostgreSQL service.
    Never put real secrets here — use .env or secrets management.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars
    )

    # ── Application ────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    app_name: str = "APTLY"
    app_version: str = "0.1.0"

    # ── API ────────────────────────────────────────────────────
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://[::1]:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    )

    # ── Security ───────────────────────────────────────────────
    secret_key: str = Field(
        default="dev-insecure-secret-key-change-in-production",
        description="Must be overridden in production via SECRET_KEY env var",
    )

    # ── Database ───────────────────────────────────────────────
    database_url: str = Field(
        default="",
        description="Supabase PostgreSQL async database URL",
    )

    # ── Redis ──────────────────────────────────────────────────
    redis_url: str = Field(default="redis://localhost:6379/0")

    # ── Storage ────────────────────────────────────────────────
    storage_provider: Literal["local", "s3", "supabase", "r2"] = "supabase"
    storage_bucket: str = "aptly-media"
    storage_endpoint: str = "./storage"
    storage_access_key: str = ""
    storage_secret_key: str = ""

    # ── Supabase ──────────────────────────────────────────────
    supabase_url: str = Field(
        default="",
        description="Supabase project URL e.g. https://[project-ref].supabase.co",
    )
    supabase_rest_url: str = Field(
        default="",
        description="Supabase REST API URL e.g. https://[project-ref].supabase.co/rest/v1/",
    )
    supabase_service_role_key: str = Field(
        default="",
        description="Supabase service role secret (kept server-side only)",
    )
    supabase_anon_key: str = Field(
        default="",
        description="Supabase anonymous key for public client operations",
    )
    supabase_jwt_secret: str = Field(
        default="",
        description="Supabase JWT signing secret; required to accept bearer tokens",
    )
    supabase_jwt_issuer: str = Field(
        default="",
        description="Optional Supabase JWT issuer URL",
    )
    supabase_jwt_audience: str = Field(default="authenticated")
    allow_guest_sessions: bool = Field(
        default=True,
        description="Allow explicitly identified browser practice sessions without Supabase auth",
    )

    # ── LLM Providers (Gemini / Ollama Qwen / Mock) ───────────
    llm_provider: Literal["mock", "gemini", "qwen", "ollama"] = "mock"
    interview_llm_provider: Literal["mock", "gemini", "qwen", "ollama"] = "mock"
    report_llm_provider: Literal["mock", "gemini"] = "mock"
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    llm_api_key: str = ""
    llm_model: str = "gemini-2.5-flash"
    llm_timeout_seconds: float = 30.0
    llm_temperature: float = 0.1

    # ── Ollama Local Qwen GGUF Model ──────────────────────────
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama API base URL")
    ollama_model: str = Field(
        default="hf.co/mradermacher/interview-assistant-model-GGUF:Q4_K_M",
        description="Local GGUF interview model identifier in Ollama",
    )

    # ── TTS Provider (ElevenLabs Streaming Voice Engine) ──────
    tts_provider: Literal["mock", "elevenlabs", "gemini"] = "mock"
    tts_api_key: str = ""
    tts_model: str = "gemini-3.1-flash-tts-preview"
    tts_voice: str = "Kore"
    tts_timeout_seconds: float = 30.0
    elevenlabs_api_key: str = Field(default="", description="ElevenLabs API key (server-side only)")
    elevenlabs_model_id: str = Field(default="eleven_flash_v2_5", description="ElevenLabs low-latency voice model")
    elevenlabs_hr_voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM", description="Voice ID for Sarah Chen (HR Lead)")
    elevenlabs_tech_lead_voice_id: str = Field(default="ErXwobaYiN019PkySvjV", description="Voice ID for Alex Rivera (Tech Lead)")

    # ── Transcription Provider ────────────────────────────────
    transcription_provider: Literal["mock", "whisper", "whisperx", "deepgram"] = "mock"
    transcription_api_key: str = ""
    whisperx_model: str = "base.en"
    whisperx_device: str = "auto"
    whisperx_compute_type: str = "auto"
    whisperx_language: str = "en"

    # ── Gemini Live Realtime Engine ───────────────────────────
    feature_gemini_live_interview: bool = Field(
        default=False,
        description="Enable real-time Gemini Live WebSocket interview mode",
    )
    gemini_live_model: str = Field(
        default="gemini-2.0-flash-exp",
        description="Google Gemini Live model identifier",
    )
    gemini_live_language_code: str = Field(
        default="en-US",
        description="Default spoken language code for Gemini Live session",
    )
    gemini_live_token_ttl_seconds: int = Field(
        default=600,
        description="TTL for server-minted short-lived ephemeral client tokens",
    )

    # ── Feature Flags ─────────────────────────────────────────
    feature_realtime_interview: bool = False
    feature_audio_analysis: bool = False
    feature_vision_analysis: bool = False
    feature_llm_evaluation: bool = False

    # ── Computed Properties ───────────────────────────────────
    @property
    def is_production(self) -> bool:
        """True when running in production environment."""
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        """True when running in development environment."""
        return self.app_env == "development"

    @property
    def using_mock_providers(self) -> bool:
        """True when all AI providers are in mock mode (no API keys needed)."""
        return (
            self.llm_provider == "mock"
            and self.tts_provider == "mock"
            and self.transcription_provider == "mock"
        )

    def required_database_url(self) -> str:
        """Return the configured Supabase URL or fail with an actionable error.

        SQLite and local PostgreSQL are intentionally not valid runtime
        databases. Tests can still inject their own database dependency, but
        every real API process must use the hosted Supabase PostgreSQL service.
        """
        database_url = self.database_url.strip()
        if not database_url:
            raise RuntimeError(
                "DATABASE_URL is required. Set it to the Supabase PostgreSQL "
                "connection string before starting APTLY."
            )

        if not database_url.startswith("postgresql+asyncpg://"):
            raise RuntimeError(
                "DATABASE_URL must be a Supabase PostgreSQL URL using the "
                "postgresql+asyncpg:// scheme."
            )

        hostname = urlsplit(database_url).hostname
        if not hostname or hostname in {"localhost", "127.0.0.1", "::1"}:
            raise RuntimeError(
                "Local databases are disabled for the APTLY runtime. Set "
                "DATABASE_URL to the Supabase direct or Transaction Pooler URL."
            )

        if not (hostname.endswith(".supabase.co") or hostname.endswith(".supabase.com")):
            raise RuntimeError(
                "DATABASE_URL must point to Supabase PostgreSQL. Use the direct "
                "or Transaction Pooler connection string from Supabase."
            )

        return database_url

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Normalize database URL for asyncpg if raw postgres:// or postgresql:// is provided."""
        if isinstance(v, str):
            if not v.strip():
                return ""
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("secret_key")
    @classmethod
    def warn_insecure_secret(cls, v: str) -> str:
        """Warn if using the default insecure secret key."""
        if v == "dev-insecure-secret-key-change-in-production":
            import warnings

            warnings.warn(
                "Using default insecure SECRET_KEY. "
                "Set SECRET_KEY environment variable before deploying.",
                stacklevel=2,
            )
        return v


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.

    Uses lru_cache so the settings object is only created once per process.
    In tests, call get_settings.cache_clear() to reset between test cases.
    """
    return Settings()
