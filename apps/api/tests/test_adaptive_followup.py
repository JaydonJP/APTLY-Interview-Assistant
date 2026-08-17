"""
APTLY API — Unit Tests for Follow-Up Decision Engine & Adaptive Question Generation
"""

from __future__ import annotations

from uuid import uuid4

from app.models.content_metrics import ContentMetrics
from app.models.question import Question
from app.services.adaptive_interview.followup_decision import (
    FollowUpDecisionService,
    FollowUpReason,
)


def test_followup_decision_depth_guard() -> None:
    service = FollowUpDecisionService(max_followup_depth=2)
    q = Question(
        id=uuid4(),
        interview_id=uuid4(),
        question_text="Tell me about a backend project",
        competency="Architecture",
        follow_up_depth=2,
    )
    res = service.evaluate_decision(question=q, transcript="I built a backend system.", content_metrics=None)
    assert res.should_follow_up is False
    assert res.reason == FollowUpReason.NO_FOLLOW_UP
    assert "Max follow-up depth" in res.justification


def test_followup_decision_unsupported_claim_trigger() -> None:
    service = FollowUpDecisionService(max_followup_depth=2)
    q = Question(
        id=uuid4(),
        interview_id=uuid4(),
        question_text="How did you improve performance?",
        competency="Performance",
        follow_up_depth=0,
    )
    metrics = ContentMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        overall_content_score=78.0,
        relevance_score=80.0,
        technical_depth_score=70.0,
        structure_score=80.0,
        evidence_score=60.0,
        claims_json=[
            {
                "claim": "I improved API throughput by 40 percent.",
                "support_status": "UNSUPPORTED",
                "explanation": "No baseline benchmark or metric cited",
            }
        ],
        star_analysis_json={},
        evidence_json=[],
        strengths_json=[],
        weaknesses_json=[],
        feedback_json=[],
        practice_drills_json=[],
    )

    transcript = "I improved API throughput by 40 percent using Redis caching and Postgres indexing."
    res = service.evaluate_decision(question=q, transcript=transcript, content_metrics=metrics)
    assert res.should_follow_up is True
    assert res.reason == FollowUpReason.CLAIM_REQUIRES_CLARIFICATION
    assert res.context_quote == "I improved API throughput by 40 percent."
