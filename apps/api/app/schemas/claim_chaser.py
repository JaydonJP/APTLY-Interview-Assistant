"""
APTLY — ClaimChaser Schemas

Structured contracts for extracting, classifying, and chasing candidate claims
with evidence-grounded follow-up probes.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from app.schemas.common import AptlyBaseModel


class ClaimType(StrEnum):
    """Classification of claims made in technical and behavioral answers."""

    QUANTITATIVE = "quantitative"
    PERFORMANCE = "performance"
    OWNERSHIP = "ownership"
    SCALE = "scale"
    TECHNICAL_CAUSALITY = "technical_causality"
    IMPACT = "impact"
    LEADERSHIP = "leadership"
    RELIABILITY = "reliability"
    COMPARATIVE = "comparative"
    VAGUE = "vague"


class ClaimSupportStatus(StrEnum):
    """Evidence support status in the candidate's answer."""

    SUPPORTED = "SUPPORTED"
    PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
    UNSUPPORTED_IN_ANSWER = "UNSUPPORTED_IN_ANSWER"


class FollowUpAction(StrEnum):
    """Categorization of interviewer follow-up intent."""

    PROBE = "PROBE"
    QUANTIFY = "QUANTIFY"
    CLARIFY = "CLARIFY"
    CHALLENGE = "CHALLENGE"
    VERIFY = "VERIFY"
    RECOVER = "RECOVER"
    ADVANCE = "ADVANCE"


class ExtractedClaim(AptlyBaseModel):
    """A single factual, performance, or architectural claim extracted from speech."""

    claim_text: str = Field(description="Normalized statement of the claim")
    claim_type: ClaimType = Field(description="Category of the claim")
    support_status: ClaimSupportStatus = Field(
        default=ClaimSupportStatus.UNSUPPORTED_IN_ANSWER,
        description="Whether the claim was grounded with metrics/context in the answer",
    )
    quote: str = Field(description="Exact candidate quote from transcript")
    present_evidence: list[str] = Field(
        default_factory=list,
        description="Evidence dimensions provided in the answer",
    )
    missing_evidence: list[str] = Field(
        default_factory=list,
        description="Missing evidence dimensions (e.g. baseline, metric definition, validation, personal contribution)",
    )
    recommended_action: FollowUpAction = Field(
        default=FollowUpAction.PROBE,
        description="Recommended interview follow-up action",
    )
    start_seconds: float | None = Field(default=None, description="Start timestamp if available")
    end_seconds: float | None = Field(default=None, description="End timestamp if available")


class ClaimChaserAnalysis(AptlyBaseModel):
    """Complete claim analysis for an answer turn."""

    claims: list[ExtractedClaim] = Field(
        default_factory=list,
        description="List of extracted claims from candidate answer",
    )
    primary_claim: ExtractedClaim | None = Field(
        default=None,
        description="The highest-priority claim requiring follow-up or validation",
    )
    suggested_followup_question: str | None = Field(
        default=None,
        description="Generated evidence-seeking follow-up question referencing candidate's quote",
    )
    followup_action: FollowUpAction = Field(
        default=FollowUpAction.ADVANCE,
        description="Overall recommended follow-up action",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Analysis confidence score",
    )
