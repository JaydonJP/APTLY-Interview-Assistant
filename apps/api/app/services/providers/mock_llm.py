"""
APTLY API — Mock LLM Provider

Returns deterministic, question-aware and role-aware structured responses for all LLM operations.
No external API calls. No API key required.
Used in:
- Local development (LLM_PROVIDER=mock)
- All tests
- CI pipeline
"""

from __future__ import annotations

import re
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
    """

    PROVIDER_NAME = "mock"
    MODEL_NAME = "mock-llm-v2"

    async def generate_text(self, request: LLMGenerateRequest) -> LLMGenerateResponse:
        """Return a placeholder generated text response."""
        logger.debug(
            "mock_llm_generate_text",
            prompt_length=len(request.prompt),
        )
        return LLMGenerateResponse(
            text=(
                "This is a mock LLM response. "
                f"Your prompt was {len(request.prompt)} characters."
            ),
            provider=self.PROVIDER_NAME,
            model=self.MODEL_NAME,
            model_version="mock-v2.0",
            prompt_name="generic_text",
            prompt_version="mock-v2",
            evaluation_schema_version="1.0",
            prompt_tokens=len(request.prompt.split()),
            completion_tokens=30,
        )

    async def generate_structured(
        self,
        request: LLMStructuredRequest,
    ) -> dict[str, Any]:
        """Return a calibrated structured JSON response conforming to output_schema."""
        logger.debug(
            "mock_llm_generate_structured",
            prompt_length=len(request.prompt),
        )

        schema = request.output_schema
        properties = schema.get("properties", {})

        # 1. Job Role Profile extraction schema
        if "role_title" in properties and "technical_skills" in properties:
            return {
                "schema_version": "1.0",
                "role_title": "AI / ML Platform Engineer",
                "seniority": "Mid-Level",
                "domain": "Software Engineering",
                "technical_skills": ["Python", "PyTorch", "FastAPI", "PostgreSQL"],
                "tools": ["Git", "Docker", "Redis", "FFmpeg"],
                "responsibilities": [
                    "Design and build scalable, maintainable backend APIs and database schemas",
                    "Collaborate with cross-functional teams to deliver production features",
                    "Participate in code reviews, automated testing, and technical documentation",
                ],
                "behavioral_competencies": [
                    "System Architecture & Problem Solving",
                    "Ownership and Accountability",
                    "Clear Technical Communication",
                    "Collaboration in Agile Sprints",
                ],
                "interview_topics": [
                    "Python Architecture & Best Practices",
                    "Database Schema Optimization & Query Performance",
                    "API Design & Concurrency Handling",
                    "Past Technical Challenges & Production Trade-offs (STAR)",
                ],
                "preferred_experience": [
                    "3+ years building high-throughput web applications",
                    "Demonstrated experience with relational databases and caching architectures",
                ],
                "prompt_version": "role_analysis/v1",
            }

        # 2. Phase 2 Content Intelligence schema
        if "relevance_score" in properties and "technical_depth_score" in properties:
            is_behavioral = "BEHAVIORAL" in request.prompt.upper() or "STAR" in request.prompt.upper()
            q_type = "behavioral" if is_behavioral else "technical"

            # Extract sample words or phrase from prompt if possible
            match = re.search(r'Full Transcript:\s*"""(.*?)"""', request.prompt, re.DOTALL)
            transcript_text = match.group(1).strip() if match else "sample answer"

            star_data = None
            if is_behavioral:
                star_data = {
                    "situation": {
                        "present": True,
                        "quality": 85.0,
                        "evidence_text": "We had high database latency on our search endpoints.",
                        "start_seconds": 0.5,
                        "end_seconds": 3.2,
                    },
                    "task": {
                        "present": True,
                        "quality": 80.0,
                        "evidence_text": "I was tasked with diagnosing the query bottleneck and implementing a caching layer.",
                        "start_seconds": 3.5,
                        "end_seconds": 6.8,
                    },
                    "action": {
                        "present": True,
                        "quality": 90.0,
                        "evidence_text": "I added composite B-Tree indexes and integrated Redis caching.",
                        "start_seconds": 7.0,
                        "end_seconds": 11.5,
                    },
                    "result": {
                        "present": True,
                        "quality": 85.0,
                        "evidence_text": "Latency dropped from 500ms down to 120ms in production.",
                        "start_seconds": 12.0,
                        "end_seconds": 15.2,
                    },
                    "missing_components": [],
                }

            return {
                "question_type": q_type,
                "relevance_score": 88.0,
                "technical_depth_score": 82.0,
                "completeness_score": 80.0,
                "structure_score": 85.0,
                "evidence_score": 84.0,
                "overall_content_score": 84.0,
                "correctness_status": "correct",
                "correctness_score": 86.0,
                "correctness_summary": "The answer addressed the core mechanism and connected the decision to a measurable performance outcome.",
                "topic_coverage": [
                    {
                        "topic": "Database Indexing & Query Optimization",
                        "covered": True,
                        "score": 88.0,
                        "evidence_quote": transcript_text[:80] if transcript_text else "Used indexing and caching",
                        "explanation": "The transcript references indexes and performance improvement.",
                        "importance": "core",
                    },
                    {
                        "topic": "Caching trade-offs",
                        "covered": False,
                        "score": 35.0,
                        "evidence_quote": None,
                        "explanation": "The answer did not explain invalidation or memory trade-offs.",
                        "importance": "supporting",
                    },
                ],
                "ideal_answer_outline": [
                    "Name the approach and why it fits the workload.",
                    "Explain the mechanism and the main trade-off.",
                    "Close with a measured result and how it was validated.",
                ],
                "strengths": [
                    "Directly addressed the core technical requirements of the question.",
                    "Demonstrated clear understanding of performance profiling and caching patterns.",
                    "Articulated specific architecture choices with measurable results.",
                ],
                "weaknesses": [
                    "Could expand on trade-offs such as cache invalidation policies and memory overhead.",
                ],
                "star_analysis": star_data,
                "claims": [
                    {
                        "claim": "Optimized database performance with indexes and caching.",
                        "support_status": "SUPPORTED",
                        "evidence_quote": transcript_text[:80] if transcript_text else "Used indexing and caching",
                        "start_seconds": 1.5,
                    }
                ],
                "evidence": [
                    {
                        "id": "ev-01",
                        "type": "TECHNICAL_POINT",
                        "text": transcript_text[:60] if transcript_text else "Built backend microservice with FastAPI",
                        "start_seconds": 1.0,
                        "end_seconds": 4.5,
                        "confidence": 0.95,
                    }
                ],
                "feedback": [
                    {
                        "observation": "Clearly explained backend architecture and query indexing.",
                        "impact": "Demonstrates strong foundational software engineering competency to the interviewer.",
                        "action": "Always pair architectural choices with one operational trade-off (e.g. write latency vs read throughput).",
                    }
                ],
                "practice_drills": [
                    {
                        "title": "60-Second Trade-off Explanation Drill",
                        "duration_seconds": 60,
                        "instructions": "State your architectural decision in 15s, explain the primary benefit in 20s, and detail two potential failure modes/trade-offs in 25s.",
                        "repeat_count": 3,
                    }
                ],
                "reasoning_summary": "Strong, well-structured response demonstrating concrete technical competence with clear evidence grounding.",
            }

        # Fallback generic structured dict
        return {
            "schema_version": "1.0",
            "_mock": True,
            "prompt_preview": request.prompt[:100],
        }

    async def generate_followup(
        self,
        question: str,
        answer_transcript: str,
        speech_metrics: dict[str, Any],
        content_features: dict[str, Any],
    ) -> LLMGenerateResponse:
        """Return a calibrated follow-up question."""
        return LLMGenerateResponse(
            text=(
                "What specific trade-offs did you encounter with this approach, "
                "and how would you adapt it if traffic increased 10x?"
            ),
            provider=self.PROVIDER_NAME,
            model=self.MODEL_NAME,
            model_version="mock-v2.0",
            prompt_name="followup_generation",
            prompt_version="v1.0",
            evaluation_schema_version="1.0",
        )
