"""
Tests for Observable Computer Vision Behavior Analysis Service and Endpoints.
"""

from __future__ import annotations

import pytest

from app.models.interview import Interview
from app.models.question import Question


@pytest.mark.asyncio
async def test_submit_and_get_behavior_events(test_db_session, client):
    """Verify behavior event persistence and visual delivery aggregation."""
    # Create test interview and question
    interview = Interview(
        title="Test Computer Vision Interview",
        status="running",
        difficulty_level="medium",
        target_duration_minutes=10,
    )
    test_db_session.add(interview)
    await test_db_session.flush()

    question = Question(
        interview_id=interview.id,
        sequence_number=1,
        question_text="How do you design a high throughput event stream in Python?",
        competency="Distributed Systems",
    )
    test_db_session.add(question)
    await test_db_session.commit()
    await test_db_session.refresh(interview)
    await test_db_session.refresh(question)

    # Submit observable behavior events
    payload = {
        "events": [
            {
                "event_type": "LOOK_AWAY",
                "start_ms": 12000,
                "end_ms": 15200,
                "duration_ms": 3200,
                "confidence": 0.96,
                "value": 0.35,
                "metadata": {"yaw": -0.32, "pitch": 0.12},
                "question_id": str(question.id),
            },
            {
                "event_type": "MOVEMENT_SPIKE",
                "start_ms": 22000,
                "end_ms": 24500,
                "duration_ms": 2500,
                "confidence": 0.92,
                "value": 0.48,
                "metadata": {"variance": 2.1},
                "question_id": str(question.id),
            },
            {
                "event_type": "FRAMING_GOOD",
                "start_ms": 0,
                "end_ms": 30000,
                "duration_ms": 30000,
                "confidence": 0.98,
                "metadata": {"framing": "CENTERED"},
                "question_id": str(question.id),
            },
        ],
        "question_id": str(question.id),
        "duration_seconds": 30.0,
    }

    post_res = await client.post(f"/api/v1/interviews/{interview.id}/behavior", json=payload)
    assert post_res.status_code == 200
    saved_events = post_res.json()
    assert len(saved_events) == 3
    assert saved_events[0]["event_type"] == "LOOK_AWAY"
    assert saved_events[0]["duration_ms"] == 3200

    # Retrieve summary scorecard
    get_res = await client.get(f"/api/v1/interviews/{interview.id}/behavior")
    assert get_res.status_code == 200
    summary = get_res.json()

    assert "on_camera_presence_score" in summary
    assert summary["camera_attention_estimate"] > 0
    assert summary["framing_consistency_score"] > 0
    assert summary["look_away_count"] == 1
    assert summary["movement_spike_count"] == 1
    assert len(summary["top_habits"]) >= 1
    assert "recommended_drill" in summary["top_habits"][0]
