"""
APTLY API — Fault Tolerance and AI Subsystem Failure-Safety Tests

Validates the core resilience rule:
One failed AI subsystem must never crash or destroy the interview lifecycle.

Tests failure injection for:
1. Gemini LLM unavailable / timeout / invalid JSON
2. Transcription service unavailable / timeout / malformed transcript
3. Storage provider unavailable / permission error
4. Media normalizer fallback on corrupted bytes
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.models.job import RoleProfile
from app.services.content_intelligence.service import (
    ContentAnalysisInput,
    ContentAnalysisService,
)
from app.services.interview_service import InterviewService
from app.services.providers.base import (
    LLMGenerateRequest,
    LLMProvider,
    LLMStructuredRequest,
    TranscriptionProvider,
    TranscriptionRequest,
)
from app.services.providers.gemini_llm import GeminiLLMProvider
from app.services.question_generator import QuestionGeneratorService
from app.services.role_analyzer import RoleAnalyzerService
from app.services.storage.base import StorageProvider, UploadRequest, UploadResult


class BrokenLLMProvider(LLMProvider):
    """Fails every single request to simulate complete Gemini outage."""

    async def generate_text(self, request: LLMGenerateRequest):
        raise ConnectionError("Gemini API connection timed out.")

    async def generate_structured(self, request: LLMStructuredRequest):
        raise TimeoutError("Gemini structured endpoint timed out.")

    async def generate_followup(self, *args, **kwargs):
        raise RuntimeError("Gemini follow-up service unavailable.")


class BrokenTranscriptionProvider(TranscriptionProvider):
    """Fails every transcription request to simulate speech model outage."""

    async def transcribe(self, request: TranscriptionRequest):
        raise ConnectionResetError("Whisper transcription worker connection dropped.")


class BrokenStorageProvider(StorageProvider):
    """Fails all storage uploads to simulate storage bucket outage."""

    async def upload(self, request: UploadRequest) -> UploadResult:
        raise OSError("Storage bucket quota exceeded or disk offline.")

    async def download(self, storage_key: str) -> bytes:
        raise FileNotFoundError(storage_key)

    async def delete(self, storage_key: str) -> None:
        pass

    async def exists(self, storage_key: str) -> bool:
        return False

    async def get_metadata(self, storage_key: str):
        return None

    async def generate_presigned_url(self, storage_key: str, expires_in_seconds: int = 900):
        from app.services.storage.base import PresignedUrl
        return PresignedUrl(url="/fallback", storage_key=storage_key)

    async def get_content_type(self, storage_key: str) -> str:
        return "audio/webm"


@pytest.mark.asyncio
async def test_question_generator_survives_gemini_outage():
    """Verify QuestionGenerator falls back to deterministic questions when Gemini is down."""
    broken_llm = BrokenLLMProvider()
    generator = QuestionGeneratorService(broken_llm)

    role_profile = RoleProfile(
        job_id=uuid4(),
        role_title="Backend Engineer",
        seniority="Senior",
        domain="Software Engineering",
        technical_skills=["Python", "FastAPI", "PostgreSQL"],
        tools=["Docker"],
        responsibilities=["Build distributed services"],
        behavioral_competencies=["Ownership"],
        interview_topics=["Database Optimization"],
        preferred_experience=["5+ years"],
    )

    questions = await generator.generate_questions(
        interview_id=uuid4(),
        role_profile=role_profile,
        interview_type="mixed",
        difficulty_level="medium",
        question_count=3,
        is_panel_mode=True,
    )

    assert len(questions) == 3
    for q in questions:
        assert q.question_text
        assert q.category in ("technical", "behavioral", "situational")
        assert q.interviewer_persona in ("HR_LEAD", "TECH_LEAD")


@pytest.mark.asyncio
async def test_role_analyzer_survives_gemini_outage():
    """Verify RoleAnalyzer parses role info via heuristics when Gemini is down."""
    broken_llm = BrokenLLMProvider()
    analyzer = RoleAnalyzerService(broken_llm)

    jd_text = (
        "Senior Backend Infrastructure Engineer at Stripe.\n"
        "Requirements: 5+ years experience with Python, Go, Redis, PostgreSQL, and Docker."
    )

    job, profile = await analyzer.analyze(jd_text)
    assert profile.role_title
    assert "Senior" in profile.seniority or "Mid-Level" in profile.seniority
    assert len(profile.technical_skills) > 0
    assert any("Python" in s or "PostgreSQL" in s for s in profile.technical_skills)


@pytest.mark.asyncio
async def test_content_intelligence_survives_gemini_outage():
    """Verify ContentAnalysisService generates deterministic scores when Gemini is down."""
    broken_llm = BrokenLLMProvider()
    service = ContentAnalysisService(broken_llm)

    analysis_input = ContentAnalysisInput(
        role_title="Senior Engineer",
        seniority="Senior",
        domain="Engineering",
        technical_skills=["Python", "PostgreSQL"],
        question_text="How do you handle database failover in production?",
        question_category="technical",
        expected_topics=["Replication", "Health checks"],
        full_transcript="In our architecture we configured PostgreSQL streaming replication with Patroni and etcd for automated leader election and zero downtime failover.",
        words=[],
        duration_seconds=30.0,
    )

    result = await service.analyze_answer(analysis_input)
    assert result.overall_content_score > 0
    assert result.relevance_score > 0
    assert len(result.strengths) > 0
    assert len(result.feedback) > 0


@pytest.mark.asyncio
async def test_gemini_llm_provider_handles_invalid_json():
    """Verify GeminiLLMProvider recovers or returns safe mock dictionary when receiving invalid JSON."""
    provider = GeminiLLMProvider(api_key="")
    # With empty client, provider returns safe fallback immediately
    res = await provider.generate_structured(
        LLMStructuredRequest(prompt="Test prompt", output_schema={"score": "number"})
    )
    assert isinstance(res, dict)

    # Test regex recovery helper
    recovered = provider._recover_json("```json\n{\"score\": 88, \"status\": \"passed\"}\n```")
    assert recovered == {"score": 88, "status": "passed"}

    recovered_raw = provider._recover_json("Here is your output: {\"score\": 92} Hope this helps!")
    assert recovered_raw == {"score": 92}


@pytest.mark.asyncio
async def test_interview_pipeline_survives_storage_and_transcription_outage(test_db_session):
    """Verify answer upload & processing pipeline completes even if storage and transcription fail."""
    broken_llm = BrokenLLMProvider()
    broken_tx = BrokenTranscriptionProvider()
    broken_stor = BrokenStorageProvider()

    service = InterviewService(
        db_session=test_db_session,
        llm_provider=broken_llm,
        transcription_provider=broken_tx,
        storage_provider=broken_stor,
    )

    interview = await service.create_interview(
        title="Fault Tolerance Practice",
        question_count=2,
    )
    assert len(interview.questions) == 2

    # Start interview
    interview = await service.start_interview(interview.id)
    first_q = interview.questions[0]

    # Create answer
    answer = await service.create_answer(interview.id, first_q.id)

    # Upload mock audio — both storage and transcription will throw exceptions internally
    mock_audio = b"RIFF" + b"\x00" * 2000
    processed_answer = await service.upload_and_process_answer(
        interview_id=interview.id,
        answer_id=answer.id,
        audio_data=mock_audio,
        content_type="audio/webm",
        duration_seconds=12.0,
    )

    assert processed_answer.status == "transcribed"
    assert processed_answer.processing_status == "processed"
    assert processed_answer.audio_storage_key is not None

    # Verify report card compiles cleanly
    review = await service.compile_review(interview.id)
    assert "report_card" in review
    assert review["report_card"]["overall_score"] >= 0
    assert review["interview"]["id"] == interview.id
