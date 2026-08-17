"""
APTLY — OpenAILLMProvider Unit Tests
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.providers.base import LLMGenerateRequest, LLMStructuredRequest
from app.services.providers.openai_llm import OpenAILLMProvider


@pytest.fixture
def openai_provider():
    return OpenAILLMProvider(api_key="test_key_123", model="gpt-4o-mini")


@pytest.mark.asyncio
async def test_openai_generate_text_mocked(openai_provider):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "This is a mock OpenAI answer."}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 8},
    }

    with patch.object(openai_provider, "_post_chat_completion", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {
            "choices": [{"message": {"content": "This is a mock OpenAI answer."}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 8},
        }
        res = await openai_provider.generate_text(
            LLMGenerateRequest(prompt="Hello OpenAI")
        )
        assert res.text == "This is a mock OpenAI answer."
        assert res.provider == "openai"
        assert res.prompt_tokens == 10


@pytest.mark.asyncio
async def test_openai_generate_structured_mocked(openai_provider):
    with patch.object(openai_provider, "_post_chat_completion", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"relevance_score": 90.0, "technical_depth_score": 85.0}'
                    }
                }
            ]
        }
        res = await openai_provider.generate_structured(
            LLMStructuredRequest(
                prompt="Evaluate this answer",
                output_schema={"type": "object"},
            )
        )
        assert res["relevance_score"] == 90.0
        assert res["technical_depth_score"] == 85.0
