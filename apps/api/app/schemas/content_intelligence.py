"""
APTLY — Content Intelligence Schemas

Strict Pydantic schemas for semantic evaluation:
- Relevance, technical depth, completeness, structure, and evidence scoring (0-100)
- STAR methodology for behavioral questions
- Factual claim support classification (SUPPORTED, PARTIALLY_SUPPORTED, UNSUPPORTED, NOT_ASSESSABLE)
- Evidence bounding with exact transcript timestamps
- Actionable Feedback (Observation + Impact + Action)
- Concrete, repeatable practice drills
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class QuestionType(StrEnum):
    """Semantic classification of interview questions."""

    INTRODUCTORY = "introductory"
    BEHAVIORAL = "behavioral"
    TECHNICAL = "technical"
    PROJECT = "project"
    SITUATIONAL = "situational"
    SYSTEM_DESIGN = "system_design"


class ClaimSupportStatus(StrEnum):
    """Classification of factual or quantified claims made by the candidate."""

    SUPPORTED = "SUPPORTED"
    PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
    UNSUPPORTED = "UNSUPPORTED"
    NOT_ASSESSABLE = "NOT_ASSESSABLE"


class EvidenceType(StrEnum):
    """Types of evidence anchored to candidate speech."""

    STRENGTH = "STRENGTH"
    WEAKNESS = "WEAKNESS"
    CLAIM = "CLAIM"
    STAR = "STAR"
    FEEDBACK = "FEEDBACK"
    TECHNICAL_POINT = "TECHNICAL_POINT"


class StarComponent(BaseModel):
    """A single component of the STAR behavioral framework."""

    model_config = ConfigDict(extra="forbid")

    present: bool = Field(..., description="Whether this component was addressed in the answer")
    quality: float = Field(default=0.0, ge=0.0, le=100.0, description="Quality score 0-100")
    evidence_text: str | None = Field(default=None, description="Direct quote from transcript")
    start_seconds: float | None = Field(default=None, description="Start timestamp in recording")
    end_seconds: float | None = Field(default=None, description="End timestamp in recording")


class StarAnalysis(BaseModel):
    """STAR behavioral analysis for behavioral/situational questions."""

    model_config = ConfigDict(extra="forbid")

    situation: StarComponent
    task: StarComponent
    action: StarComponent
    result: StarComponent
    missing_components: list[str] = Field(
        default_factory=list,
        description="Components omitted or poorly addressed (e.g. ['result'])",
    )


class ClaimItem(BaseModel):
    """A specific factual or quantitative claim extracted from the answer."""

    model_config = ConfigDict(extra="forbid")

    claim: str = Field(..., description="The factual/performance claim made")
    support_status: ClaimSupportStatus = Field(
        default=ClaimSupportStatus.UNSUPPORTED,
        description="Whether the candidate provided supporting details or data",
    )
    evidence_quote: str | None = Field(
        default=None,
        description="Quotation supporting or qualifying the claim",
    )
    start_seconds: float | None = Field(default=None, description="Timestamp if available")


class EvidenceItem(BaseModel):
    """Standardized evidence anchor linking an evaluation point to the recording."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="Unique evidence identifier")
    type: EvidenceType = Field(..., description="Category of evidence")
    text: str = Field(..., description="Exact quoted phrase from the transcript")
    start_seconds: float = Field(..., ge=0.0, description="Start time in seconds")
    end_seconds: float = Field(..., ge=0.0, description="End time in seconds")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Anchor confidence score")


class FeedbackItem(BaseModel):
    """Actionable structured feedback following Observation -> Impact -> Action."""

    model_config = ConfigDict(extra="forbid")

    observation: str = Field(..., description="What the candidate specifically said or did")
    impact: str = Field(..., description="Why it matters to the interviewer / technical bar")
    action: str = Field(..., description="Concrete technique or phrase to use instead")


class PracticeDrill(BaseModel):
    """A concrete, short, repeatable practice drill to eliminate a weakness."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., description="Name of the drill, e.g. '60-Second Indexing Drill'")
    duration_seconds: int = Field(default=60, description="Target duration for the drill")
    instructions: str = Field(..., description="Step-by-step instructions for the practice repetition")
    repeat_count: int = Field(default=3, description="Recommended repetition count")


class ContentAnalysisResult(BaseModel):
    """
    Validated structured output from the Content Intelligence AI evaluator.
    """

    model_config = ConfigDict(extra="forbid")

    question_type: QuestionType = Field(default=QuestionType.TECHNICAL)
    relevance_score: float = Field(..., ge=0.0, le=100.0, description="Relevance to question 0-100")
    technical_depth_score: float = Field(..., ge=0.0, le=100.0, description="Technical depth 0-100")
    completeness_score: float = Field(..., ge=0.0, le=100.0, description="Completeness 0-100")
    structure_score: float = Field(..., ge=0.0, le=100.0, description="Structure & clarity 0-100")
    evidence_score: float = Field(..., ge=0.0, le=100.0, description="Evidence quality 0-100")
    overall_content_score: float = Field(..., ge=0.0, le=100.0, description="Weighted aggregate 0-100")

    strengths: list[str] = Field(default_factory=list, description="Top positive aspects of answer")
    weaknesses: list[str] = Field(default_factory=list, description="Top prioritized weaknesses")

    star_analysis: StarAnalysis | None = Field(
        default=None,
        description="STAR analysis for behavioral questions (null for pure technical)",
    )
    claims: list[ClaimItem] = Field(
        default_factory=list,
        description="Factual and numerical claims audited",
    )
    evidence: list[EvidenceItem] = Field(
        default_factory=list,
        description="Timestamped anchors in candidate speech",
    )
    feedback: list[FeedbackItem] = Field(
        default_factory=list,
        description="Structured Observation -> Impact -> Action feedback",
    )
    practice_drills: list[PracticeDrill] = Field(
        default_factory=list,
        description="Actionable practice drills for candidate improvement",
    )

    reasoning_summary: str = Field(
        default="",
        description="Concise rubric-based justification for assigned scores",
    )


class ContentAnalysisInput(BaseModel):
    """Input payload passed to ContentAnalysisService."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    role_title: str
    seniority: str
    domain: str
    technical_skills: list[str] = Field(default_factory=list)
    question_text: str
    question_category: str = "technical"
    expected_topics: list[str] = Field(default_factory=list)
    full_transcript: str
    words: list[dict[str, Any]] = Field(default_factory=list)
    duration_seconds: float = 0.0
