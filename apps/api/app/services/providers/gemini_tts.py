"""Gemini natural-language text-to-speech provider.

Gemini TTS produces expressive PCM audio. The provider wraps that PCM stream in
an ordinary WAV container so browsers can play it without exposing the Gemini
API key to the frontend.
"""

from __future__ import annotations

import asyncio
import base64
import io
import wave

from google import genai

from app.core.errors import ProviderError
from app.core.logging import get_logger
from app.services.providers.base import (
    TTSProvider,
    TTSSynthesisRequest,
    TTSSynthesisResponse,
)

logger = get_logger(__name__)


class GeminiTTSProvider(TTSProvider):
    """Server-side Gemini TTS using the same Gemini API key as the LLM."""

    PROVIDER_NAME = "gemini"

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-3.1-flash-tts-preview",
        voice: str = "Kore",
        style: str = "",
        timeout_seconds: float = 30.0,
    ) -> None:
        self.api_key = api_key
        self.model = model or "gemini-3.1-flash-tts-preview"
        self.voice = voice or "Kore"
        self.style = style
        self.timeout_seconds = timeout_seconds
        self.MODEL_NAME = self.model
        self._client: genai.Client | None = genai.Client(api_key=api_key) if api_key else None

    @staticmethod
    def _wav_from_pcm(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
        """Wrap Gemini's 24 kHz mono PCM output in a browser-compatible WAV."""
        output = io.BytesIO()
        with wave.open(output, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_bytes)
        return output.getvalue()

    async def synthesize(self, request: TTSSynthesisRequest) -> TTSSynthesisResponse:
        """Generate a natural, conversational interviewer narration."""
        if not self._client:
            raise ProviderError("GEMINI_API_KEY is not configured for narration.")
        if not request.text.strip():
            raise ProviderError("Narration text cannot be empty.")

        style = request.metadata.get("style") or self.style
        prompt = (
            f"{style}\n"
            "Speak exactly the transcript below. Do not add words, headings, or commentary.\n\n"
            f"Transcript:\n{request.text.strip()}"
        )

        try:
            interaction = await asyncio.wait_for(
                asyncio.to_thread(
                    self._client.interactions.create,
                    model=self.model,
                    input=prompt,
                    response_format={"type": "audio"},
                    generation_config={"speech_config": [{"voice": request.voice_id or self.voice}]},
                ),
                timeout=self.timeout_seconds,
            )
            output_audio = getattr(interaction, "output_audio", None)
            encoded_audio = getattr(output_audio, "data", None)
            if not encoded_audio:
                raise ProviderError("Gemini TTS returned no audio data.")
            pcm_bytes = base64.b64decode(encoded_audio)
            audio_bytes = self._wav_from_pcm(pcm_bytes)
            duration_seconds = len(pcm_bytes) / (24000 * 2)
            return TTSSynthesisResponse(
                audio_bytes=audio_bytes,
                content_type="audio/wav",
                duration_seconds=round(duration_seconds, 2),
                provider=self.PROVIDER_NAME,
                model=self.model,
                voice_id=request.voice_id or self.voice,
            )
        except ProviderError:
            raise
        except Exception as exc:
            logger.warning("gemini_tts_failed", error=str(exc))
            raise ProviderError("Gemini narration generation failed.") from exc
