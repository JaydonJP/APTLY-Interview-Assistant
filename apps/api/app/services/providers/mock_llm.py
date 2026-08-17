"""
APTLY API — Mock LLM Provider

Returns canned, deterministic responses for all LLM operations.
No external API calls. No API key required.

Used in:
- Local development (LLM_PROVIDER=mock)
- All tests
- CI pipeline

Phase 1+: Replace by implementing OpenAIProvider, AnthropicProvider, etc.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.services.providers.base import (
    LLMGenerateRequest,
    LLMGenerateResponse,
    LLMProvider,
    LLMStructuredRequest,
)

logger = get_logger(__name__)


class MockLLMProvider(LLMProvider):
    """
    Mock LLM provider for development and testing.

    Responses are canned and deterministic.
    They mimic the shape of real LLM responses without making any API calls.
    """

    PROVIDER_NAME = "mock"
    MODEL_NAME = "mock-llm-v1"

    async def generate_text(self, request: LLMGenerateRequest) -> LLMGenerateResponse:
        """Return a placeholder generated text response."""
        logger.debug(
            "mock_llm_generate_text",
            prompt_length=len(request.prompt),
        )
        return LLMGenerateResponse(
            text=(
                "This is a mock LLM response. "
                "In Phase 1, this will be replaced with a real LLM call. "
                f"Your prompt was {len(request.prompt)} characters."
            ),
            provider=self.PROVIDER_NAME,
            model=self.MODEL_NAME,
            model_version="mock-v1.0",
            prompt_name="generic_text",
            prompt_version="mock-v1",
            evaluation_schema_version="1.0",
            prompt_tokens=len(request.prompt.split()),
            completion_tokens=30,
        )

    async def generate_structured(
        self,
        request: LLMStructuredRequest,
    ) -> dict[str, Any]:
        """Return a placeholder structured JSON response."""
        logger.debug(
            "mock_llm_generate_structured",
            prompt_length=len(request.prompt),
            schema_keys=list(request.output_schema.keys()),
        )
        return {
            "schema_version": "1.0",
            "_mock": True,
            "_message": "Mock structured response. Replace with real LLM in Phase 1.",
            "prompt_preview": request.prompt[:100],
        }

    async def generate_followup(
        self,
        question: str,
        answer_transcript: str,
        speech_metrics: dict[str, Any],
        content_features: dict[str, Any],
    ) -> LLMGenerateResponse:
        """Return a placeholder follow-up question."""
        logger.debug(
            "mock_llm_generate_followup",
            question_length=len(question),
            transcript_length=len(answer_transcript),
            speech_metric_keys=list(speech_metrics.keys()),
            content_feature_keys=list(content_features.keys()),
        )
        return LLMGenerateResponse(
            text=(
                "That's interesting. Could you elaborate on the specific steps "
                "you took and what you measured to confirm the outcome? "
                "(Mock follow-up — Phase 1 will generate evidence-grounded questions)"
            ),
            provider=self.PROVIDER_NAME,
            model=self.MODEL_NAME,
            model_version="mock-v1.0",
            prompt_name="followup_generation",
            prompt_version="mock-v1",
            evaluation_schema_version="1.0",
            prompt_tokens=50,
            completion_tokens=25,
        )
