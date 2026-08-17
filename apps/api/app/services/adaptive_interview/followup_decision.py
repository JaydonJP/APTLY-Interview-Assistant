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


class FollowUpDecision(BaseModel):
    """Structured decision output from FollowUpDecisionService."""

    model_config = ConfigDict(extra="forbid")

    should_follow_up: bool = Field(..., description="Whether to probe further with a follow-up")
    reason: FollowUpReason = Field(default=FollowUpReason.NO_FOLLOW_UP)
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
    ) -> None:
        self.max_followups_per_question = max_followups_per_question
        self.max_followup_depth = max_followup_depth

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
                justification="Max follow-up depth reached.",
            )

        if existing_followups_count >= self.max_followups_per_question:
            return FollowUpDecision(
                should_follow_up=False,
                reason=FollowUpReason.NO_FOLLOW_UP,
                justification="Max follow-up count for parent question reached.",
            )

        # A non-empty short answer is precisely where a real interviewer would
        # ask the candidate to expand. Empty answers remain non-branching.
        words = transcript.strip().split()
        if not words:
            return FollowUpDecision(
                should_follow_up=False,
                reason=FollowUpReason.NO_FOLLOW_UP,
                justification="No spoken evidence is available for a grounded follow-up.",
            )

        if len(words) < 6:
            return FollowUpDecision(
                should_follow_up=True,
                reason=FollowUpReason.MISSING_EVIDENCE,
                target_competency=question.competency or "Core Competency",
                context_quote=transcript.strip(),
                justification=(
                    "The response is too short to verify the expected competency; "
                    "ask the candidate to expand with reasoning and a concrete example."
                ),
            )

        if not content_metrics:
            return FollowUpDecision(
                should_follow_up=False,
                reason=FollowUpReason.NO_FOLLOW_UP,
                justification="No content metrics available.",
            )

        # Check 1: Factual / Numerical claims requiring clarification
        unsupported_claims = [
            c for c in content_metrics.claims_json
            if c.get("support_status") in ("UNSUPPORTED", "PARTIALLY_SUPPORTED")
        ]
        if unsupported_claims:
            top_claim = unsupported_claims[0]
            return FollowUpDecision(
                should_follow_up=True,
                reason=FollowUpReason.CLAIM_REQUIRES_CLARIFICATION,
                target_competency=question.competency or "Execution & Measurement",
                context_quote=top_claim.get("claim"),
                justification=f"Candidate made claim '{top_claim.get('claim')}' without supporting metrics or evidence.",
            )

        # Check 2: Behavioral STAR missing result
        if content_metrics.star_analysis_json:
            star = content_metrics.star_analysis_json
            missing = star.get("missing_components", [])
            if "result" in missing or not star.get("result", {}).get("present", True):
                return FollowUpDecision(
                    should_follow_up=True,
                    reason=FollowUpReason.MISSING_RESULT,
                    target_competency=question.competency or "Impact & Outcomes",
                    context_quote="Actions taken during scenario",
                    justification="STAR answer omitted the final outcome, business impact, or retrospective learning.",
                )

        # Check 3: Technical depth shallow
        if content_metrics.technical_depth_score < 75.0 and len(words) > 15:
            return FollowUpDecision(
                should_follow_up=True,
                reason=FollowUpReason.TECHNICAL_DEPTH_SHALLOW,
                target_competency=question.competency or "System Architecture",
                context_quote=transcript[:60],
                justification="Candidate answered at a high level without detailing architecture mechanisms or trade-offs.",
            )

        return FollowUpDecision(
            should_follow_up=False,
            reason=FollowUpReason.NO_FOLLOW_UP,
            justification="Answer was comprehensive and sufficiently grounded.",
        )
