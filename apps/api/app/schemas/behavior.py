"""
APTLY API — Observable Visual Behavior Schemas

Pydantic schemas for privacy-aware computer vision behavior events,
on-camera delivery scores, visual heatmap timelines, and evidence-grounded habits & drills.
Strictly observable measurements only — no psychological inferences.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class BehaviorEventCreate(BaseModel):
    """Payload for submitting a detected behavior event from client-side tracker."""

    event_type: str = Field(
        ...,
        description="Observable event: LOOK_AWAY, MOVEMENT_SPIKE, FRAMING_POOR, FRAMING_GOOD, FACE_MISSING, FACE_PRESENT",
    )
    start_ms: int = Field(..., ge=0, description="Start timestamp in milliseconds")
    end_ms: int = Field(..., ge=0, description="End timestamp in milliseconds")
    duration_ms: int = Field(..., ge=0, description="Duration in milliseconds")
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    value: float | None = Field(default=None, description="Observed numeric measurement")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Observable geometry telemetry")
    question_id: str | None = None
    answer_id: str | None = None


class BehaviorEventResponse(BaseModel):
    """Schema for returning an observable behavior event."""

    id: str
    interview_id: str
    answer_id: str | None = None
    question_id: str | None = None
    event_type: str
    start_ms: int
    end_ms: int
    duration_ms: int
    confidence: float
    value: float | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class BehaviorSnapshot(BaseModel):
    """Time-series sample of on-camera presence."""

    timestamp_ms: int
    camera_attention: float = Field(..., ge=0.0, le=100.0)
    head_movement: float = Field(..., ge=0.0)
    face_present: bool = True
    framing_state: str = "CENTERED"


class BehaviorSubmitRequest(BaseModel):
    """Request payload containing aggregated browser-side computer vision telemetry."""

    events: list[BehaviorEventCreate] = Field(default_factory=list)
    snapshots: list[BehaviorSnapshot] = Field(default_factory=list)
    question_id: str | None = None
    answer_id: str | None = None
    duration_seconds: float = 0.0


class QuestionHeatmapBlock(BaseModel):
    """Segmented block within a question answer timeline for the visual heatmap."""

    block_index: int
    start_seconds: float
    end_seconds: float
    time_label: str
    attention_level: str  # HIGH, MEDIUM, LOW
    intensity_score: float
    has_look_away: bool = False
    has_movement_spike: bool = False
    event_label: str = ""


class QuestionVisualInsight(BaseModel):
    """Per-question observable visual delivery analytics with visual heatmap blocks."""

    sequence_number: int
    question_id: str
    question_text: str
    competency: str
    duration_seconds: float
    camera_attention: float
    content_score: float
    look_away_count: int
    movement_spikes: int
    framing_consistency: float
    observable_summary: str
    heatmap_blocks: list[QuestionHeatmapBlock] = Field(default_factory=list)


class VisualDeliveryHabit(BaseModel):
    """Evidence-grounded observable visual delivery habit with targeted practice drill."""

    habit_title: str
    observable_evidence: str
    timestamp_display: str
    event_count: int
    total_duration_seconds: float
    impact_description: str
    recommended_drill: str
    drill_instructions: str


class VisualDeliverySummaryResponse(BaseModel):
    """Comprehensive visual delivery scorecard and question-correlated behavior timeline."""

    interview_id: str
    on_camera_presence_score: float = Field(..., ge=0.0, le=100.0)
    camera_attention_estimate: float = Field(..., ge=0.0, le=100.0)
    framing_consistency_score: float = Field(..., ge=0.0, le=100.0)
    face_visibility_score: float = Field(..., ge=0.0, le=100.0)
    movement_stability_score: float = Field(..., ge=0.0, le=100.0)

    # Observable Aggregates
    look_away_count: int
    look_away_total_seconds: float
    movement_spike_count: int
    poor_framing_count: int

    # Behavior Trends Across Questions
    trend_beginning_attention: float
    trend_middle_attention: float
    trend_end_attention: float
    trend_observation: str

    # Correlated Question Insights with Visual Heatmap
    question_insights: list[QuestionVisualInsight] = Field(default_factory=list)

    # Top 3 Visual Delivery Habits
    top_habits: list[VisualDeliveryHabit] = Field(default_factory=list)

    # All Timeline Events
    events: list[BehaviorEventResponse] = Field(default_factory=list)
