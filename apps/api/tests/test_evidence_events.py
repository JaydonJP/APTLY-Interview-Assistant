"""
Unit & Contract Tests for the Universal Evidence Event System.

Tests cover:
- Serialization & Deserialization
- Validation (timestamps, severity bounds, reliability bounds)
- Timestamp Ordering
- Turn Ownership & Session Association
- Event Type Validation (12 standardized types)
- Source Validation (4 standardized sources)
- Report Traceability Guarantee (every habit linked to evidence events)
"""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.evidence import (
    EvidenceEvent,
    EvidenceEventType,
    EvidenceSource,
)
from app.services.interview_service import InterviewService

# ── 1. Event Type & Source Enums ──────────────────────────────────────────────


def test_all_twelve_evidence_event_types():
    """Verify all 12 specified EvidenceEventType variants exist and validate."""
    expected_types = [
        "filler",
        "pause",
        "pace_shift",
        "camera_attention",
        "voice_energy",
        "unsupported_claim",
        "star_gap",
        "ownership_gap",
        "consistency_issue",
        "strong_evidence",
        "challenge",
        "pressure_event",
    ]

    for type_str in expected_types:
        evt = EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=type_str,
            start_ms=1000,
            end_ms=2500,
            severity=3,
            reliability=0.95,
            title=f"Test {type_str}",
            explanation=f"Explanation for {type_str}",
            source=EvidenceSource.MEASURED,
        )
        assert evt.type == type_str


def test_invalid_event_type_raises_validation_error():
    """Verify that unsupported event types are rejected."""
    with pytest.raises(ValidationError):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type="invalid_custom_type",
            start_ms=0,
            end_ms=1000,
            title="Invalid",
            explanation="Invalid type",
        )


def test_all_four_evidence_sources():
    """Verify all 4 specified EvidenceSource variants exist and validate."""
    expected_sources = ["MEASURED", "DERIVED", "AI_EVALUATED", "UNAVAILABLE"]

    for src_str in expected_sources:
        evt = EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.FILLER,
            start_ms=0,
            end_ms=500,
            title="Source test",
            explanation="Testing source",
            source=src_str,
        )
        assert evt.source == src_str


def test_invalid_evidence_source_raises_validation_error():
    """Verify that unsupported evidence sources are rejected."""
    with pytest.raises(ValidationError):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.FILLER,
            start_ms=0,
            end_ms=500,
            title="Source test",
            explanation="Testing source",
            source="GUESSWORK",
        )


# ── 2. Validation & Boundary Constraints ──────────────────────────────────────


def test_timestamp_range_validation():
    """Verify start_ms <= end_ms constraint is strictly enforced."""
    # Valid: start_ms == end_ms (instantaneous event / point anchor)
    evt = EvidenceEvent(
        session_id="sess-123",
        turn_id="turn-456",
        type=EvidenceEventType.FILLER,
        start_ms=1500,
        end_ms=1500,
        title="Point anchor",
        explanation="Valid point event",
    )
    assert evt.start_ms == 1500
    assert evt.end_ms == 1500

    # Valid: start_ms < end_ms
    evt2 = EvidenceEvent(
        session_id="sess-123",
        turn_id="turn-456",
        type=EvidenceEventType.PAUSE,
        start_ms=1500,
        end_ms=3000,
        title="Duration event",
        explanation="Valid duration event",
    )
    assert evt2.end_ms > evt2.start_ms

    # Invalid: end_ms < start_ms
    with pytest.raises(ValidationError, match="cannot be less than start_ms"):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.FILLER,
            start_ms=3000,
            end_ms=1500,
            title="Backwards time",
            explanation="Should fail",
        )


def test_negative_timestamp_raises_validation_error():
    """Verify negative timestamps are rejected."""
    with pytest.raises(ValidationError):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.FILLER,
            start_ms=-100,
            end_ms=500,
            title="Negative start",
            explanation="Should fail",
        )


def test_severity_bounds_validation():
    """Verify severity must be between 1 and 5 inclusive."""
    for valid_severity in [1, 2, 3, 4, 5]:
        evt = EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.STAR_GAP,
            start_ms=0,
            end_ms=1000,
            severity=valid_severity,
            title=f"Severity {valid_severity}",
            explanation="Valid severity",
        )
        assert evt.severity == valid_severity

    # Invalid: 0
    with pytest.raises(ValidationError):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.STAR_GAP,
            start_ms=0,
            end_ms=1000,
            severity=0,
            title="Too low",
            explanation="Should fail",
        )

    # Invalid: 6
    with pytest.raises(ValidationError):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.STAR_GAP,
            start_ms=0,
            end_ms=1000,
            severity=6,
            title="Too high",
            explanation="Should fail",
        )


