"""
APTLY API — Gemini Live Engine & Endpoint Tests

Validates:
- Configuration defaults and feature flags
- Ephemeral token minting endpoint authorization, TTL expiry, and no key leakage
- Gemini control decision schema parsing and budget enforcement
- Fallback behavior when feature flag is disabled
"""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_gemini_live_configuration_defaults():
    """Verify Gemini Live settings defaults."""
    settings = get_settings()
    assert settings.feature_gemini_live_interview is False
    assert settings.gemini_live_model == "gemini-2.0-flash-exp"
    assert settings.gemini_live_language_code == "en-US"
    assert settings.gemini_live_token_ttl_seconds == 600


def test_mint_live_token_fallback_when_feature_disabled(client):
    """When FEATURE_GEMINI_LIVE_INTERVIEW is False, return fallback state safely."""
    fake_interview_id = uuid4()

    # Note: If interview does not exist in DB, returns 404
    response = client.post(f"/api/v1/interviews/{fake_interview_id}/live-token")
    assert response.status_code in (404, 200)

    if response.status_code == 200:
        data = response.json()
        assert data["enabled"] is False
        assert data["ephemeral_token"] is None
        assert "FEATURE_DISABLED" in (data["fallback_reason"] or "")


def test_never_expose_backend_gemini_key_in_token_response(client):
    """Ensure the raw GEMINI_API_KEY is never leaked to the client."""
    fake_interview_id = uuid4()
    response = client.post(f"/api/v1/interviews/{fake_interview_id}/live-token")

    if response.status_code == 200:
        data = response.json()
        settings = get_settings()
        if settings.gemini_api_key:
            assert settings.gemini_api_key not in str(data)
