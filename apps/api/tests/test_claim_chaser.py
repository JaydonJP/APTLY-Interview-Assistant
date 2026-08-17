"""
Unit, Structured Output, and Integration Tests for ClaimChaser.

Tests cover:
- Quantitative claim extraction ("I reduced latency by 40%.") -> missing baseline, measurement, method -> QUANTIFY
- Accuracy improvement claim ("I improved recommendation accuracy by 30%.")
- All 10 ClaimTypes validation
- All 3 ClaimSupportStatus values
- All 7 FollowUpAction values
- Grounded follow-up rules (never generic 'Tell me more', references candidate quote)
- LLM structured-output validation with MockLLMProvider
- FollowUpDecisionService & GeminiAdaptiveEngine integration
- Fail-safe resilience when LLM provider raises exceptions
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import pytest

from app.models.question import Question
from app.schemas.claim_chaser import (
    ClaimChaserAnalysis,
    ClaimSupportStatus,
    ClaimType,
    ExtractedClaim,
    FollowUpAction,
)
from app.services.adaptive_interview.claim_chaser import ClaimChaserService
from app.services.adaptive_interview.engine import GeminiAdaptiveEngine
from app.services.adaptive_interview.followup_decision import (
    FollowUpDecisionService,
    FollowUpReason,
)
from app.services.providers.mock_llm import MockLLMProvider


# ── 1. Specific Target Test Cases ─────────────────────────────────────────────


def test_claim_chaser_reduced_latency_40_percent():
    """
    Test Case Requirement:
    Input: "I reduced latency by 40%."
    Expected:
    - Detect quantitative claim
    - Missing evidence: baseline, measurement, method
    - Expected action: QUANTIFY
    """
    service = ClaimChaserService()
    transcript = "I reduced latency by 40%."

    claims = service.extract_heuristic_claims(transcript)
    assert len(claims) >= 1

    primary = claims[0]
    assert primary.claim_type == ClaimType.QUANTITATIVE
    assert primary.recommended_action == FollowUpAction.QUANTIFY
    assert primary.support_status == ClaimSupportStatus.UNSUPPORTED_IN_ANSWER

    # Check missing evidence includes baseline, measurement, method
    for expected_missing in ["baseline", "measurement", "method"]:
        assert expected_missing in primary.missing_evidence

    # Check generated follow-up is grounded and not generic
    followup = service.generate_heuristic_followup(primary, transcript)
    assert "baseline" in followup.lower()
    assert "Tell me more" not in followup


def test_claim_chaser_improved_accuracy_30_percent():
    """
    Example Requirement:
    Candidate: "I improved recommendation accuracy by 30%."
    Extract:
    - claim: 30% accuracy improvement
    - Missing: baseline, metric definition, validation, personal contribution
    - Generate grounded follow-up
    """
    service = ClaimChaserService()
    transcript = "I improved recommendation accuracy by 30%."

    claims = service.extract_heuristic_claims(transcript)
    assert len(claims) >= 1

    primary = claims[0]
    assert primary.claim_type == ClaimType.QUANTITATIVE
    assert primary.recommended_action == FollowUpAction.QUANTIFY

    for expected_missing in ["baseline", "metric definition", "validation", "personal contribution"]:
        assert expected_missing in primary.missing_evidence

    followup = service.generate_heuristic_followup(primary, transcript)
    assert "baseline" in followup.lower()
    assert "30%" in followup or "accuracy" in followup.lower()
    assert "Tell me more" not in followup


# ── 2. Claim Types & Actions Enumeration ──────────────────────────────────────


def test_all_ten_claim_types():
    """Verify all 10 specified ClaimType variants."""
    expected_types = [
        "quantitative",
        "performance",
        "ownership",
        "scale",
        "technical_causality",
        "impact",
        "leadership",
        "reliability",
        "comparative",
        "vague",
    ]

    for ct in expected_types:
        claim = ExtractedClaim(
            claim_text=f"Test {ct}",
            claim_type=ct,
            quote=f"Quote for {ct}",
            recommended_action=FollowUpAction.PROBE,
        )
        assert claim.claim_type == ct


def test_all_three_support_statuses():
    """Verify all 3 ClaimSupportStatus variants."""
    expected_statuses = [
        "SUPPORTED",
        "PARTIALLY_SUPPORTED",
        "UNSUPPORTED_IN_ANSWER",
    ]

    for st in expected_statuses:
        claim = ExtractedClaim(
            claim_text="Support test",
            claim_type=ClaimType.PERFORMANCE,
            support_status=st,
            quote="Quote",
            recommended_action=FollowUpAction.PROBE,
        )
        assert claim.support_status == st


def test_all_seven_followup_actions():
    """Verify all 7 FollowUpAction variants."""
    expected_actions = [
        "PROBE",
        "QUANTIFY",
        "CLARIFY",
        "CHALLENGE",
        "VERIFY",
        "RECOVER",
        "ADVANCE",
    ]

    for act in expected_actions:
        claim = ExtractedClaim(
            claim_text="Action test",
            claim_type=ClaimType.IMPACT,
            recommended_action=act,
            quote="Quote",
        )
        assert claim.recommended_action == act


# ── 3. Ownership & Scale Extractions ──────────────────────────────────────────


def test_ownership_claim_extraction():
    """Verify extraction of team ownership claims needing clarification."""
    service = ClaimChaserService()
    transcript = "We built the search indexing pipeline."

    claims = service.extract_heuristic_claims(transcript)
    assert len(claims) >= 1

    ownership_claim = next((c for c in claims if c.claim_type == ClaimType.OWNERSHIP), None)
    assert ownership_claim is not None
    assert ownership_claim.recommended_action == FollowUpAction.CLARIFY
    assert "personal contribution" in ownership_claim.missing_evidence

    followup = service.generate_heuristic_followup(ownership_claim, transcript)
    assert "personal" in followup.lower() or "role" in followup.lower()


def test_scale_claim_extraction():
    """Verify extraction of scale claims."""
    service = ClaimChaserService()
    transcript = "Our system handled 500000 requests per second."

    claims = service.extract_heuristic_claims(transcript)
    assert len(claims) >= 1

    scale_claim = next((c for c in claims if c.claim_type == ClaimType.SCALE), None)
    assert scale_claim is not None
    assert scale_claim.recommended_action == FollowUpAction.VERIFY


# ── 4. Structured Output Validation with MockLLMProvider ─────────────────────


@pytest.mark.asyncio
async def test_claim_chaser_structured_analysis_mock_provider():
    """Verify ClaimChaserService structured analysis with MockLLMProvider."""
    provider = MockLLMProvider()
    service = ClaimChaserService(llm_provider=provider)

    analysis = await service.analyze_claims(
        transcript="I improved recommendation accuracy by 30%.",
        question_text="Tell me about a time you optimized a machine learning pipeline.",
    )

    assert isinstance(analysis, ClaimChaserAnalysis)
    assert len(analysis.claims) > 0
    assert analysis.primary_claim is not None
    assert analysis.primary_claim.claim_type == ClaimType.QUANTITATIVE
    assert analysis.followup_action == FollowUpAction.QUANTIFY
    assert analysis.suggested_followup_question is not None
    assert "baseline" in analysis.suggested_followup_question.lower()


# ── 5. FollowUpDecisionService Integration ────────────────────────────────────


def test_followup_decision_triggers_quantify_on_unsupported_claim():
    """Verify FollowUpDecisionService leverages ClaimChaser for decisions."""
    decision_service = FollowUpDecisionService()
    question = Question(
        id=uuid4(),
        interview_id=uuid4(),
        sequence_number=1,
        category="technical",
        competency="Performance Engineering",
        question_text="How did you optimize the backend?",
        follow_up_depth=0,
    )

    transcript = "I reduced latency by 40%."
    decision = decision_service.evaluate_decision(
        question=question,
        transcript=transcript,
        content_metrics=None,
    )

    assert decision.should_follow_up is True
    assert decision.reason == FollowUpReason.CLAIM_REQUIRES_CLARIFICATION
    assert decision.followup_action == FollowUpAction.QUANTIFY
    assert decision.claim_type == ClaimType.QUANTITATIVE
    assert "baseline" in decision.missing_evidence
    assert "latency by 40%" in decision.context_quote


# ── 6. GeminiAdaptiveEngine Integration & Fail-Safe Resilience ────────────────


@pytest.mark.asyncio
async def test_adaptive_engine_generates_grounded_followup():
    """Verify GeminiAdaptiveEngine generates follow-up question via ClaimChaser."""
    provider = MockLLMProvider()
    engine = GeminiAdaptiveEngine(llm_provider=provider)

    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    question = Question(
        id=uuid4(),
        interview_id=uuid4(),
        sequence_number=1,
        category="technical",
        competency="Optimization",
        question_text="Tell me about your optimization project.",
        follow_up_depth=0,
    )

    transcript = "I improved recommendation accuracy by 30%."

    followup = await engine.maybe_generate_followup(
        db=mock_db,
        parent_question=question,
        candidate_transcript=transcript,
        content_metrics=None,
        role_context={"role_title": "ML Engineer", "domain": "AI"},
    )

    assert followup is not None
    assert followup.question_type == "follow_up"
    assert "baseline" in followup.question_text.lower()
    assert "Tell me more" not in followup.question_text


@pytest.mark.asyncio
async def test_adaptive_engine_resilience_when_llm_fails():
    """
    Verify Fail-Safe Requirement:
    Ensure interview continues seamlessly even if LLM provider throws an exception.
    """
    failing_provider = AsyncMock()
    failing_provider.generate_text.side_effect = RuntimeError("LLM API Connection Timeout")

    engine = GeminiAdaptiveEngine(llm_provider=failing_provider)
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    question = Question(
        id=uuid4(),
        interview_id=uuid4(),
        sequence_number=1,
        category="technical",
        competency="Architecture",
        question_text="How did you improve performance?",
        follow_up_depth=0,
    )

    transcript = "I reduced latency by 40%."

    # Engine must catch the error and fallback to deterministic grounded question
    followup = await engine.maybe_generate_followup(
        db=mock_db,
        parent_question=question,
        candidate_transcript=transcript,
        content_metrics=None,
    )

    assert followup is not None
    assert followup.question_type == "follow_up"
    assert "reduced latency by 40%" in followup.question_text
    assert mock_db.add.called
    assert mock_db.commit.called