def test_reliability_bounds_validation():
    """Verify reliability must be between 0.0 and 1.0 inclusive."""
    for valid_rel in [0.0, 0.5, 0.99, 1.0]:
        evt = EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.CAMERA_ATTENTION,
            start_ms=0,
            end_ms=1000,
            reliability=valid_rel,
            title="Reliability test",
            explanation="Valid reliability",
            source=EvidenceSource.MEASURED,
        )
        assert evt.reliability == valid_rel

    # Invalid: -0.1
    with pytest.raises(ValidationError):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.CAMERA_ATTENTION,
            start_ms=0,
            end_ms=1000,
            reliability=-0.1,
            title="Negative reliability",
            explanation="Should fail",
        )

    # Invalid: 1.05
    with pytest.raises(ValidationError):
        EvidenceEvent(
            session_id="sess-123",
            turn_id="turn-456",
            type=EvidenceEventType.CAMERA_ATTENTION,
            start_ms=0,
            end_ms=1000,
            reliability=1.05,
            title="Over 1.0 reliability",
            explanation="Should fail",
        )


# ── 3. Serialization & Backward Compatibility ─────────────────────────────────


def test_evidence_event_serialization_and_deserialization():
    """Verify complete JSON round-trip and dictionary export."""
    original = EvidenceEvent(
        id="evt-custom-001",
        session_id="session-uuid-123",
        turn_id="turn-uuid-456",
        type=EvidenceEventType.UNSUPPORTED_CLAIM,
        start_ms=12300,
        end_ms=15800,
        severity=5,
        reliability=0.92,
        title="Substantiate measurable claim",
        explanation="Claim lacked baseline metric or validation.",
        payload={
            "claim": "Increased throughput by 500%",
            "support_status": "UNSUPPORTED",
            "quote": "Increased throughput by 500%",
        },
        source=EvidenceSource.AI_EVALUATED,
    )

    data = original.model_dump()
    assert data["id"] == "evt-custom-001"
    assert data["session_id"] == "session-uuid-123"
    assert data["turn_id"] == "turn-uuid-456"
    assert data["type"] == "unsupported_claim"
    assert data["start_ms"] == 12300
    assert data["end_ms"] == 15800
    assert data["severity"] == 5
    assert data["reliability"] == 0.92
    assert data["source"] == "AI_EVALUATED"
    assert data["payload"]["claim"] == "Increased throughput by 500%"

    # JSON round trip
    json_str = original.model_dump_json()
    reconstructed = EvidenceEvent.model_validate_json(json_str)
    assert reconstructed.id == original.id
    assert reconstructed.start_ms == original.start_ms
    assert reconstructed.payload == original.payload


def test_backward_compatibility_properties():
    """Verify convenience accessor properties for seconds, description, and quote."""
    evt = EvidenceEvent(
        session_id="sess-1",
        turn_id="turn-1",
        type=EvidenceEventType.FILLER,
        start_ms=2500,
        end_ms=2800,
        title="Filler word",
        explanation="Filler word observed in transcript.",
        payload={"word": "um"},
    )

    assert evt.start_seconds == 2.5
    assert evt.end_seconds == 2.8
    assert evt.description == "Filler word observed in transcript."
    assert evt.quote == "um"


# ── 4. Timestamp Ordering & Turn Ownership ────────────────────────────────────


def test_timestamp_ordering():
    """Verify sorting evidence events chronologically by start_ms and end_ms."""
    e1 = EvidenceEvent(
        id="e1", session_id="s", turn_id="t", type=EvidenceEventType.FILLER,
        start_ms=5000, end_ms=5200, title="E1", explanation="E1"
    )
    e2 = EvidenceEvent(
        id="e2", session_id="s", turn_id="t", type=EvidenceEventType.PAUSE,
        start_ms=1000, end_ms=2500, title="E2", explanation="E2"
    )
    e3 = EvidenceEvent(
        id="e3", session_id="s", turn_id="t", type=EvidenceEventType.STRONG_EVIDENCE,
        start_ms=3000, end_ms=4500, title="E3", explanation="E3"
    )
    e4 = EvidenceEvent(
        id="e4", session_id="s", turn_id="t", type=EvidenceEventType.UNSUPPORTED_CLAIM,
        start_ms=1000, end_ms=1800, title="E4", explanation="E4"
    )

    unordered = [e1, e2, e3, e4]
    sorted_events = sorted(unordered, key=lambda e: (e.start_ms, e.end_ms))

    # Expected order: e4 (1000, 1800), e2 (1000, 2500), e3 (3000, 4500), e1 (5000, 5200)
    assert [e.id for e in sorted_events] == ["e4", "e2", "e3", "e1"]


