"""
APTLY API — ElevenLabs TTS & Ollama LLM Unit Tests

Validates:
- ElevenLabs text sanitation (strips JSON, debug tokens, markdown)
- Persona voice resolution (Friendly HR vs Skeptical Tech Lead)
- ElevenLabs graceful fallback to MockTTS on missing API key
- Ollama structured JSON extraction, retry, and fallback to secondary provider
"""

import pytest

from app.services.providers.base import LLMStructuredRequest, TTSSynthesisRequest
from app.services.providers.elevenlabs_tts import ElevenLabsTTSProvider, clean_text_for_speech
from app.services.providers.mock_llm import MockLLMProvider
from app.services.providers.mock_tts import MockTTSProvider
from app.services.providers.ollama_llm import OllamaLLMProvider


def test_clean_text_for_speech_strips_json_and_markdown():
    """Verify that JSON metadata, code blocks, and markdown are stripped before sending to TTS."""
    raw = '{"question": "How did you measure the 40% improvement?", "decision": "FOLLOW_UP"}'
    cleaned = clean_text_for_speech(raw)
    assert cleaned == "How did you measure the 40% improvement?"

    markdown_raw = "**Great job!** Let's discuss the `PostgreSQL` indexing."
    cleaned_md = clean_text_for_speech(markdown_raw)
    assert cleaned_md == "Great job! Let's discuss the PostgreSQL indexing."


def test_elevenlabs_voice_persona_resolution():
    """Ensure Friendly HR and Tech Lead personas map to distinct voice IDs."""
    provider = ElevenLabsTTSProvider(
        api_key="test_key",
        hr_voice_id="voice_sarah_hr",
        tech_lead_voice_id="voice_alex_tech",
    )

    assert provider.resolve_voice_id("friendly_hr", None) == "voice_sarah_hr"
    assert provider.resolve_voice_id("Sarah Chen (HR Lead)", None) == "voice_sarah_hr"
    assert provider.resolve_voice_id("skeptical_tech_lead", None) == "voice_alex_tech"
    assert provider.resolve_voice_id("Alex Rivera (Tech Lead)", None) == "voice_alex_tech"


@pytest.mark.asyncio
async def test_elevenlabs_fallback_to_mock_when_no_key():
    """When API key is absent, synthesize and stream should fallback to MockTTS safely."""
    provider = ElevenLabsTTSProvider(api_key="")
    req = TTSSynthesisRequest(text="Tell me about your previous project.")

    response = await provider.synthesize(req)
    assert response.provider == "mock"
    assert response.audio_bytes is not None

    chunks = []
    async for chunk in provider.stream(req):
        chunks.append(chunk)
    assert len(chunks) > 0


@pytest.mark.asyncio
async def test_ollama_fallback_to_mock_on_connection_failure():
    """When Ollama is unreachable, provider should fallback to MockLLM without crashing."""
    mock_fallback = MockLLMProvider()
    provider = OllamaLLMProvider(
        base_url="http://127.0.0.1:99999",  # non-existent port
        model="hf.co/mradermacher/interview-assistant-model-GGUF:Q4_K_M",
        fallback_provider=mock_fallback,
    )

    req = LLMStructuredRequest(
        prompt="Evaluate answer",
        output_schema={"type": "object"},
    )
    result = await provider.generate_structured(req)
    assert isinstance(result, dict)
