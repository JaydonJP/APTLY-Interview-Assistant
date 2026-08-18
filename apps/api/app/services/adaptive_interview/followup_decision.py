"""
APTLY — Follow-Up Decision Engine

Determines whether an answer warrants an evidence-grounded follow-up question based on:
1. Factual / performance claims requiring clarification (e.g. "improved by 40%")
2. Unclear personal contribution vs team contribution
3. Missing behavioral STAR result or outcome quantification
4. Shallow technical depth or missing trade-offs
5. Deterministic depth & budget guards (max 1 follow-up per question, max depth 2)
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.core.logging import get_logger
from app.models.content_metrics import ContentMetrics
from app.models.question import Question

logger = get_logger(__name__)


class FollowUpReason(StrEnum):
    """Specific evidence-backed reason for asking an adaptive follow-up question."""

    CLAIM_REQUIRES_CLARIFICATION = "CLAIM_REQUIRES_CLARIFICATION"
    PERSONAL_CONTRIBUTION_UNCLEAR = "PERSONAL_CONTRIBUTION_UNCLEAR"
    MISSING_RESULT = "MISSING_RESULT"
    MISSING_EVIDENCE = "MISSING_EVIDENCE"
    TECHNICAL_DEPTH_SHALLOW = "TECHNICAL_DEPTH_SHALLOW"
    TRADEOFF_MISSING = "TRADEOFF_MISSING"
    COMPETENCY_PROBE = "COMPETENCY_PROBE"
    NO_FOLLOW_UP = "NO_FOLLOW_UP"


from app.schemas.claim_chaser import ClaimSupportStatus, ClaimType, FollowUpAction
from app.services.adaptive_interview.claim_chaser import ClaimChaserService


class FollowUpDecision(BaseModel):
    """Structured decision output from FollowUpDecisionService."""

    model_config = ConfigDict(extra="forbid")

    should_follow_up: bool = Field(..., description="Whether to probe further with a follow-up")
    reason: FollowUpReason = Field(default=FollowUpReason.NO_FOLLOW_UP)
    followup_action: FollowUpAction = Field(default=FollowUpAction.ADVANCE, description="ClaimChaser action intent")
    claim_type: ClaimType | None = Field(default=None, description="Extracted claim type if applicable")
    missing_evidence: list[str] = Field(default_factory=list, description="Missing evidence dimensions")
    target_competency: str = Field(default="Technical Competency")
    context_quote: str | None = Field(default=None, description="Specific candidate quote prompting the question")
    justification: str = Field(default="", description="Internal justification for the decision")


class FollowUpDecisionService:
    """
    Evaluates answer quality metrics and deterministically guards adaptive question branching.
    """

    def __init__(
        self,
        max_followups_per_question: int = 1,
        max_followup_depth: int = 2,
        claim_chaser: ClaimChaserService | None = None,
    ) -> None:
        self.max_followups_per_question = max_followups_per_question
        self.max_followup_depth = max_followup_depth
        self.claim_chaser = claim_chaser or ClaimChaserService()

    def evaluate_decision(
        self,
        question: Question,
        transcript: str,
        content_metrics: ContentMetrics | None,
        existing_followups_count: int = 0,
    ) -> FollowUpDecision:
        """
        Evaluate if a follow-up should be generated with strict budget guards.
        """
        # Guard 1: Enforce max depth and question budget
        if question.follow_up_depth >= self.max_followup_depth:
            return FollowUpDecision(
                should_follow_up=False,
                reason=FollowUpReason.NO_FOLLOW_UP,
                followup_action=FollowUpAction.ADVANCE,
                justification="Max follow-up depth reached.",
            )

        if existing_followups_count >= self.max_followups_per_question:
            return FollowUpDecision(
                should_follow_up=False,
                reason=FollowUpReason.NO_FOLLOW_UP,
                followup_action=FollowUpAction.ADVANCE,
                justification="Max follow-up count for parent question reached.",
            )

        # Guard 2: Short / empty answer guardrail
        words = transcript.strip().split()
        if len(words) < 4:
            return FollowUpDecision(
                should_follow_up=False,
                reason=FollowUpReason.NO_FOLLOW_UP,
                followup_action=FollowUpAction.ADVANCE,
                justification="Transcript too brief for evidence-grounded follow-up.",
            )

        # Check 1: Persisted factual / numerical claims from content evaluator
        if content_metrics and content_metrics.claims_json:
            unsupported_claims = [
                c for c in content_metrics.claims_json
                if c.get("support_status") in ("UNSUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED_IN_ANSWER")
            ]
            if unsupported_claims:
                top_claim_data = unsupported_claims[0]
                claim_text = top_claim_data.get("claim", "")
                return FollowUpDecision(
                    should_follow_up=True,
                    reason=FollowUpReason.CLAIM_REQUIRES_CLARIFICATION,
                    followup_action=FollowUpAction.QUANTIFY,
                    claim_type=ClaimType.QUANTITATIVE,
                    missing_evidence=["baseline", "measurement", "method"],
                    target_competency=question.competency or "Execution & Measurement",
                    context_quote=claim_text,
                    justification=f"Candidate made claim '{claim_text}' without supporting metrics or evidence.",
                )

        # Check 2: ClaimChaser direct extraction on transcript (e.g. "I reduced latency by 40%.")
        extracted_claims = self.claim_chaser.extract_heuristic_claims(transcript)
        unsupported_extracted = [
            c for c in extracted_claims
            if c.support_status in (ClaimSupportStatus.UNSUPPORTED_IN_ANSWER, ClaimSupportStatus.PARTIALLY_SUPPORTED)
        ]
        if unsupported_extracted:
            top_claim = unsupported_extracted[0]
            return FollowUpDecision(
                should_follow_up=True,
                reason=FollowUpReason.CLAIM_REQUIRES_CLARIFICATION,
                followup_action=top_claim.recommended_action,
                claim_type=top_claim.claim_type,
                missing_evidence=top_claim.missing_evidence,
                target_competency=question.competency or "Execution & Measurement",
                context_quote=top_claim.quote,
                justification=f"Candidate made {top_claim.claim_type} claim '{top_claim.quote}' without supporting {', '.join(top_claim.missing_evidence[:2])}.",
            )

        if not content_metrics:
            return FollowUpDecision(
                should_follow_up=False,
                reason=FollowUpReason.NO_FOLLOW_UP,
                followup_action=FollowUpAction.ADVANCE,
                justification="No content metrics available.",
            )

        # Check 3: Behavioral STAR missing result
        if content_metrics.star_analysis_json:
            star = content_metrics.star_analysis_json
            missing = star.get("missing_components", [])
            if "result" in missing or not star.get("result", {}).get("present", True):
                return FollowUpDecision(
                    should_follow_up=True,
                    reason=FollowUpReason.MISSING_RESULT,
                    followup_action=FollowUpAction.PROBE,
                    claim_type=ClaimType.IMPACT,
                    missing_evidence=["business outcome", "measurable result"],
                    target_competency=question.competency or "Impact & Outcomes",
                    context_quote="Actions taken during scenario",
                    justification="STAR answer omitted the final outcome, business impact, or retrospective learning.",
                )

        # Check 4: Technical depth shallow
        if content_metrics.technical_depth_score < 75.0 and len(words) > 15:
            return FollowUpDecision(
                should_follow_up=True,
                reason=FollowUpReason.TECHNICAL_DEPTH_SHALLOW,
                followup_action=FollowUpAction.PROBE,
                claim_type=ClaimType.TECHNICAL_CAUSALITY,
                missing_evidence=["architecture mechanisms", "trade-offs"],
                target_competency=question.competency or "System Architecture",
                context_quote=transcript[:60],
                justification="Candidate answered at a high level without detailing architecture mechanisms or trade-offs.",
            )

        return FollowUpDecision(
            should_follow_up=False,
            reason=FollowUpReason.NO_FOLLOW_UP,
            followup_action=FollowUpAction.ADVANCE,
            justification="Answer was comprehensive and sufficiently grounded.",
        )
