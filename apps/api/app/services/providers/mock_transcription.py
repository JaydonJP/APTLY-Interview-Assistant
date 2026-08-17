"""
APTLY API — Mock & Development Transcription Provider

Provides realistic, production-grounded technical fallback transcripts
with full word-level timing data for downstream analytics and evaluation.
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

# Realistic, high-rigor engineering response with STAR structure, concrete metrics, and tools
_SAMPLE_WORDS = [
    ("In", 0.0, 0.2), ("my", 0.2, 0.4), ("previous", 0.4, 0.8), ("project,", 0.8, 1.2),
    ("we", 1.4, 1.6), ("architected", 1.6, 2.2), ("a", 2.2, 2.3), ("distributed", 2.3, 2.8),
    ("event", 2.8, 3.1), ("pipeline", 3.1, 3.6), ("using", 3.6, 3.9), ("Python,", 3.9, 4.3),
    ("PostgreSQL,", 4.4, 5.0), ("and", 5.0, 5.2), ("Redis.", 5.2, 5.7),
    ("um", 5.8, 6.0),
    ("Our", 6.0, 6.3), ("baseline", 6.3, 6.8), ("latency", 6.8, 7.3), ("was", 7.3, 7.5),
    ("650ms", 7.5, 8.0), ("under", 8.0, 8.3), ("peak", 8.3, 8.6), ("load.", 8.6, 9.0),
    ("To", 9.4, 9.6), ("optimize", 9.6, 10.1), ("this,", 10.1, 10.4),
    ("we", 10.6, 10.8), ("implemented", 10.8, 11.4), ("write-through", 11.4, 12.0),
    ("caching", 12.0, 12.4), ("and", 12.4, 12.6), ("optimized", 12.6, 13.1),
    ("composite", 13.1, 13.6), ("indexes,", 13.6, 14.1), ("reducing", 14.2, 14.7),
    ("latency", 14.7, 15.1), ("by", 15.1, 15.3), ("45%", 15.3, 15.8), ("to", 15.8, 16.0),
    ("350ms", 16.0, 16.5), ("under", 16.5, 16.8), ("5,000", 16.8, 17.3),
    ("requests", 17.3, 17.7), ("per", 17.7, 17.9), ("second.", 17.9, 18.5),
]


class MockTranscriptionProvider(TranscriptionProvider):
    """
    Realistic fallback transcription provider for development and testing.
    """

    PROVIDER_NAME = "mock"
    MODEL_VERSION = "mock-transcription-v2"

    async def transcribe(
        self,
        request: TranscriptionRequest,
    ) -> TranscriptionResponse:
        """Return a realistic, grounded engineering transcript."""
        logger.debug(
            "mock_transcription_transcribe",
            audio_bytes=len(request.audio_bytes),
            content_type=request.content_type,
            language=request.language,
        )

        if len(request.audio_bytes) < 100:
            return TranscriptionResponse(
                text="No speech was detected in this recording.",
                words=[],
                language=request.language,
                duration_seconds=0.0,
                provider=self.PROVIDER_NAME,
                model_version=self.MODEL_VERSION,
            )

        words = [
            TranscriptionWord(
                word=w[0],
                start_seconds=w[1],
                end_seconds=w[2],
                confidence=0.98,
            )
            for w in _SAMPLE_WORDS
        ]

        full_text = " ".join(w.word for w in words)
        duration = _SAMPLE_WORDS[-1][2] if _SAMPLE_WORDS else 0.0

        return TranscriptionResponse(
            text=full_text,
            words=words,
            language=request.language,
            duration_seconds=float(duration),
            provider=self.PROVIDER_NAME,
            model_version=self.MODEL_VERSION,
        )
