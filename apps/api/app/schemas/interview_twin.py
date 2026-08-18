"""
APTLY API — Persistent Interview Twin Schemas

Defines the longitudinal coaching history model (NOT personality profiling):
- Recurring strengths & weaknesses
- Completed practice drills & improvement deltas
- Recurring evidence debt (missing baseline, validation, tradeoffs)
- Empirical session delivery & content trends (Session 1, Session 2, Session 3)
- Next interview generation directives
- Insufficient data handling ("Not enough data yet.")
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import AptlyBaseModel


class SessionTrendPoint(AptlyBaseModel):
    """Empirical metrics from a single completed interview session."""

    session_id: str
    session_number: int
    session_date: str
    title: str
    overall_score: float = Field(ge=0.0, le=100.0)
    content_score: float = Field(ge=0.0, le=100.0)
    delivery_score: float = Field(ge=0.0, le=100.0)
    evidence_score: float = Field(ge=0.0, le=100.0)
    structure_score: float = Field(ge=0.0, le=100.0)
    filler_count: int = 0
    wpm: float = 0.0


class EvidenceDebtItem(AptlyBaseModel):
    """Recurring pattern where candidate answers consistently omitted evidence dimensions."""

    category: str = Field(..., description="e.g. validation, baseline, tradeoff, ownership")
    frequency: int = 1
    sample_context: str | None = None
    coaching_recommendation: str = ""


class CompletedDrillRecord(AptlyBaseModel):
    """Record of a practice drill completed during Repair Mode."""

    drill_name: str
    session_id: str
    before_evidence: int
    after_evidence: int
    delta: int
    verified_improvement: bool = True
    completed_at: str = ""


class InterviewTwinProfile(AptlyBaseModel):
    """
    Coaching history model synthesizing longitudinal candidate progress.
    Strictly uses real session records; never hallucinates fake data.
    """

    total_completed_sessions: int = 0
    has_sufficient_data: bool = False
    status_message: str = "Not enough data yet."
    recurring_strengths: list[str] = Field(default_factory=list)
    recurring_weaknesses: list[str] = Field(default_factory=list)
    recurring_evidence_debt: list[EvidenceDebtItem] = Field(default_factory=list)
    completed_drills: list[CompletedDrillRecord] = Field(default_factory=list)
    session_history: list[SessionTrendPoint] = Field(default_factory=list)
    next_interview_focus_areas: list[str] = Field(default_factory=list)
    recommended_question_types: list[str] = Field(default_factory=list)
