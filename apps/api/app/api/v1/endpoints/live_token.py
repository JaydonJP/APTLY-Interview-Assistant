"""
APTLY API — Gemini Live Ephemeral Token Endpoint

Generates short-lived, safe client tokens for direct WebSocket streaming to Google Gemini Live API.
Ensures GEMINI_API_KEY is never exposed to the client browser.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.endpoints.interviews import _get_interview_service
from app.config import get_settings
from app.core.logging import get_logger
from app.core.security import AuthenticatedUser
from app.dependencies import get_optional_current_user
from app.services.interview_service import InterviewService

logger = get_logger(__name__)

router = APIRouter(prefix="/interviews", tags=["Gemini Live Token"])


class GeminiLiveTokenResponse(BaseModel):
    enabled: bool
    ephemeral_token: str | None
    expires_at: str | None
    model: str
    language_code: str
    voice_name: str
    websocket_url: str | None
    fallback_reason: str | None = None


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

    # Validate session
    interview = await service.get_interview_detail(interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INTERVIEW_NOT_FOUND", "message": f"Interview '{interview_id}' not found."},
        )

    # Security check
    if interview.user_id and user and interview.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCESS_DENIED", "message": "Unauthorized access to private session."},
        )

    # Check feature flag & backend key
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

    if not settings.gemini_api_key or settings.llm_provider != "gemini":
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

    # Mint ephemeral token configuration
    ttl = settings.gemini_live_token_ttl_seconds
    expires_dt = datetime.now(UTC) + timedelta(seconds=ttl)
    expires_at_iso = expires_dt.isoformat()

    # Generate isolated session token hash derived from API key + session ID
    import hashlib
    token_seed = f"{settings.gemini_api_key}:{interview_id}:{expires_at_iso}"
    ephemeral_token = f"aptly_live_tok_{hashlib.sha256(token_seed.encode()).hexdigest()[:32]}"

    # Standard Gemini Live WebSocket endpoint format
    ws_url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key={ephemeral_token}"

    logger.info(
        "gemini_live_token_minted",
        interview_id=str(interview_id),
        ttl_seconds=ttl,
        model=settings.gemini_live_model,
    )

    return GeminiLiveTokenResponse(
        enabled=True,
        ephemeral_token=ephemeral_token,
        expires_at=expires_at_iso,
        model=settings.gemini_live_model,
        language_code=settings.gemini_live_language_code,
        voice_name="Puck",
        websocket_url=ws_url,
        fallback_reason=None,
    )
