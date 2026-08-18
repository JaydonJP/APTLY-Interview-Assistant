"""
APTLY API — Repair Mode Schemas

Structured schemas for the 7-stage Repair flow:
weakness -> evidence -> explanation -> targeted drill -> retry -> reevaluation -> before/after
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from app.schemas.common import AptlyBaseModel


class RepairDrillType(StrEnum):
    """9 Specialized Repair Drills."""

    METRIC_BASELINE_METHOD = "Metric-Baseline-Method"
    RESULT_FIRST = "Result-first"
    OWNERSHIP_DRILL = "Ownership drill"
    VALIDATION_DRILL = "Validation drill"
    TRADEOFF_DRILL = "Tradeoff drill"
    STAR_RESULT_DRILL = "STAR result drill"
    FILLER_REDUCTION_DRILL = "Filler reduction drill"
    PAUSE_RECOVERY_DRILL = "Pause recovery drill"
    TECHNICAL_DEPTH_DRILL = "Technical depth drill"


class RepairMetricsSnapshot(AptlyBaseModel):
    """Concrete measurements captured for an answer attempt."""

    evidence_score: float | None = None
    filler_count: int | None = None
    structure_score: float | None = None
    technical_depth_score: float | None = None
    relevance_score: float | None = None
    pause_count: int | None = None
    wpm: float | None = None
    has_real_measurements: bool = False


class BeforeAfterDelta(AptlyBaseModel):
    """Measurable before vs after delta comparison."""

    metric_name: str
    before_value: float
    after_value: float
    delta: float
    improved: bool
    display_text: str = Field(description="Formatted comparison (e.g. '42 → 81' or '7 → 3')")


class RepairSessionEvaluation(AptlyBaseModel):
    """End-to-end evaluation of a repair attempt with verifiable before/after deltas."""

    interview_id: str
    question_id: str
    weakness_title: str
    evidence_snippet: str
    explanation: str
    drill: RepairDrillType
    drill_instructions: str
    before_metrics: RepairMetricsSnapshot
    after_metrics: RepairMetricsSnapshot
    deltas: list[BeforeAfterDelta] = Field(default_factory=list)
    improvement_verified: bool = Field(
        description="True ONLY if both attempts have real measurements and demonstrated measurable gains"
    )
    summary_verdict: str


class RepairSubmitRequest(AptlyBaseModel):
    """Payload for submitting a repair retry attempt."""

    question_id: str
    retry_transcript: str
    audio_duration_seconds: float = 30.0
    speech_metrics: dict[str, Any] | None = None
    drill_type: RepairDrillType | None = None
