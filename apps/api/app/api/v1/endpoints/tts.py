"""
APTLY API — Realtime Voice & Text-to-Speech Endpoints

Provides low-latency speech synthesis and streaming audio using ElevenLabsTTSProvider.
Maintains persona voice mapping (Friendly HR vs Skeptical Tech Lead).
Guarantees API keys are kept strictly on the backend.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.dependencies import get_tts_provider
from app.services.providers.base import TTSProvider, TTSSynthesisRequest

logger = get_logger(__name__)

router = APIRouter(prefix="/tts", tags=["Voice & TTS"])


class TTSSynthesizePayload(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Natural question text to speak")
    persona: str | None = Field(default="friendly_hr", description="Interviewer persona (friendly_hr or skeptical_tech_lead)")
    voice_id: str | None = Field(default=None, description="Optional explicit voice ID override")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


@router.post(
    "/synthesize",
    summary="Synthesize interviewer question audio with ElevenLabs",
    description="Returns audio/mpeg bytes for playback in the browser.",
)
async def synthesize_voice(
    payload: TTSSynthesizePayload,
    tts: Annotated[TTSProvider, Depends(get_tts_provider)],
) -> Response:
    """Synthesize natural interviewer question text to voice."""
    req = TTSSynthesisRequest(
        text=payload.text,
        voice_id=payload.voice_id or "default",
        speed=payload.speed,
        metadata={"persona": payload.persona},
    )

    result = await tts.synthesize(req)
    return Response(
        content=result.audio_bytes,
        media_type=result.content_type or "audio/mpeg",
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-TTS-Provider": result.provider,
            "X-TTS-Duration": str(result.duration_seconds),
        },
    )


@router.get(
    "/stream",
    summary="Stream interviewer question audio with ElevenLabs",
    description="Streams audio chunks with low latency for realtime playback.",
)
async def stream_voice(
    text: Annotated[str, Query(min_length=1, max_length=2000)],
    persona: Annotated[str | None, Query()] = "friendly_hr",
    voice_id: Annotated[str | None, Query()] = None,
    tts: Annotated[TTSProvider, Depends(get_tts_provider)] = None,  # type: ignore
) -> StreamingResponse:
    """Stream audio chunks directly to the browser for low-latency playback."""
    req = TTSSynthesisRequest(
        text=text,
        voice_id=voice_id or "default",
        metadata={"persona": persona},
    )

    async def audio_generator():
        async for chunk in tts.stream(req):
            yield chunk

    return StreamingResponse(
        audio_generator(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "Transfer-Encoding": "chunked",
        },
    )
