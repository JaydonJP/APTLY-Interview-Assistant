"""
APTLY API — Mock TTS Provider

Returns silent/placeholder audio bytes for all synthesis requests.
No external API calls. No API key required.

Phase 1+: Replace by implementing ElevenLabsProvider, OpenAITTSProvider, etc.
"""

from __future__ import annotations

from app.core.logging import get_logger
from app.services.providers.base import (
    TTSProvider,
    TTSSynthesisRequest,
    TTSSynthesisResponse,
)

logger = get_logger(__name__)

# Minimal valid WAV file header (44 bytes) with no audio data
# This is a proper WAV format: PCM, 1 channel, 16-bit, 22050 Hz, 0 samples
_SILENT_WAV_BYTES: bytes = (
    b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00"
    b"\x01\x00\x22V\x00\x00\x44\xac\x00\x00\x02\x00\x10\x00"
    b"data\x00\x00\x00\x00"
)


class MockTTSProvider(TTSProvider):
    """
    Mock TTS provider for development and testing.

    Returns a minimal silent WAV file instead of synthesized speech.
    Duration is estimated based on word count.
    """

    PROVIDER_NAME = "mock"

    async def synthesize(
        self,
        request: TTSSynthesisRequest,
    ) -> TTSSynthesisResponse:
        """Return silent placeholder audio."""
        word_count = len(request.text.split())
        # Rough estimate: average 150 WPM speaking rate
        estimated_duration = (word_count / 150.0) * 60.0

        logger.debug(
            "mock_tts_synthesize",
            text_length=len(request.text),
            word_count=word_count,
            estimated_duration_s=estimated_duration,
        )

        return TTSSynthesisResponse(
            audio_bytes=_SILENT_WAV_BYTES,
            content_type="audio/wav",
            duration_seconds=estimated_duration,
            provider=self.PROVIDER_NAME,
        )

    async def stream(self, request: TTSSynthesisRequest):
        """Stream mock audio chunk."""
        yield _SILENT_WAV_BYTES
