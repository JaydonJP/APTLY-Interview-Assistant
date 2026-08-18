"""
APTLY API — Gemini Live Ephemeral Token Endpoint

Generates short-lived, safe client tokens for direct WebSocket streaming to Google Gemini Live API.
Ensures GEMINI_API_KEY is never exposed to the client browser.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.endpoints.interviews import (
    _ensure_interview_access,
    _get_interview_service,
)
from app.config import get_settings
from app.core.logging import get_logger
from app.core.security import AuthenticatedUser, RateLimiter
from app.dependencies import get_optional_current_user
from app.services.interview_service import InterviewService

logger = get_logger(__name__)

router = APIRouter(prefix="/interviews", tags=["Gemini Live Token"])
live_token_limiter = RateLimiter()


class GeminiLiveTokenResponse(BaseModel):
    enabled: bool
    ephemeral_token: str | None
    expires_at: str | None
    model: str
    language_code: str
    voice_name: str
    websocket_url: str | None
    fallback_reason: str | None = None


async def _provision_gemini_token(
    *,
    api_key: str,
    model: str,
    ttl_seconds: int,
) -> tuple[str, datetime]:
    """Ask Google's AuthTokenService for a constrained Live token."""
    from google import genai

    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=max(60, min(ttl_seconds, 1_800)))
    new_session_expires_at = now + timedelta(seconds=60)
    model_name = model if model.startswith("models/") else f"models/{model}"
    client = genai.Client(api_key=api_key)
    token = await asyncio.wait_for(
        asyncio.to_thread(
            client.auth_tokens.create,
            config={
                "uses": 1,
                "expire_time": expires_at,
                "new_session_expire_time": new_session_expires_at,
                "live_connect_constraints": {
                    "model": model_name,
                    "config": {
                        "response_modalities": ["AUDIO"],
                        "input_audio_transcription": {},
                        "output_audio_transcription": {},
                    },
                },
            },
        ),
        timeout=15.0,
    )
    token_name = str(getattr(token, "name", "") or "")
    if not token_name:
        raise RuntimeError("Google did not return an ephemeral token name")
    return token_name, expires_at


@router.post(
    "/{interview_id}/live-token",
    response_model=GeminiLiveTokenResponse,
    summary="Mint short-lived ephemeral token for Gemini Live session",
)
async def mint_gemini_live_token(
    interview_id: UUID,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> GeminiLiveTokenResponse:
    """
    Returns a short-lived token and public config for browser Gemini Live WebSocket streaming.
    Guarantees backend GEMINI_API_KEY is never leaked to the client.
    If Live feature is disabled or API key missing, returns fallback state safely.
    """
    settings = get_settings()

    # The disabled path is intentionally independent of storage. This keeps a
    # fresh local install safe and responsive before a database is configured.
    if not settings.feature_gemini_live_interview:
        return GeminiLiveTokenResponse(
            enabled=False,
            ephemeral_token=None,
            expires_at=None,
            model=settings.gemini_live_model,
            language_code=settings.gemini_live_language_code,
            voice_name="Puck",
            websocket_url=None,
            fallback_reason="FEATURE_DISABLED: FEATURE_GEMINI_LIVE_INTERVIEW is set to false.",
        )

    # Validate session
    interview = await service.get_interview_detail(interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INTERVIEW_NOT_FOUND", "message": f"Interview '{interview_id}' not found."},
        )

    # Security check
    _ensure_interview_access(interview, user)

    limiter_key = f"live-token:{user.id if user else 'anonymous'}"
    if not await live_token_limiter.check(limiter_key, limit=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMITED",
                "message": "Too many Live session token requests. Please wait before retrying.",
            },
        )

    api_key = settings.gemini_api_key or settings.llm_api_key
    if not api_key:
        return GeminiLiveTokenResponse(
            enabled=False,
            ephemeral_token=None,
            expires_at=None,
            model=settings.gemini_live_model,
            language_code=settings.gemini_live_language_code,
            voice_name="Puck",
            websocket_url=None,
            fallback_reason="NO_GEMINI_KEY: GEMINI_API_KEY is not configured on server.",
        )

    try:
        ephemeral_token, expires_at = await _provision_gemini_token(
            api_key=api_key,
            model=settings.gemini_live_model,
            ttl_seconds=settings.gemini_live_token_ttl_seconds,
        )
    except Exception as exc:
        logger.warning(
            "gemini_live_token_provisioning_failed",
            interview_id=str(interview_id),
            error=str(exc)[:200],
        )
        return GeminiLiveTokenResponse(
            enabled=False,
            ephemeral_token=None,
            expires_at=None,
            model=settings.gemini_live_model,
            language_code=settings.gemini_live_language_code,
            voice_name="Puck",
            websocket_url=None,
            fallback_reason="TOKEN_PROVISIONING_FAILED: Gemini Live could not be initialized.",
        )

    # The browser adds the short-lived token as access_token. Never put the
    # long-lived server key in a URL or response.
    ws_url = (
        "wss://generativelanguage.googleapis.com/ws/"
        "google.ai.generativelanguage.v1beta.GenerativeService."
        "BidiGenerateContentConstrained"
    )

    logger.info(
        "gemini_live_token_minted",
        interview_id=str(interview_id),
        ttl_seconds=settings.gemini_live_token_ttl_seconds,
        model=settings.gemini_live_model,
    )

    return GeminiLiveTokenResponse(
        enabled=True,
        ephemeral_token=ephemeral_token,
        expires_at=expires_at.isoformat(),
        model=settings.gemini_live_model,
        language_code=settings.gemini_live_language_code,
        voice_name="Puck",
        websocket_url=ws_url,
        fallback_reason=None,
    )
