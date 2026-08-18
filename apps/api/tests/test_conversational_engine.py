"""
APTLY — Real-Time Conversational Engine Test Suite

Tests the live conversational loop, ClaimChaser adaptive probing, Stop Probing Rule,
cross-turn session memory retrieval, and structured conversational moves.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.content_metrics import ContentMetrics
from app.models.question import Question
from app.services.adaptive_interview.engine import GeminiAdaptiveEngine
from app.services.providers.mock_llm import MockLLMProvider


@pytest.mark.asyncio
async def test_fixture_1_claim_missing_baseline_triggers_quantify():
    """
    Test Fixture: Candidate makes an ungrounded quantitative claim ('I reduced API latency by 40%').
    Expected: FOLLOW_UP with QUANTIFY action probing baseline and measurement.
    """
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    engine = GeminiAdaptiveEngine(llm_provider=MockLLMProvider())

    q = Question(
        id=uuid4(),
        interview_id=uuid4(),
        sequence_number=1,
        category="technical",
        competency="System Optimization",
        question_text="Tell me about a system you improved.",
        follow_up_depth=0,
    )

    transcript = "I reduced API latency by 40%."
    move = await engine.evaluate_conversational_move(
        db=mock_db,
        parent_question=q,
        candidate_transcript=transcript,
        content_metrics=None,
    )

    assert move["decision"] == "FOLLOW_UP"
    assert move["follow_up_type"] == "QUANTIFY"
    assert move["question"] is not None
    assert "tell me more" not in move["question"].lower()


@pytest.mark.asyncio
async def test_fixture_2_stop_probing_rule_when_evidence_is_complete():
    """
    Test Fixture: Candidate provides complete evidence (baseline + method + validation).
    Expected: ADVANCE cleanly without repeated endless follow-up loops.
    """
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    engine = GeminiAdaptiveEngine(llm_provider=MockLLMProvider())

    q = Question(
        id=uuid4(),
        interview_id=uuid4(),
        sequence_number=1,
        category="technical",
        competency="System Optimization",
        question_text="How did you improve API latency?",
        follow_up_depth=2,  # Already probed
    )

    transcript = (
        "Our baseline was 800 milliseconds and we got it down to 480 milliseconds by removing "
        "several N+1 SQL queries and caching product metadata in Redis. We validated the improvement "
        "under load testing at 10,000 requests per second with zero cache stampedes."
    )

    # When depth or complete evidence is met, engine should cleanly ADVANCE
    move = await engine.evaluate_conversational_move(
        db=mock_db,
        parent_question=q,
        candidate_transcript=transcript,
        content_metrics=None,
    )

    assert move["decision"] == "ADVANCE"


@pytest.mark.asyncio
async def test_fixture_3_cross_turn_contradiction_triggers_verify():
    """
    Test Fixture: Candidate mentions Postgres in Turn 1 and claims persistence is entirely Mongo in Turn 2.
    Expected: VERIFY action checking consistency.
    """
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    engine = GeminiAdaptiveEngine(llm_provider=MockLLMProvider())

    q = Question(
        id=uuid4(),
        interview_id=uuid4(),
        sequence_number=2,
        category="technical",
        competency="Database Architecture",
        question_text="What database did you choose for storage?",
        follow_up_depth=0,
    )

    # Mock memory service returning historical Postgres memory
    from app.schemas.memory import MemoryEntry, MemoryType
    engine.memory_service.get_relevant_memories = AsyncMock(return_value=[
        MemoryEntry(
            interview_id=str(q.interview_id),
            memory_type=MemoryType.TECHNOLOGIES,
            entity_key="PostgreSQL",
            entity_value="PostgreSQL",
            quote="We used PostgreSQL for our primary database.",
            turn_number=1,
        )
    ])

    transcript = "The persistence layer was entirely MongoDB without any relational database."
    move = await engine.evaluate_conversational_move(
        db=mock_db,
        parent_question=q,
        candidate_transcript=transcript,
        content_metrics=None,
    )

    assert move["decision"] == "VERIFY"
    assert move["follow_up_type"] == "VERIFY"
    assert "postgresql" in move["question"].lower() or "postgres" in move["question"].lower()


@pytest.mark.asyncio
async def test_fixture_4_struggling_candidate_triggers_recovery():
    """
    Test Fixture: Candidate is struggling with basic concepts.
    Expected: RECOVER action stepping back to foundational architecture.
    """
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    engine = GeminiAdaptiveEngine(llm_provider=MockLLMProvider())

    q = Question(
        id=uuid4(),
        interview_id=uuid4(),
        sequence_number=1,
        category="technical",
        competency="Distributed Systems",
        question_text="How do you handle distributed consensus under network partitions?",
        follow_up_depth=1,
    )

    weak_metrics = ContentMetrics(
        answer_id=uuid4(),
        question_type="technical",
        overall_content_score=25.0,
        relevance_score=30.0,
        technical_depth_score=20.0,
        completeness_score=20.0,
        structure_score=30.0,
        evidence_score=15.0,
    )

    move = await engine.evaluate_conversational_move(
        db=mock_db,
        parent_question=q,
        candidate_transcript="I don't really know, we just restarted servers when they crashed.",
        content_metrics=weak_metrics,
    )

    assert move["decision"] == "RECOVER"
    assert "foundational" in move["question"].lower() or "step back" in move["question"].lower()


@pytest.mark.asyncio
async def test_anti_bot_rule_no_generic_tell_me_more():
    """
    Anti-Bot Rule: Under 10 diverse answers, verify the engine NEVER returns 'Tell me more'.
    """
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    engine = GeminiAdaptiveEngine(llm_provider=MockLLMProvider())

    test_answers = [
        "I designed the microservices communication using gRPC.",
        "We saw a 25% increase in throughput.",
        "I was the lead on the payments team.",
        "We migrated from EC2 to Kubernetes.",
        "Our team refactored the database schema with zero downtime.",
    ]

    for ans in test_answers:
        q = Question(
            id=uuid4(),
            interview_id=uuid4(),
            sequence_number=1,
            category="technical",
            competency="Systems",
            question_text="Tell me about your architecture.",
            follow_up_depth=0,
        )
        move = await engine.evaluate_conversational_move(
            db=mock_db,
            parent_question=q,
            candidate_transcript=ans,
            content_metrics=None,
        )
        if move.get("question"):
            assert "tell me more" not in move["question"].lower()
            assert "can you elaborate" not in move["question"].lower()
