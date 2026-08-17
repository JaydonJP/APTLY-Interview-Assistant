"""
APTLY API — Real OpenAI / Compatible LLM Provider

Implements LLMProvider using async HTTP requests with:
- JSON mode / structured outputs
- Strict timeout (default 30s)
- Exponential backoff retry (3 attempts)
- Structured logging & token provenance
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx

from app.core.errors import ProviderError
from app.core.logging import get_logger
from app.services.providers.base import (
    LLMGenerateRequest,
    LLMGenerateResponse,
    LLMProvider,
    LLMStructuredRequest,
)

logger = get_logger(__name__)


class OpenAILLMProvider(LLMProvider):
    """
    Production-grade OpenAI / Compatible LLM provider.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        base_url: str = "https://api.openai.com/v1",
        timeout_seconds: float = 30.0,
    ) -> None:
        self.api_key = api_key
        self.model = model or "gpt-4o-mini"
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_seconds

        logger.info(
            "openai_llm_provider_init",
            model=self.model,
            base_url=self.base_url,
        )

    async def _post_chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 1500,
        response_format: dict[str, Any] | None = None,
        max_retries: int = 2,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        last_err: Exception | None = None
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(max_retries + 1):
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code != 200:
                        raise ProviderError(
                            f"OpenAI API error ({resp.status_code}): {resp.text[:200]}"
                        )
                    data: dict[str, Any] = resp.json()
                    return data
                except Exception as exc:
                    last_err = exc
                    logger.warning(
                        "openai_api_call_failed",
                        attempt=attempt + 1,
                        error=str(exc),
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(1.0 * (attempt + 1))

        raise ProviderError(f"OpenAI request failed after {max_retries + 1} attempts: {last_err}") from last_err

    async def generate_text(self, request: LLMGenerateRequest) -> LLMGenerateResponse:
        messages = [
            {"role": "system", "content": request.system_prompt or "You are an AI interview assistant."},
            {"role": "user", "content": request.prompt},
        ]
        data = await self._post_chat_completion(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        choice = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return LLMGenerateResponse(
            text=choice or "",
            provider="openai",
            model=self.model,
            model_version=self.model,
            prompt_name="generic_text",
            prompt_version="1.0",
            evaluation_schema_version="1.0",
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
        )

    async def generate_structured(
        self,
        request: LLMStructuredRequest,
    ) -> dict[str, Any]:
        base_sys = request.system_prompt or "You are an expert AI evaluator."
        system_content = (
            base_sys
            + "\n\nYou MUST return a single valid JSON object adhering strictly to the required schema. Do not enclose in markdown blocks."
        )
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": request.prompt},
        ]

        data = await self._post_chat_completion(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            response_format={"type": "json_object"},
        )
        content = data["choices"][0]["message"]["content"]
        try:
            parsed: dict[str, Any] = json.loads(content)
            return parsed
        except json.JSONDecodeError as exc:
            logger.error("openai_json_parse_error", content=content[:200])
            raise ProviderError(f"OpenAI returned invalid JSON: {exc}") from exc

    async def generate_followup(
        self,
        question: str,
        answer_transcript: str,
        speech_metrics: dict[str, Any],
        content_features: dict[str, Any],
    ) -> LLMGenerateResponse:
        prompt = f"""Generate an evidence-grounded follow-up question for:
Original Question: "{question}"
Candidate Transcript: "{answer_transcript}"
Speech Metrics: {speech_metrics}
Content Features: {content_features}

Follow-up should probe a specific technical gap or ask for elaboration on a claimed result.
"""
        req = LLMGenerateRequest(
            prompt=prompt,
            system_prompt="You are an expert interviewer crafting precise, evidence-grounded follow-up questions.",
            temperature=0.3,
            max_tokens=150,
        )
        return await self.generate_text(req)