def test_turn_ownership_and_session_scoping():
    """Verify events are correctly scoped by session_id and turn_id."""
    session_id = str(uuid4())
    turn_1 = str(uuid4())
    turn_2 = str(uuid4())

    evt_turn1 = EvidenceEvent(
        session_id=session_id,
        turn_id=turn_1,
        type=EvidenceEventType.FILLER,
        start_ms=1000,
        end_ms=1200,
        title="Turn 1 Filler",
        explanation="Turn 1",
    )
    evt_turn2 = EvidenceEvent(
        session_id=session_id,
        turn_id=turn_2,
        type=EvidenceEventType.STAR_GAP,
        start_ms=0,
        end_ms=30000,
        title="Turn 2 Gap",
        explanation="Turn 2",
    )

    assert evt_turn1.session_id == session_id
    assert evt_turn2.session_id == session_id
    assert evt_turn1.turn_id == turn_1
    assert evt_turn2.turn_id == turn_2
    assert evt_turn1.turn_id != evt_turn2.turn_id


# ── 5. Traceability Requirement: Every Insight Grounded in Evidence ───────────


def test_report_insights_traceable_to_evidence_events():
    """
    Verify Requirement:
    Every report habit/insight must be traceable to one or more evidence events.
    No evidence event means no evidence-backed claim.
    """
    session_id = str(uuid4())
    turn_id = str(uuid4())

    mock_questions_review = [
        {
            "question": {
                "id": turn_id,
                "sequence_number": 1,
                "competency": "System Design",
                "question_text": "How do you scale a distributed cache?",
            },
            "answer": {
                "id": turn_id,
                "duration_seconds": 45.0,
            },
            "speech_metrics": {
                "wpm": 115.0,
                "filler_count": 3,
                "filler_words": [
                    {"word": "um", "timestamp_seconds": 2.5, "duration_seconds": 0.3},
                    {"word": "like", "timestamp_seconds": 12.0, "duration_seconds": 0.2},
                    {"word": "uh", "timestamp_seconds": 25.0, "duration_seconds": 0.3},
                ],
                "pause_count": 1,
                "pauses": [
                    {"start_seconds": 18.0, "end_seconds": 21.5, "duration_seconds": 3.5},
                ],
            },
            "content_metrics": {
                "overall_content_score": 75.0,
                "relevance_score": 80.0,
                "technical_depth_score": 70.0,
                "strengths": ["Clear explanation of cache invalidation"],
                "weaknesses": ["Did not mention single-point-of-failure redundancy"],
                "claims": [
                    {
                        "claim": "Handled 10 million concurrent writes with 0 latency.",
                        "support_status": "UNSUPPORTED",
                        "start_seconds": 30.0,
                        "end_seconds": 34.0,
                    }
                ],
                "star_analysis": {
                    "missing_components": ["Result"],
                },
                "evidence": [
                    {
                        "id": "1",
                        "type": "STRENGTH",
                        "confidence": 0.90,
                        "start_seconds": 8.0,
                        "end_seconds": 15.0,
                        "text": "We used consistent hashing to distribute keys evenly.",
                    }
                ],
                "practice_drills": [
                    {
                        "title": "Redundancy drill",
                        "instructions": "State your failover cluster mechanism.",
                    }
                ],
            },
        }
    ]

    report = InterviewService._build_report_card(
        session_id=session_id,
        questions_review=mock_questions_review,
        average_content_score=75.0,
        average_wpm=115.0,
        total_duration_seconds=45.0,
        total_fillers=3,
        total_pauses=1,
    )

    evidence_events = report["evidence_events"]
    top_habits = report["top_habits"]

    # 1. Evidence events must be generated
    assert len(evidence_events) > 0

    event_ids = {e["id"] for e in evidence_events}

    # 2. Every habit must have non-empty evidence_event_ids
    assert len(top_habits) > 0
    for habit in top_habits:
        assert "evidence_event_ids" in habit, f"Habit '{habit['title']}' lacks evidence_event_ids"
        assert len(habit["evidence_event_ids"]) > 0, f"Habit '{habit['title']}' has empty evidence_event_ids"

        # 3. Every linked ID must correspond to an actual EvidenceEvent
        for linked_id in habit["evidence_event_ids"]:
            assert linked_id in event_ids, f"Linked event ID '{linked_id}' not found in report evidence_events"

    # 4. Verify specific event types are present and correctly attributed
    event_types = {e["type"] for e in evidence_events}
    assert "filler" in event_types
    assert "pause" in event_types
    assert "pace_shift" in event_types
    assert "unsupported_claim" in event_types
    assert "star_gap" in event_types
    assert "strong_evidence" in event_types
    assert "ownership_gap" in event_types
