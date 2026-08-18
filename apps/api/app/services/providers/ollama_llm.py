"""
APTLY API — Ollama / Qwen GGUF LLM Provider

Integrates local GGUF models running in Ollama (e.g. hf.co/mradermacher/interview-assistant-model-GGUF:Q4_K_M).
Features:
- Fast structured JSON generation for conversational moves & follow-ups
- Automatic retry on malformed JSON
- Seamless fallback to GeminiLLMProvider if Ollama server is offline
- Deterministic fallback if all providers fail
"""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.config import get_settings
from app.core.logging import get_logger
from app.services.providers.base import (
    LLMGenerateRequest,
    LLMGenerateResponse,
    LLMProvider,
    LLMStructuredRequest,
)
from app.services.providers.gemini_llm import GeminiLLMProvider
from app.services.providers.mock_llm import MockLLMProvider

logger = get_logger(__name__)


class OllamaLLMProvider(LLMProvider):
    """
    Local GGUF LLM provider communicating over Ollama REST API.
    """

    PROVIDER_NAME = "ollama"

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        fallback_provider: LLMProvider | None = None,
    ) -> None:
        settings = get_settings()
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_model
        self.fallback_provider = fallback_provider or (
            GeminiLLMProvider(api_key=settings.gemini_api_key)
            if settings.gemini_api_key
            else MockLLMProvider()
        )

    async def _call_ollama_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        format_json: bool = False,
    ) -> str:
        """Call Ollama /api/chat endpoint."""
        url = f"{self.base_url}/api/chat"
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }
        if format_json:
            payload["format"] = "json"

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Ollama returned HTTP {resp.status_code}: {resp.text[:200]}")
            data = resp.json()
            return data.get("message", {}).get("content", "")

    async def generate_text(self, request: LLMGenerateRequest) -> LLMGenerateResponse:
        """Generate free-form text from Ollama."""
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})

        try:
            raw_text = await self._call_ollama_chat(messages, temperature=request.temperature)
            return LLMGenerateResponse(
                text=raw_text.strip(),
                provider=self.PROVIDER_NAME,
                model=self.model,
            )
        except Exception as exc:
            logger.warning("ollama_generate_text_failed_fallback", error=str(exc))
            return await self.fallback_provider.generate_text(request)

    async def generate_structured(self, request: LLMStructuredRequest) -> dict[str, Any]:
        """Generate a structured JSON object with retry and fallback."""
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})

        # Try up to 2 attempts with Ollama
        for attempt in range(2):
            try:
                raw_text = await self._call_ollama_chat(
                    messages,
                    temperature=request.temperature,
                    format_json=True,
                )
                parsed = self._extract_json(raw_text)
                if parsed and isinstance(parsed, dict):
                    return parsed
            except Exception as exc:
                logger.warning("ollama_structured_attempt_failed", attempt=attempt, error=str(exc))

        # Fallback to Gemini / Mock
        logger.warning("ollama_structured_fallback_to_secondary_provider")
        return await self.fallback_provider.generate_structured(request)

    async def generate_followup(
        self,
        question: str,
        answer_transcript: str,
        speech_metrics: dict[str, Any],
        content_features: dict[str, Any],
    ) -> LLMGenerateResponse:
        """Generate an evidence-grounded follow-up question."""
        prompt = f"""Question asked: "{question}"
Candidate answer: "{answer_transcript}"
Metrics: {speech_metrics}
Features: {content_features}

Generate ONE concise follow-up question (5-25 words) directly referencing the candidate's answer."""

        req = LLMGenerateRequest(prompt=prompt)
        return await self.generate_text(req)

    def _extract_json(self, raw_text: str) -> dict[str, Any] | None:
        """Extract and parse valid JSON from LLM output."""
        try:
            return json.loads(raw_text.strip())
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", raw_text)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
        return None
