"""
APTLY API — Unit Tests for Production Gemini LLM Provider
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.providers.base import LLMGenerateRequest, LLMStructuredRequest
from app.services.providers.gemini_llm import GeminiLLMProvider


@pytest.mark.asyncio
async def test_gemini_generate_text_mocked() -> None:
    provider = GeminiLLMProvider(api_key="test-gemini-key", model="gemini-2.5-flash")

    mock_resp = MagicMock()
    mock_resp.text = "This is a high-quality Gemini response."

    with patch.object(provider._client.models, "generate_content", return_value=mock_resp):
        res = await provider.generate_text(
            LLMGenerateRequest(prompt="Hello Gemini", system_prompt="Test system")
        )
        assert res.provider == "gemini"
        assert res.model == "gemini-2.5-flash"
        assert "Gemini response" in res.text


@pytest.mark.asyncio
async def test_gemini_generate_structured_mocked() -> None:
    provider = GeminiLLMProvider(api_key="test-gemini-key", model="gemini-2.5-flash")

    mock_json = {"score": 92.5, "strengths": ["Clear communication", "Solid architecture"]}
    mock_resp = MagicMock()
    mock_resp.text = f"```json\n{json.dumps(mock_json)}\n```"

    with patch.object(provider._client.models, "generate_content", return_value=mock_resp):
        res = await provider.generate_structured(
            LLMStructuredRequest(
                prompt="Evaluate this answer",
                system_prompt="Return JSON",
                output_schema={},
            )
        )
        assert res["score"] == 92.5
        assert len(res["strengths"]) == 2
