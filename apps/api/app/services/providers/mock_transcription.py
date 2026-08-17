"""
APTLY API — Mock Transcription Provider

Returns a deterministic placeholder transcript for all audio inputs.
No external API calls. No model inference. No API key required.

The mock transcript includes word-level timing data to test
downstream feature extraction pipeline shapes (filler detection,
WPM, pause analysis) before WhisperX is integrated.

Phase 1+: Replace by implementing WhisperProvider, WhisperXProvider, etc.
"""

from __future__ import annotations

from app.core.logging import get_logger
from app.services.providers.base import (
    TranscriptionProvider,
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionWord,
)

logger = get_logger(__name__)

# Deterministic mock transcript with word-level timing
# Includes a filler word ("um") so filler detection can be tested
_MOCK_WORDS: list[dict[str, object]] = [
    {"word": "This", "start": 0.0, "end": 0.3, "confidence": 0.99},
    {"word": "is", "start": 0.3, "end": 0.45, "confidence": 0.99},
    {"word": "a", "start": 0.45, "end": 0.55, "confidence": 0.99},
    {"word": "mock", "start": 0.55, "end": 0.85, "confidence": 0.97},
    {"word": "transcript.", "start": 0.85, "end": 1.3, "confidence": 0.96},
    {"word": "um", "start": 1.8, "end": 2.0, "confidence": 0.95},  # filler
    {"word": "In", "start": 2.1, "end": 2.3, "confidence": 0.99},
    {"word": "Phase", "start": 2.3, "end": 2.6, "confidence": 0.99},
    {"word": "1", "start": 2.6, "end": 2.75, "confidence": 0.99},
    {"word": "this", "start": 2.75, "end": 2.95, "confidence": 0.99},
    {"word": "will", "start": 2.95, "end": 3.1, "confidence": 0.99},
    {"word": "use", "start": 3.1, "end": 3.25, "confidence": 0.99},
    {"word": "WhisperX.", "start": 3.25, "end": 3.9, "confidence": 0.98},
]


class MockTranscriptionProvider(TranscriptionProvider):
    """
    Mock transcription provider for development and testing.

    Returns a fixed transcript with word-level timing regardless of input.
    This lets downstream pipeline components (filler detection, WPM, pauses)
    be developed and tested before real transcription is available.
    """

    PROVIDER_NAME = "mock"
    MODEL_VERSION = "mock-transcription-v1"

    async def transcribe(
        self,
        request: TranscriptionRequest,
    ) -> TranscriptionResponse:
        """Return a deterministic mock transcript."""
        logger.debug(
            "mock_transcription_transcribe",
            audio_bytes=len(request.audio_bytes),
            content_type=request.content_type,
            language=request.language,
        )

        words = [
            TranscriptionWord(
                word=w["word"],  # type: ignore[arg-type]
                start_seconds=w["start"],  # type: ignore[arg-type]
                end_seconds=w["end"],  # type: ignore[arg-type]
                confidence=w["confidence"],  # type: ignore[arg-type]
            )
            for w in _MOCK_WORDS
        ]

        full_text = " ".join(w.word for w in words)
        duration = _MOCK_WORDS[-1]["end"] if _MOCK_WORDS else 0.0

        return TranscriptionResponse(
            text=full_text,
            words=words,
            language=request.language,
            duration_seconds=float(duration),  # type: ignore[arg-type]
            provider=self.PROVIDER_NAME,
            model_version=self.MODEL_VERSION,
        )
