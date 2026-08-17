"""
APTLY — Phase 2 Content Intelligence Unit & Integration Tests

Tests:
1. Question type classification
2. Short answer guardrails (< 6 words)
3. Technical question rubric evaluation
4. Behavioral question STAR framework breakdown
5. Claim extraction and support status
6. ContentMetrics persistence and idempotent update
7. Review compilation with content metrics
"""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.content_intelligence import (
    ClaimSupportStatus,
    ContentAnalysisInput,
    ContentAnalysisResult,
    QuestionType,
)
from app.services.content_intelligence.service import ContentAnalysisService
from app.services.providers.mock_llm import MockLLMProvider


@pytest.fixture
def mock_llm():
    return MockLLMProvider()


@pytest.fixture
def content_service(mock_llm):
    return ContentAnalysisService(llm_provider=mock_llm)


def test_classify_question_type(content_service):
    assert content_service.classify_question_type("Tell me about yourself", "") == QuestionType.INTRODUCTORY
    assert content_service.classify_question_type("Describe a situation where you resolved a team conflict", "") == QuestionType.BEHAVIORAL
    assert content_service.classify_question_type("Design a high-throughput rate limiter", "") == QuestionType.SYSTEM_DESIGN
    assert content_service.classify_question_type("Walk me through a challenging project you built", "") == QuestionType.PROJECT
    assert content_service.classify_question_type("What would you do if production database locks up?", "") == QuestionType.SITUATIONAL
    assert content_service.classify_question_type("Explain how B-Trees work in PostgreSQL indexes", "technical") == QuestionType.TECHNICAL


@pytest.mark.asyncio
async def test_short_answer_guardrail(content_service):
    input_data = ContentAnalysisInput(
        role_title="Backend Engineer",
        seniority="Mid-Level",
        domain="Engineering",
        question_text="How do you handle database connection pooling in FastAPI?",
        question_category="technical",
        full_transcript="Yes I know.",
        words=[{"word": "Yes", "start_seconds": 0.0, "end_seconds": 0.4}],
        duration_seconds=1.0,
    )
    result = await content_service.analyze_answer(input_data)
    assert isinstance(result, ContentAnalysisResult)
    assert result.overall_content_score < 20.0
    assert result.relevance_score <= 10.0
    assert len(result.feedback) > 0
    assert len(result.practice_drills) > 0
    assert "too brief" in result.reasoning_summary.lower()


@pytest.mark.asyncio
async def test_technical_answer_evaluation(content_service):
    input_data = ContentAnalysisInput(
        role_title="AI / ML Platform Engineer",
        seniority="Senior",
        domain="Engineering",
        technical_skills=["Python", "FastAPI", "PostgreSQL", "Redis"],
        question_text="How do you architect a high-throughput async processing pipeline?",
        question_category="technical",
        expected_topics=["Async IO", "Message Queues", "Caching"],
        full_transcript=(
            "We built an event-driven architecture using FastAPI with background worker pools. "
            "We used Redis for message queuing and caching query results, which reduced database read latency."
        ),
        words=[
            {"word": "We", "start_seconds": 0.0, "end_seconds": 0.2},
            {"word": "built", "start_seconds": 0.2, "end_seconds": 0.5},
            {"word": "an", "start_seconds": 0.5, "end_seconds": 0.7},
            {"word": "event-driven", "start_seconds": 0.7, "end_seconds": 1.2},
            {"word": "architecture", "start_seconds": 1.2, "end_seconds": 1.8},
        ],
        duration_seconds=15.0,
    )
    result = await content_service.analyze_answer(input_data)
    assert isinstance(result, ContentAnalysisResult)
    assert result.relevance_score >= 80.0
    assert result.technical_depth_score >= 80.0
    assert len(result.strengths) > 0
    assert len(result.claims) > 0
    assert len(result.feedback) > 0
    assert len(result.practice_drills) > 0
    assert result.claims[0].support_status in (
        ClaimSupportStatus.SUPPORTED,
        ClaimSupportStatus.PARTIALLY_SUPPORTED,
        ClaimSupportStatus.UNSUPPORTED,
    )


@pytest.mark.asyncio
async def test_behavioral_star_evaluation(content_service):
    input_data = ContentAnalysisInput(
        role_title="Senior Engineer",
        seniority="Senior",
        domain="Engineering",
        question_text="Tell me about a time you resolved a major production outage.",
        question_category="behavioral",
        full_transcript=(
            "In my previous role, our main database locked up during peak traffic. "
            "My task was to restore availability within 15 minutes. "
            "I analyzed the active query locks, killed the blocking transaction, and implemented connection limits. "
            "As a result, system uptime returned to 100% and latency dropped back to 50ms."
        ),
        words=[],
        duration_seconds=20.0,
    )
    result = await content_service.analyze_answer(input_data)
    assert isinstance(result, ContentAnalysisResult)
    assert result.question_type == QuestionType.BEHAVIORAL
    assert result.star_analysis is not None
    assert result.star_analysis.situation.present is True
    assert result.star_analysis.task.present is True
    assert result.star_analysis.action.present is True
    assert result.star_analysis.result.present is True


@pytest.mark.asyncio
async def test_persist_content_metrics_idempotency(content_service, test_db_session: AsyncSession):
    # Prepare dummy result
    result = ContentAnalysisResult(
        question_type=QuestionType.TECHNICAL,
        relevance_score=90.0,
        technical_depth_score=85.0,
        completeness_score=88.0,
        structure_score=85.0,
        evidence_score=86.0,
        overall_content_score=86.8,
        strengths=["Great technical clarity"],
        weaknesses=["None noted"],
        claims=[],
        evidence=[],
        feedback=[],
        practice_drills=[],
        reasoning_summary="Excellent answer",
    )

    answer_id = uuid4()

    # Need dummy Answer record in SQLite fixture
    from app.models.answer import Answer
    from app.models.interview import Interview
    from app.models.question import Question

    interview = Interview(title="Test Interview", status="running")
    test_db_session.add(interview)
    await test_db_session.flush()

    question = Question(
        interview_id=interview.id,
        sequence_number=1,
        category="technical",
        question_type="technical",
        competency="Algorithms",
        difficulty="medium",
        question_text="Test question?",
    )
    test_db_session.add(question)
    await test_db_session.flush()

    answer = Answer(
        id=answer_id,
        interview_id=interview.id,
        question_id=question.id,
        sequence_number=1,
        status="transcribed",
    )
    test_db_session.add(answer)
    await test_db_session.commit()

    # 1. First persist
    cm1 = await content_service.persist_content_metrics(
        db=test_db_session,
        answer_id=answer_id,
        result=result,
    )
    assert cm1.id is not None
    assert cm1.relevance_score == 90.0

    # 2. Second persist (update idempotency)
    result.relevance_score = 95.0
    cm2 = await content_service.persist_content_metrics(
        db=test_db_session,
        answer_id=answer_id,
        result=result,
    )
    assert cm2.id == cm1.id
    assert cm2.relevance_score == 95.0
