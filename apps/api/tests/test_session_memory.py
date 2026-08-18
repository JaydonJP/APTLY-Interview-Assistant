"""
Unit & Integration Tests for Session-Level Interview Memory and Consistency Engine.

Tests cover:
- Claim persistence
- Technology persistence across turns
- Metric persistence
- Contradiction detection (e.g. PostgreSQL in Turn 1 vs MongoDB in Turn 4)
- Memory retrieval (selective filtering without dumping entire session)
- Follow-up generation referencing earlier session memory
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.content_metrics import ContentMetrics
from app.models.memory import SessionMemory
from app.models.question import Question
from app.schemas.memory import MemoryType
from app.services.adaptive_interview.engine import GeminiAdaptiveEngine
from app.services.providers.mock_llm import MockLLMProvider
from app.services.session_memory.service import SessionMemoryService

# ── 1. Technology Persistence ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_technology_persistence_across_turns():
    """Verify extracting and persisting technologies mentioned by candidate."""
    service = SessionMemoryService()
    interview_id = str(uuid4())
    question_id = str(uuid4())

    # Turn 1: Candidate mentions PostgreSQL
    turn1_transcript = "We used PostgreSQL for our relational database store."
    memories_turn1 = service.extract_memories(
        interview_id=interview_id,
        question_id=question_id,
        turn_number=1,
        transcript=turn1_transcript,
    )

    tech_memories = [m for m in memories_turn1 if m.memory_type == MemoryType.TECHNOLOGIES]
    assert len(tech_memories) >= 1
    assert tech_memories[0].entity_key == "PostgreSQL"
    assert "PostgreSQL" in tech_memories[0].quote


# ── 2. Metric Persistence ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_metric_persistence():
    """Verify extracting and tracking metrics mentioned in answers."""
    service = SessionMemoryService()
    interview_id = str(uuid4())

    transcript = "We scaled the service to 25000 rps and reduced latency to 45ms."
    memories = service.extract_memories(
        interview_id=interview_id,
        question_id=None,
        turn_number=2,
        transcript=transcript,
    )

    metric_memories = [m for m in memories if m.memory_type == MemoryType.METRICS]
    assert len(metric_memories) >= 1
    keys = [m.entity_key for m in metric_memories]
    assert any("45ms" in k or "25000" in k for k in keys)


# ── 3. Claim Persistence ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_claim_persistence():
    """Verify extracting and persisting factual / performance claims."""
    service = SessionMemoryService()
    interview_id = str(uuid4())

    mock_metrics = ContentMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        overall_content_score=85.0,
        relevance_score=85.0,
        technical_depth_score=80.0,
        structure_score=85.0,
        evidence_score=80.0,
        claims_json=[
            {
                "claim": "Implemented sharding across 8 database nodes.",
                "support_status": "PARTIALLY_SUPPORTED",
                "evidence_quote": "We sharded the database across 8 nodes.",
            }
        ],
        star_analysis_json={},
        evidence_json=[],
        strengths_json=[],
        weaknesses_json=[],
        feedback_json=[],
        practice_drills_json=[],
    )

    memories = service.extract_memories(
        interview_id=interview_id,
        question_id=None,
        turn_number=3,
        transcript="We sharded the database across 8 nodes to distribute I/O load.",
        content_metrics=mock_metrics,
    )

    claim_memories = [m for m in memories if m.memory_type == MemoryType.CLAIMS]
    assert len(claim_memories) >= 1
    assert "sharding" in claim_memories[0].entity_value.lower()


# ── 4. Contradiction Detection & Non-Accusatory Probe ──────────────────────────


def test_contradiction_detection_between_turns():
    """
    Consistency Engine Requirement:
    Turn 1: "We used PostgreSQL."
    Turn 4: "We used MongoDB for persistence."
    Expected:
    - Detect conflict
    - Non-accusatory probe:
      "Earlier you mentioned PostgreSQL and now you're describing MongoDB. How were the two used?"
    """
    service = SessionMemoryService()
    interview_id = str(uuid4())

    # Historical Turn 1 Memory
    memories_turn1 = service.extract_memories(
        interview_id=interview_id,
        question_id=str(uuid4()),
        turn_number=1,
        transcript="We used PostgreSQL for our relational database.",
    )

    # Current Turn 4 Memory
    memories_turn4 = service.extract_memories(
        interview_id=interview_id,
        question_id=str(uuid4()),
        turn_number=4,
        transcript="We used MongoDB for persistence and data storage.",
    )

    contradictions = service.detect_contradictions(
        current_memories=memories_turn4,
        historical_memories=memories_turn1,
    )

    assert len(contradictions) >= 1
    contra = contradictions[0]
    assert "PostgreSQL" in contra.entity_key
    assert "MongoDB" in contra.entity_key

    # Check non-accusatory probe wording
    probe = contra.suggested_probe
    assert "Earlier you mentioned PostgreSQL and now you're describing MongoDB" in probe
    assert "How were the two used" in probe
    assert not any(w in probe.lower().split() for w in ["lie", "lied", "liar", "fake", "dishonest"])


# ── 5. Selective Memory Retrieval (No Vector DB Dump) ─────────────────────────


@pytest.mark.asyncio
async def test_selective_memory_retrieval():
    """Verify retrieving only contextually relevant memories without dumping entire session."""
    service = SessionMemoryService()
    interview_id = uuid4()

    mock_db = AsyncMock()

    # Setup mock historical memories
    m1 = SessionMemory(
        id=uuid4(),
        interview_id=interview_id,
        turn_number=1,
        memory_type="technologies",
        entity_key="PostgreSQL",
        entity_value="Used PostgreSQL for relational data",
        quote="We used PostgreSQL",
        confidence=0.98,
        metadata_json={},
    )
    m2 = SessionMemory(
        id=uuid4(),
        interview_id=interview_id,
        turn_number=2,
        memory_type="technologies",
        entity_key="Redis",
        entity_value="Used Redis for session caching",
        quote="Added Redis caching",
        confidence=0.98,
        metadata_json={},
    )
    m3 = SessionMemory(
        id=uuid4(),
        interview_id=interview_id,
        turn_number=3,
        memory_type="technologies",
        entity_key="Kubernetes",
        entity_value="Deployed microservices on Kubernetes",
        quote="Deployed on K8s",
        confidence=0.95,
        metadata_json={},
    )

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [m1, m2, m3]
    mock_db.execute.return_value = mock_result

    # Query with topic keyword 'Redis'
    retrieved = await service.get_relevant_memories(
        db=mock_db,
        interview_id=interview_id,
        current_transcript="We had cache invalidation issues with Redis.",
        limit=2,
    )

    assert len(retrieved) <= 2
    assert retrieved[0].entity_key == "Redis"

    # Check prompt serialization
    formatted_prompt = service.format_memory_for_prompt(retrieved)
    assert "Redis" in formatted_prompt
    assert "Turn 2" in formatted_prompt


# ── 6. Follow-up Generation Grounded in Session Memory ────────────────────────


@pytest.mark.asyncio
async def test_followup_generation_grounded_in_session_memory():
    """Verify later interview questions meaningfully reference earlier statements and contradictions."""
    provider = MockLLMProvider()
    service = SessionMemoryService()
    engine = GeminiAdaptiveEngine(llm_provider=provider, memory_service=service)

    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    interview_id = uuid4()

    # Historical turn 1 memory in DB
    m1 = SessionMemory(
        id=uuid4(),
        interview_id=interview_id,
        turn_number=1,
        memory_type="technologies",
        entity_key="PostgreSQL",
        entity_value="Used PostgreSQL",
        quote="We used PostgreSQL",
        confidence=0.98,
        metadata_json={},
    )
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [m1]
    mock_db.execute.return_value = mock_result

    # Turn 4 candidate statement introducing MongoDB
    q4 = Question(
        id=uuid4(),
        interview_id=interview_id,
        sequence_number=4,
        category="technical",
        competency="Database Architecture",
        question_text="How did you structure your persistence layer?",
        follow_up_depth=0,
    )

    transcript4 = "We used MongoDB for persistence and storing our core user records."

    followup = await engine.maybe_generate_followup(
        db=mock_db,
        parent_question=q4,
        candidate_transcript=transcript4,
        content_metrics=None,
    )

    assert followup is not None
    assert followup.question_type == "follow_up"
    # Follow-up must detect the relationship between PostgreSQL and MongoDB
    assert "PostgreSQL" in followup.question_text
    assert "MongoDB" in followup.question_text
    assert "Earlier you mentioned PostgreSQL and now you're describing MongoDB" in followup.question_text
