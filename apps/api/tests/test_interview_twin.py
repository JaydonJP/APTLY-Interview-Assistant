"""
Unit and Integration Tests for Persistent Interview Twin.

Tests cover:
- Insufficient data handling when < 2 completed sessions ("Not enough data yet.")
- Longitudinal progression across multiple real sessions (Session 1, Session 2, Session 3)
- Second interview question generation informed by first interview weaknesses
- Recurring evidence debt aggregation
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.answer import Answer
from app.models.content_metrics import ContentMetrics
from app.models.interview import Interview
from app.models.job import RoleProfile
from app.models.metrics import SpeechMetrics
from app.models.question import Question
from app.models.transcript import Transcript
from app.schemas.interview_twin import InterviewTwinProfile
from app.services.interview_twin_service import InterviewTwinService
from app.services.providers.mock_llm import MockLLMProvider
from app.services.question_generator import QuestionGeneratorService

# ── 1. Insufficient Data Guard ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_twin_insufficient_data_with_zero_or_one_session():
    """Verify that fewer than 2 completed sessions yields an explicit insufficient data state."""
    service = InterviewTwinService()

    # Case A: 0 sessions
    empty_db = AsyncMock()
    empty_result = MagicMock()
    empty_result.scalars.return_value.all.return_value = []
    empty_db.execute = AsyncMock(return_value=empty_result)

    twin_0 = await service.get_twin_profile(empty_db)
    assert twin_0.total_completed_sessions == 0
    assert twin_0.has_sufficient_data is False
    assert "Not enough data yet" in twin_0.status_message

    # Case B: 1 session
    interview_1 = Interview(
        id=uuid4(),
        title="Frontend System Design",
        status="completed",
        interview_type="technical",
        difficulty_level="medium",
        target_duration_minutes=30,
        current_question_index=1,
        created_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
    )
    interview_1.questions = []
    interview_1.answers = []

    db_1 = AsyncMock()
    res_1 = MagicMock()
    res_1.scalars.return_value.all.return_value = [interview_1]
    db_1.execute = AsyncMock(return_value=res_1)

    twin_1 = await service.get_twin_profile(db_1)
    assert twin_1.total_completed_sessions == 1
    assert twin_1.has_sufficient_data is False
    assert len(twin_1.session_history) == 1
    assert twin_1.session_history[0].session_number == 1


# ── 2. Real Session Longitudinal Aggregation ─────────────────────────────────


@pytest.mark.asyncio
async def test_twin_aggregates_multiple_real_sessions():
    """Verify that multiple actual completed sessions produce empirical progression curves."""
    service = InterviewTwinService()

    sessions = []
    for i in range(1, 4):
        interview = Interview(
            id=uuid4(),
            title=f"Backend Engineering Session {i}",
            status="completed",
            interview_type="technical",
            difficulty_level="medium",
            target_duration_minutes=30,
            current_question_index=1,
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )

        q = Question(
            id=uuid4(),
            interview_id=interview.id,
            sequence_number=1,
            category="technical",
            competency="Distributed Systems",
            question_text="How did you handle cache invalidation?",
        )

        ans = Answer(
            id=uuid4(),
            interview_id=interview.id,
            question_id=q.id,
            sequence_number=1,
            status="evaluated",
            duration_seconds=60.0,
        )

        cm = ContentMetrics(
            id=uuid4(),
            answer_id=ans.id,
            overall_content_score=70.0 + (i * 7.0),  # Session 1: 77, Session 2: 84, Session 3: 91
            relevance_score=80.0,
            technical_depth_score=75.0 + i * 5,
            structure_score=70.0 + i * 8,
            evidence_score=65.0 + i * 9,
            strengths_json=["Clear architectural decomposition", "Strong database query modeling"],
            weaknesses_json=["Validation explanation was weak and omitted benchmarks"],
            claims_json=[],
            star_analysis_json={},
            evidence_json=[],
            feedback_json=[],
            practice_drills_json=[],
        )

        speech = SpeechMetrics(
            id=uuid4(),
            answer_id=ans.id,
            speaking_duration_seconds=55.0,
            total_words=120,
            wpm=135.0,
            filler_count=8 - (i * 2),  # Fillers reducing: 6, 4, 2
            filler_words_json=[],
            pause_count=2,
            pauses_json=[],
        )

        trans = Transcript(
            id=uuid4(),
            answer_id=ans.id,
            full_text="We used PostgreSQL and Redis without load test benchmarks.",
            word_count=10,
        )

        ans.content_metrics = cm
        ans.speech_metrics = speech
        ans.transcript = trans

        interview.questions = [q]
        interview.answers = [ans]
        sessions.append(interview)

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = sessions
    mock_db.execute = AsyncMock(return_value=mock_res)

    twin = await service.get_twin_profile(mock_db)

    assert twin.total_completed_sessions == 3
    assert twin.has_sufficient_data is True
    assert len(twin.session_history) == 3
    assert twin.session_history[0].session_number == 1
    assert twin.session_history[1].session_number == 2
    assert twin.session_history[2].session_number == 3

    # Check that scores improve longitudinally without hallucinated values
    assert twin.session_history[0].content_score == 77.0
    assert twin.session_history[1].content_score == 84.0
    assert twin.session_history[2].content_score == 91.0

    # Check recurring weaknesses and evidence debt
    assert len(twin.recurring_weaknesses) > 0
    assert any("validation" in w.lower() for w in twin.recurring_weaknesses)


# ── 3. Next Interview Informed by Previous Weaknesses ─────────────────────────


@pytest.mark.asyncio
async def test_second_interview_informed_by_first_interview_weaknesses():
    """
    Acceptance Requirement:
    The second interview is meaningfully informed by the first interview.
    """
    provider = MockLLMProvider()
    generator = QuestionGeneratorService(llm_provider=provider)

    role_profile = RoleProfile(
        id=uuid4(),
        job_id=uuid4(),
        role_title="Senior Backend Engineer",
        seniority="Senior",
        domain="Platform Engineering",
        technical_skills=["Python", "PostgreSQL"],
        tools=["Docker", "Kafka"],
        responsibilities=["Design distributed systems"],
        behavioral_competencies=["Ownership"],
        interview_topics=["Architecture", "Performance"],
        preferred_experience=["Distributed databases"],
    )

    # Twin with historical validation weakness
    twin_profile = InterviewTwinProfile(
        total_completed_sessions=1,
        has_sufficient_data=False,
        recurring_weaknesses=["Validation explanation weak and lacked benchmarks"],
        next_interview_focus_areas=["Strengthen validation depth (Include benchmark results)"],
        recommended_question_types=["validation-heavy technical challenge"],
    )

    questions = await generator.generate_questions(
        interview_id=uuid4(),
        role_profile=role_profile,
        interview_type="technical",
        difficulty_level="medium",
        question_count=3,
        twin_profile=twin_profile,
    )

    assert len(questions) == 3

    # At least one question in the second interview must directly challenge the validation weakness
    validation_questions = [
        q for q in questions
        if "validate" in q.question_text.lower() or "benchmarking" in q.competency.lower()
    ]
    assert len(validation_questions) > 0
    assert "telemetry" in validation_questions[0].question_text.lower() or "benchmark" in validation_questions[0].question_text.lower()
