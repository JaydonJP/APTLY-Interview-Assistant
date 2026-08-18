"""
APTLY API — Provider Abstractions (Base Protocols)

Defines the interfaces that all AI/ML provider implementations must satisfy.

Design principle (from architecture spec):
    The domain layer MUST NOT be coupled to any specific provider.
    Providers are injected via FastAPI dependency injection.
    The application must run fully in MOCK mode with no external API calls.

Provider hierarchy:
    LLMProvider
    ├── MockLLMProvider     ← Phase 0 (this file's sibling)
    └── OpenAIProvider      ← Phase 1+
    └── AnthropicProvider   ← Phase 1+

    TTSProvider
    ├── MockTTSProvider
    └── ElevenLabsProvider  ← Phase 1+

    TranscriptionProvider
    ├── MockTranscriptionProvider
    └── WhisperProvider     ← Phase 1+

    StorageProvider
    ├── LocalStorageProvider ← Phase 0
    └── S3CompatibleProvider ← Phase 1+
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from typing import Any

# ── LLM Provider ─────────────────────────────────────────────────────────────


@dataclass
class LLMGenerateRequest:
    """Input for a text generation request."""

    prompt: str
    system_prompt: str | None = None
    max_tokens: int = 1024
    temperature: float = 0.7
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LLMGenerateResponse:
    """Output from a text generation request."""

    text: str
    provider: str = "unknown"
    model: str = "unknown"
    model_version: str = "unknown"
    prompt_name: str = "unknown"
    prompt_version: str = "unknown"
    evaluation_schema_version: str = "1.0"
    prompt_tokens: int = 0
    completion_tokens: int = 0
    request_id: str = ""


@dataclass
class LLMStructuredRequest(LLMGenerateRequest):
    """Input for a structured JSON generation request."""

    output_schema: dict[str, Any] = field(default_factory=dict)


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.

    All implementations must be able to:
    - Generate free-form text (question generation, explanation)
    - Generate structured JSON (evaluation, scoring)
    - Generate follow-up questions grounded in answer evidence

    IMPORTANT: The LLM is NOT a measurement instrument.
    It receives structured features/evidence as input and produces
    natural-language interpretations and coaching.
    """

    @abstractmethod
    async def generate_text(self, request: LLMGenerateRequest) -> LLMGenerateResponse:
        """Generate free-form text from a prompt."""
        ...

    @abstractmethod
    async def generate_structured(
        self,
        request: LLMStructuredRequest,
    ) -> dict[str, Any]:
        """
        Generate a structured JSON object conforming to output_schema.

        Always returns a dict — callers validate against Pydantic models.
        """
        ...

    @abstractmethod
    async def generate_followup(
        self,
        question: str,
        answer_transcript: str,
        speech_metrics: dict[str, Any],
        content_features: dict[str, Any],
    ) -> LLMGenerateResponse:
        """
        Generate an evidence-grounded follow-up question.

        Args:
            question: The original question asked.
            answer_transcript: Cleaned transcript of the candidate's answer.
            speech_metrics: Structured delivery features (WPM, pauses, fillers).
            content_features: Structured content features (STAR, claims, depth).

        Returns:
            A follow-up question grounded in specific evidence from the answer.
        """
        ...


# ── TTS Provider ─────────────────────────────────────────────────────────────


@dataclass
class TTSSynthesisRequest:
    """Input for a TTS synthesis request."""

    text: str
    voice_id: str = "default"
    speed: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TTSSynthesisResponse:
    """Output from a TTS synthesis request."""

    audio_bytes: bytes
    content_type: str  # e.g., "audio/mpeg"
    duration_seconds: float
    provider: str
    model: str = "unknown"
    voice_id: str = "default"
    request_id: str = ""


class TTSProvider(ABC):
    """
    Abstract base class for Text-to-Speech providers.

    Produces audio for the AI interviewer's questions and responses.
    """

    @abstractmethod
    async def synthesize(self, request: TTSSynthesisRequest) -> TTSSynthesisResponse:
        """Convert text to audio bytes."""
        ...

    @abstractmethod
    async def stream(self, request: TTSSynthesisRequest) -> AsyncGenerator[bytes, None]:
        """Stream chunks of synthesized audio bytes for low-latency playback."""
        ...

    async def cancel(self, request_id: str | None = None) -> None:
        """Cancel an in-flight speech synthesis or stream."""
        pass


# ── Transcription Provider ────────────────────────────────────────────────────


@dataclass
class TranscriptionRequest:
    """Input for a transcription request."""

    audio_bytes: bytes
    content_type: str
    language: str = "en"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TranscriptionWord:
    """A single word with timing information."""

    word: str
    start_seconds: float
    end_seconds: float
    confidence: float


@dataclass
class TranscriptionResponse:
    """
    Output from a transcription request.

    Includes word-level timing for future:
    - filler word detection (with exact timestamps)
    - WPM calculation (word count / duration)
    - pause detection (gaps between word end/start)
    - answer replay synchronisation
    """

    text: str
    words: list[TranscriptionWord]
    language: str
    duration_seconds: float
    provider: str
    model: str = "unknown"
    model_version: str = "unknown"
    request_id: str = ""


class TranscriptionProvider(ABC):
    """
    Abstract base class for transcription providers.

    IMPORTANT: Transcription is an ASYNC operation.
    The interview continues in realtime; transcription runs post-answer.
    The full pipeline is:
        RAW AUDIO → TRANSCRIPTION → WORD ALIGNMENT → FEATURE EXTRACTION
    """

    @abstractmethod
    async def transcribe(
        self,
        request: TranscriptionRequest,
    ) -> TranscriptionResponse:
        """Transcribe audio bytes to text with word-level timing."""
        ...
