"""Privacy-safe visual communication metrics for recorded answers."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.answer import Answer


class VisionMetrics(UUIDMixin, TimestampMixin, Base):
    """Coarse browser-side camera telemetry used for coaching feedback."""

    __tablename__ = "vision_metrics"

    answer_id: Mapped[UUID] = mapped_column(
        ForeignKey("answers.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="browser")
    model_version: Mapped[str] = mapped_column(
        String(100), nullable=False, default="unavailable"
    )
    capability_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="unavailable"
    )
    frame_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    valid_frame_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    analysis_duration_seconds: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    face_detected_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    multiple_people_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    eye_contact_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    face_centering_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    tracking_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    visual_communication_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    expression_signal: Mapped[str] = mapped_column(
        String(50), nullable=False, default="unavailable"
    )
    expression_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    face_presence_events_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    strengths_json: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    improvements_json: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )

    answer: Mapped[Answer] = relationship("Answer", back_populates="vision_metrics")
