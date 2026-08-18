"""
APTLY API — ElevenLabs Realtime TTS Provider

Provides ultra-low-latency streaming Text-to-Speech via ElevenLabs API (eleven_flash_v2_5).
Supports distinct interviewer personas:
- Friendly HR (Sarah Chen)
- Skeptical Tech Lead (Alex Rivera)

Ensures zero leak of API keys to frontend.
Filters out JSON/debug tokens before speech synthesis.
Gracefully degrades to MockTTS on missing credentials or upstream network error.
"""

from __future__ import annotations

import re
from collections.abc import AsyncGenerator

import httpx

from app.config import get_settings
from app.core.logging import get_logger
from app.services.providers.base import (
    TTSProvider,
    TTSSynthesisRequest,
    TTSSynthesisResponse,
)
from app.services.providers.mock_tts import MockTTSProvider

logger = get_logger(__name__)


def clean_text_for_speech(text: str) -> str:
    """
    Sanitize question text before sending to ElevenLabs TTS:
    - Removes JSON braces, keys, and values
    - Strips markdown formatting (**, ##, bullets)
    - Strips system/debug prompts
    """
    if not text:
        return ""

    # Remove code blocks and JSON blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r'\{[\s\S]*"question":\s*"([^"]+)"[\s\S]*\}', r"\1", text)
    text = re.sub(r'\{[\s\S]*\}', "", text)

    # Remove markdown headers and formatting
    text = re.sub(r"#+\s*", "", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


class ElevenLabsTTSProvider(TTSProvider):
    """
    Production Text-to-Speech provider powered by ElevenLabs low-latency voice synthesis.
    """

    PROVIDER_NAME = "elevenlabs"

    def __init__(
        self,
        api_key: str | None = None,
        model_id: str | None = None,
        hr_voice_id: str | None = None,
        tech_lead_voice_id: str | None = None,
    ) -> None:
        settings = get_settings()
        self.api_key = api_key or settings.elevenlabs_api_key or settings.tts_api_key
        self.model_id = model_id or settings.elevenlabs_model_id or "eleven_flash_v2_5"
        self.hr_voice_id = hr_voice_id or settings.elevenlabs_hr_voice_id or "21m00Tcm4TlvDq8ikWAM"
        self.tech_lead_voice_id = tech_lead_voice_id or settings.elevenlabs_tech_lead_voice_id or "ErXwobaYiN019PkySvjV"
        self.fallback_mock = MockTTSProvider()

    def resolve_voice_id(self, persona: str | None, explicit_voice_id: str | None) -> str:
        """Resolve the target ElevenLabs voice ID based on interviewer persona."""
        if explicit_voice_id and explicit_voice_id not in ("default", ""):
            return explicit_voice_id

        if persona and ("TECH" in persona.upper() or "RIVERA" in persona.upper() or "ALEX" in persona.upper()):
            return self.tech_lead_voice_id
        return self.hr_voice_id

    async def synthesize(self, request: TTSSynthesisRequest) -> TTSSynthesisResponse:
        """Synthesize text into complete audio bytes with ElevenLabs."""
        clean_text = clean_text_for_speech(request.text)
        if not clean_text:
            return await self.fallback_mock.synthesize(request)

        if not self.api_key:
            logger.warning("elevenlabs_key_missing_falling_back_to_mock")
            return await self.fallback_mock.synthesize(request)

        persona = request.metadata.get("persona") or request.metadata.get("interviewer_persona")
        voice_id = self.resolve_voice_id(persona, request.voice_id)
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": clean_text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code != 200:
                    logger.warning(
                        "elevenlabs_synthesis_failed",
                        status_code=resp.status_code,
                        body=resp.text[:200],
                    )
                    return await self.fallback_mock.synthesize(request)

                audio_bytes = resp.content
                word_count = len(clean_text.split())
                duration = max(1.0, (word_count / 150.0) * 60.0)

                return TTSSynthesisResponse(
                    audio_bytes=audio_bytes,
                    content_type="audio/mpeg",
                    duration_seconds=duration,
                    provider=self.PROVIDER_NAME,
                    model=self.model_id,
                    voice_id=voice_id,
                )
        except Exception as exc:
            logger.error("elevenlabs_synthesis_exception", error=str(exc))
            return await self.fallback_mock.synthesize(request)

    async def stream(self, request: TTSSynthesisRequest) -> AsyncGenerator[bytes, None]:
        """Stream chunks of synthesized audio bytes for low-latency playback."""
        clean_text = clean_text_for_speech(request.text)
        if not clean_text:
            async for chunk in self.fallback_mock.stream(request):
                yield chunk
            return

        if not self.api_key:
            logger.warning("elevenlabs_key_missing_streaming_mock")
            async for chunk in self.fallback_mock.stream(request):
                yield chunk
            return

        persona = request.metadata.get("persona") or request.metadata.get("interviewer_persona")
        voice_id = self.resolve_voice_id(persona, request.voice_id)
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": clean_text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        logger.warning("elevenlabs_stream_failed", status_code=response.status_code)
                        async for chunk in self.fallback_mock.stream(request):
                            yield chunk
                        return

                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        if chunk:
                            yield chunk
        except Exception as exc:
            logger.error("elevenlabs_streaming_exception", error=str(exc))
            async for chunk in self.fallback_mock.stream(request):
                yield chunk
