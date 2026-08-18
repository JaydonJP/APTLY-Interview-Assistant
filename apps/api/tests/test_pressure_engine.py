"""
Unit and Integration Tests for Pressure-Aware Adaptive Interviewer.

Tests cover:
- 6 Pressure Levels (1 Warmup to 6 Pressure Test)
- 8 Pressure Actions
- Strong candidate increases difficulty (Level escalation)
- Weak candidate receives structured recovery (Level de-escalation)
- Acceptance: Two candidates receive different next questions based on performance
- Non-hostile, professional guardrails
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.content_metrics import ContentMetrics
from app.models.metrics import SpeechMetrics
from app.models.question import Question
from app.schemas.pressure_engine import (
    PressureAction,
    PressureLevel,
)
from app.services.adaptive_interview.engine import GeminiAdaptiveEngine
from app.services.adaptive_interview.pressure_engine import (
    LEVEL_DIRECTIVES,
    PressureEngineService,
)
from app.services.providers.mock_llm import MockLLMProvider

# ── 1. Levels and Actions Catalog Validation ─────────────────────────────────


def test_all_six_levels_and_eight_actions():
    """Verify all 6 pressure levels and 8 interview actions."""
    expected_levels = [
        PressureLevel.WARMUP,
        PressureLevel.CLARIFICATION,
        PressureLevel.EVIDENCE_CHALLENGE,
        PressureLevel.TECHNICAL_CHALLENGE,
        PressureLevel.EDGE_CASE,
        PressureLevel.PRESSURE_TEST,
    ]
    for lvl in expected_levels:
        assert lvl in LEVEL_DIRECTIVES
        assert len(LEVEL_DIRECTIVES[lvl]) > 10

    expected_actions = [
        PressureAction.CHALLENGE,
        PressureAction.CLARIFY,
        PressureAction.PROBE,
        PressureAction.TRADEOFF,
        PressureAction.EDGE_CASE,
        PressureAction.CONTRADICTION,
        PressureAction.RECOVER,
        PressureAction.ADVANCE,
    ]
    for act in expected_actions:
        assert isinstance(act.value, str)


# ── 2. Strong Candidate Increases Difficulty ──────────────────────────────────


def test_strong_candidate_increases_difficulty():
    """
    Test Case Requirement:
    Strong answer -> increase challenge level.
    """
    service = PressureEngineService()

    strong_content = ContentMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        overall_content_score=92.0,
        relevance_score=90.0,
        technical_depth_score=94.0,
        structure_score=90.0,
        evidence_score=90.0,
        claims_json=[],
        star_analysis_json={},
        evidence_json=[],
        strengths_json=[],
        weaknesses_json=[],
        feedback_json=[],
        practice_drills_json=[],
    )

    # Escalation from Level 1 to Level 2
    decision_1 = service.evaluate_pressure(
        current_level=PressureLevel.WARMUP,
        content_metrics=strong_content,
        transcript="Detailed technical answer explaining PostgreSQL replication architecture.",
    )
    assert decision_1.next_level == PressureLevel.CLARIFICATION
    assert decision_1.level_delta == 1

    # Escalation from Level 4 to Level 5 (Edge Case)
    decision_4 = service.evaluate_pressure(
        current_level=PressureLevel.TECHNICAL_CHALLENGE,
        content_metrics=strong_content,
        transcript="Comprehensive breakdown of distributed transaction locks and 2PC protocols.",
    )
    assert decision_4.next_level == PressureLevel.EDGE_CASE
    assert decision_4.action == PressureAction.EDGE_CASE
    assert decision_4.level_delta == 1

    # Escalation from Level 5 to Level 6 (Pressure Test)
    decision_5 = service.evaluate_pressure(
        current_level=PressureLevel.EDGE_CASE,
        content_metrics=strong_content,
        transcript="Rock-solid failure mode analysis under network partition.",
    )
    assert decision_5.next_level == PressureLevel.PRESSURE_TEST
    assert decision_5.action == PressureAction.TRADEOFF


# ── 3. Weak Candidate Gets Recovery ───────────────────────────────────────────


def test_weak_candidate_gets_recovery():
    """
    Test Case Requirement:
    Weak answer -> clarify / recover without hostility.
    """
    service = PressureEngineService()

    weak_content = ContentMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        overall_content_score=45.0,
        relevance_score=50.0,
        technical_depth_score=40.0,
        structure_score=45.0,
        evidence_score=40.0,
        claims_json=[],
        star_analysis_json={},
        evidence_json=[],
        strengths_json=[],
        weaknesses_json=[],
        feedback_json=[],
        practice_drills_json=[],
    )

    speech_distress = SpeechMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        speaking_duration_seconds=35.0,
        total_words=40,
        wpm=90.0,
        filler_count=10,
        filler_words_json=[],
        pause_count=5,
        pauses_json=[],
    )

    decision = service.evaluate_pressure(
        current_level=PressureLevel.TECHNICAL_CHALLENGE,
        content_metrics=weak_content,
        speech_metrics=speech_distress,
        transcript="Um, like, we used, you know, some database stuff.",
    )

    assert decision.next_level == PressureLevel.EVIDENCE_CHALLENGE  # De-escalates from 4 to 3
    assert decision.action == PressureAction.RECOVER
    assert decision.level_delta == -1
    assert "recovery" in decision.justification.lower()
    assert "abuse" not in decision.justification.lower()


# ── 4. Acceptance: Two Candidates Receive Different Next Questions ────────────


@pytest.mark.asyncio
async def test_two_candidates_receive_different_next_questions():
    """
    Acceptance Requirement:
    Two candidates receive different next questions based on their actual performance.
    """
    provider = MockLLMProvider()
    engine = GeminiAdaptiveEngine(llm_provider=provider)

    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    interview_id = uuid4()

    q = Question(
        id=uuid4(),
        interview_id=interview_id,
        sequence_number=3,
        category="technical",
        competency="Distributed Systems",
        question_text="How did you handle cache invalidation?",
        difficulty="4",
        follow_up_depth=1,
    )

    # Candidate A: Strong Performance
    strong_metrics = ContentMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        overall_content_score=92.0,
        relevance_score=90.0,
        technical_depth_score=92.0,
        structure_score=90.0,
        evidence_score=90.0,
        claims_json=[],
        star_analysis_json={},
        evidence_json=[],
        strengths_json=[],
        weaknesses_json=[],
        feedback_json=[],
        practice_drills_json=[],
    )
    followup_strong = await engine.maybe_generate_followup(
        db=mock_db,
        parent_question=q,
        candidate_transcript="We implemented cache-aside with TTL and CDC via Debezium Kafka streams.",
        content_metrics=strong_metrics,
    )

    # Candidate B: Weak Performance
    weak_metrics = ContentMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        overall_content_score=40.0,
        relevance_score=40.0,
        technical_depth_score=35.0,
        structure_score=40.0,
        evidence_score=30.0,
        claims_json=[],
        star_analysis_json={},
        evidence_json=[],
        strengths_json=[],
        weaknesses_json=[],
        feedback_json=[],
        practice_drills_json=[],
    )
    followup_weak = await engine.maybe_generate_followup(
        db=mock_db,
        parent_question=q,
        candidate_transcript="I don't know, we just restarted the cache when things broke.",
        content_metrics=weak_metrics,
    )

    assert followup_strong is not None
    assert followup_weak is not None

    # Candidate A gets escalated to Edge Case (Level 5)
    assert followup_strong.difficulty == "5"
    assert "network partition" in followup_strong.question_text.lower() or "10x" in followup_strong.question_text

    # Candidate B gets de-escalated to Recovery (Level 3)
    assert followup_weak.difficulty == "3"
    assert "step back" in followup_weak.question_text.lower() or "foundational" in followup_weak.question_text.lower()

    # The two candidates must receive distinctly different questions
    assert followup_strong.question_text != followup_weak.question_text
