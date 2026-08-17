"""
APTLY API — Provider Mock Tests
"""

from __future__ import annotations

import pytest

from app.services.providers.base import (
    LLMGenerateRequest,
    LLMStructuredRequest,
    TranscriptionRequest,
    TTSSynthesisRequest,
)
from app.services.providers.mock_llm import MockLLMProvider
from app.services.providers.mock_transcription import MockTranscriptionProvider
from app.services.providers.mock_tts import MockTTSProvider

# ── LLM Provider ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mock_llm_generate_text_returns_response() -> None:
    """Mock LLM generate_text returns a valid response."""
    provider = MockLLMProvider()
    request = LLMGenerateRequest(prompt="Tell me about yourself")
    response = await provider.generate_text(request)

    assert response.text
    assert response.model
    assert response.provider == "mock"
    assert response.prompt_tokens > 0
    assert response.completion_tokens > 0


@pytest.mark.asyncio
async def test_mock_llm_generate_structured_returns_dict() -> None:
    """Mock LLM generate_structured returns a dict with schema_version."""
    provider = MockLLMProvider()
    request = LLMStructuredRequest(
        prompt="Evaluate this answer",
        output_schema={"score": "number", "feedback": "string"},
    )
    response = await provider.generate_structured(request)

    assert isinstance(response, dict)
    assert "schema_version" in response
    assert response.get("_mock") is True


@pytest.mark.asyncio
async def test_mock_llm_generate_followup_returns_question() -> None:
    """Mock LLM generate_followup returns a follow-up question string."""
    provider = MockLLMProvider()
    response = await provider.generate_followup(
        question="Tell me about a time you led a project.",
        answer_transcript="I led a team of 5 engineers...",
        speech_metrics={"wpm": 145, "filler_count": 2},
        content_features={"star_score": 0.7},
    )

    assert response.text
    assert response.provider == "mock"


# ── TTS Provider ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mock_tts_returns_bytes() -> None:
    """Mock TTS returns non-empty audio bytes."""
    provider = MockTTSProvider()
    request = TTSSynthesisRequest(text="Hello, I am your interviewer today.")
    response = await provider.synthesize(request)

    assert isinstance(response.audio_bytes, bytes)
    assert len(response.audio_bytes) > 0
    assert response.content_type == "audio/wav"
    assert response.provider == "mock"
    assert response.duration_seconds > 0


@pytest.mark.asyncio
async def test_mock_tts_duration_scales_with_word_count() -> None:
    """Mock TTS duration estimate scales with text length."""
    provider = MockTTSProvider()
    short = await provider.synthesize(TTSSynthesisRequest(text="Hi."))
    long_ = await provider.synthesize(
        TTSSynthesisRequest(text="This is a much longer sentence with many more words.")
    )
    assert long_.duration_seconds > short.duration_seconds


# ── Transcription Provider ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mock_transcription_returns_text() -> None:
    """Mock transcription returns non-empty text."""
    provider = MockTranscriptionProvider()
    request = TranscriptionRequest(
        audio_bytes=b"\x00" * 100,
        content_type="audio/wav",
    )
    response = await provider.transcribe(request)

    assert response.text
    assert response.provider == "mock"
    assert response.duration_seconds > 0


@pytest.mark.asyncio
async def test_mock_transcription_returns_word_timing() -> None:
    """Mock transcription returns word-level timing data."""
    provider = MockTranscriptionProvider()
    request = TranscriptionRequest(
        audio_bytes=b"\x00" * 100,
        content_type="audio/wav",
    )
    response = await provider.transcribe(request)

    assert len(response.words) > 0
    for word in response.words:
        assert word.word
        assert word.start_seconds >= 0
        assert word.end_seconds > word.start_seconds
        assert 0.0 <= word.confidence <= 1.0


@pytest.mark.asyncio
async def test_mock_transcription_contains_filler_word() -> None:
    """Mock transcript contains a filler word ('um') for testing detection."""
    provider = MockTranscriptionProvider()
    request = TranscriptionRequest(
        audio_bytes=b"\x00" * 100,
        content_type="audio/wav",
    )
    response = await provider.transcribe(request)

    words = [w.word.lower().rstrip(".") for w in response.words]
    assert "um" in words, "Mock transcript must include 'um' for filler word testing"
