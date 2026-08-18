"""
APTLY API — Observable Visual Behavior Models

Database models for storing privacy-aware, observable computer vision behavior events
and aggregated on-camera delivery metrics per interview answer and session.
Strictly observable signals only — no psychological, emotion, or deception inference.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.answer import Answer
    from app.models.interview import Interview
    from app.models.question import Question


class BehaviorEvent(Base):
    """
    Timestamped observable delivery behavior event (e.g. LOOK_AWAY, MOVEMENT_SPIKE, FRAMING_POOR).
    """

    __tablename__ = "behavior_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    interview_id: Mapped[UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("answers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    question_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("questions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Event types: LOOK_AWAY, MOVEMENT_SPIKE, FRAMING_POOR, FRAMING_GOOD, FACE_PRESENT, FACE_MISSING

    start_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.95, nullable=False)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Observable telemetry (yaw, pitch, roll, movement delta, framing bounding box)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSON, default=dict, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    interview: Mapped[Interview] = relationship("Interview", back_populates="behavior_events")
    answer: Mapped[Answer | None] = relationship("Answer")
    question: Mapped[Question | None] = relationship("Question")


class VisualDeliveryMetrics(Base):
    """
    Aggregated observable on-camera delivery metrics per interview answer or overall session.
    """

    __tablename__ = "visual_delivery_metrics"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    interview_id: Mapped[UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("answers.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Core Observable Metrics (0.0 to 100.0)
    on_camera_presence_score: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    camera_attention_estimate: Mapped[float] = mapped_column(Float, default=85.0, nullable=False)
    framing_consistency_score: Mapped[float] = mapped_column(Float, default=90.0, nullable=False)
    face_visibility_score: Mapped[float] = mapped_column(Float, default=95.0, nullable=False)
    movement_stability_score: Mapped[float] = mapped_column(Float, default=78.0, nullable=False)

    # Observable Event Counts & Durations
    look_away_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    look_away_total_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    movement_spike_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    poor_framing_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Detailed Time Series Snapshots (sampled every 1-2 seconds)
    timeline_snapshots_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    interview: Mapped[Interview] = relationship("Interview", back_populates="visual_metrics")
