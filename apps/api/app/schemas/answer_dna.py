"""
APTLY API — Answer DNA & Competency Coverage Schemas

Defines the 7-dimension Technical DNA, 6-dimension Behavioral DNA, and JD Competency Coverage.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from app.schemas.common import AptlyBaseModel


class CompetencyCoverageStatus(StrEnum):
    """Evaluation status for JD competencies."""

    TESTED = "TESTED"
    DEMONSTRATED = "DEMONSTRATED"
    WEAK_EVIDENCE = "WEAK_EVIDENCE"
    NOT_TESTED = "NOT_TESTED"


class DNADimension(AptlyBaseModel):
    """A discrete dimension within an answer's structural DNA."""

    name: str
    present: bool = False
    quality: float = Field(default=0.0, ge=0.0, le=100.0)
    evidence_quote: str | None = None
    start_seconds: float | None = None
    end_seconds: float | None = None
    missing_reason: str | None = None


class TechnicalAnswerDNA(AptlyBaseModel):
    """
    7-dimension Technical Answer DNA:
    problem -> approach -> reasoning -> implementation -> tradeoff -> validation -> result
    """

    problem: DNADimension = Field(default_factory=lambda: DNADimension(name="problem"))
    approach: DNADimension = Field(default_factory=lambda: DNADimension(name="approach"))
    reasoning: DNADimension = Field(default_factory=lambda: DNADimension(name="reasoning"))
    implementation: DNADimension = Field(default_factory=lambda: DNADimension(name="implementation"))
    tradeoff: DNADimension = Field(default_factory=lambda: DNADimension(name="tradeoff"))
    validation: DNADimension = Field(default_factory=lambda: DNADimension(name="validation"))
    result: DNADimension = Field(default_factory=lambda: DNADimension(name="result"))
    completeness_score: float = Field(default=0.0, ge=0.0, le=100.0)
    missing_dimensions: list[str] = Field(default_factory=list)


class BehavioralAnswerDNA(AptlyBaseModel):
    """
    6-dimension Behavioral Answer DNA:
    situation -> task -> action -> result -> ownership -> learning
    """

    situation: DNADimension = Field(default_factory=lambda: DNADimension(name="situation"))
    task: DNADimension = Field(default_factory=lambda: DNADimension(name="task"))
    action: DNADimension = Field(default_factory=lambda: DNADimension(name="action"))
    result: DNADimension = Field(default_factory=lambda: DNADimension(name="result"))
    ownership: DNADimension = Field(default_factory=lambda: DNADimension(name="ownership"))
    learning: DNADimension = Field(default_factory=lambda: DNADimension(name="learning"))
    completeness_score: float = Field(default=0.0, ge=0.0, le=100.0)
    missing_dimensions: list[str] = Field(default_factory=list)


class CompetencyItemEvaluation(AptlyBaseModel):
    """Coverage and evidence evaluation for a single Job Description competency."""

    competency_name: str
    status: CompetencyCoverageStatus = CompetencyCoverageStatus.NOT_TESTED
    score: float = Field(default=0.0, ge=0.0, le=100.0)
    evidence_snippets: list[str] = Field(default_factory=list)
    question_sequence_numbers: list[int] = Field(default_factory=list)
    explanation: str = Field(default="")


class SessionCompetencyCoverage(AptlyBaseModel):
    """Matrix of all JD competencies evaluated across the entire interview session."""

    interview_id: str
    total_competencies: int = 0
    demonstrated_count: int = 0
    weak_evidence_count: int = 0
    not_tested_count: int = 0
    coverage_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    competencies: list[CompetencyItemEvaluation] = Field(default_factory=list)
