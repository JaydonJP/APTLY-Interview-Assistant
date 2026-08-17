"""
APTLY — Content Metrics Database Model

Stores AI-evaluated content intelligence for an answer:
- Semantic scores (relevance, depth, completeness, structure, evidence)
- STAR methodology breakdown
- Factual claims audit
- Anchored evidence items
- Actionable feedback (Observation + Impact + Action)
- Specific practice drills
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.answer import Answer


class ContentMetrics(UUIDMixin, TimestampMixin, Base):
    """
    Persisted semantic content intelligence for a candidate's answer.
    """

    __tablename__ = "content_metrics"

    answer_id: Mapped[UUID] = mapped_column(
        ForeignKey("answers.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    question_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="technical",
    )

    # Scores (0.0 to 100.0)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    technical_depth_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    completeness_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    structure_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    evidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overall_content_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Structured Components
    strengths_json: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    weaknesses_json: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    star_analysis_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    claims_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    evidence_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    feedback_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    practice_drills_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )

    reasoning_summary: Mapped[str] = mapped_column(
        Text,
        default="",
        nullable=False,
    )

    # Provenance & Versioning
    provider: Mapped[str] = mapped_column(String(50), default="mock", nullable=False)
    model: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="content-v1.0", nullable=False)
    schema_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)

    # Relationship
    answer: Mapped[Answer] = relationship("Answer", back_populates="content_metrics")
