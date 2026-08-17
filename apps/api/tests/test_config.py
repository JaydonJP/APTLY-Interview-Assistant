"""
APTLY API — Configuration Tests
"""

from __future__ import annotations

import pytest

from app.config import Settings


@pytest.mark.unit
def test_settings_loads_with_defaults() -> None:
    """Settings loads without any env file and uses safe defaults."""
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        database_url="postgresql+asyncpg://user:pass@localhost/db",
        secret_key="test-secret",
    )
    assert settings.app_name == "APTLY"
    assert settings.app_env == "development"
    assert settings.api_v1_prefix == "/api/v1"


@pytest.mark.unit
def test_settings_mock_providers_default() -> None:
    """All AI providers default to mock in base configuration."""
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        secret_key="test-secret",
    )
    assert settings.llm_provider == "mock"
    assert settings.tts_provider == "mock"
    assert settings.transcription_provider == "mock"


@pytest.mark.unit
def test_settings_using_mock_providers_property() -> None:
    """using_mock_providers returns True when all providers are mock."""
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        secret_key="test-secret",
        llm_provider="mock",
        tts_provider="mock",
        transcription_provider="mock",
    )
    assert settings.using_mock_providers is True


@pytest.mark.unit
def test_settings_not_mock_when_llm_real() -> None:
    """using_mock_providers returns False when any provider is real."""
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        secret_key="test-secret",
        llm_provider="gemini",
        gemini_api_key="fake-gemini-key",
        tts_provider="mock",
        transcription_provider="mock",
    )
    assert settings.using_mock_providers is False


@pytest.mark.unit
def test_settings_cors_origins_parsed_from_string() -> None:
    """CORS origins can be parsed from a comma-separated string."""
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        secret_key="test-secret",
        cors_origins="http://localhost:3000,http://localhost:3001",  # type: ignore[arg-type]
    )
    assert "http://localhost:3000" in settings.cors_origins
    assert "http://localhost:3001" in settings.cors_origins


@pytest.mark.unit
def test_settings_is_production_false_by_default() -> None:
    """is_production is False in development mode."""
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        secret_key="test-secret",
        app_env="development",
    )
    assert settings.is_production is False
    assert settings.is_development is True


@pytest.mark.unit
def test_settings_is_production_true() -> None:
    """is_production is True in production mode."""
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        secret_key="secure-prod-key",
        app_env="production",
    )
    assert settings.is_production is True
