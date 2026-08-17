"""Persistent learner knowledge graph and topic-level progress models."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class KnowledgeTopic(UUIDMixin, TimestampMixin, Base):
    """A normalized concept encountered in questions or candidate answers."""

    __tablename__ = "knowledge_topics"

    normalized_name: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(180), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False, default="general")
    answer_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    average_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    mastery_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_seen_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), nullable=False
    )


class KnowledgeEdge(UUIDMixin, TimestampMixin, Base):
    """A weighted co-occurrence edge between concepts in the graph."""

    __tablename__ = "knowledge_edges"
    __table_args__ = (
        UniqueConstraint(
            "source_topic_id", "target_topic_id", "edge_type",
            name="uq_knowledge_edge_pair",
        ),
    )

    source_topic_id: Mapped[UUID] = mapped_column(
        ForeignKey("knowledge_topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_topic_id: Mapped[UUID] = mapped_column(
        ForeignKey("knowledge_topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    edge_type: Mapped[str] = mapped_column(String(50), nullable=False, default="co_occurs")
    weight: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class LearnerTopicProgress(UUIDMixin, TimestampMixin, Base):
    """Per-learner mastery record for one knowledge topic."""

    __tablename__ = "learner_topic_progress"
    __table_args__ = (
        UniqueConstraint("learner_id", "topic_id", name="uq_learner_topic_progress"),
    )

    learner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    topic_id: Mapped[UUID] = mapped_column(
        ForeignKey("knowledge_topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    average_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    mastery_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_interview_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("interviews.id", ondelete="SET NULL"), nullable=True
    )
    last_answer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("answers.id", ondelete="SET NULL"), nullable=True
    )
