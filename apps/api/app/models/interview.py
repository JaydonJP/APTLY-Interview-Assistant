"""
APTLY API — Interview ORM Model
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.answer import Answer
    from app.models.job import Job, RoleProfile
    from app.models.question import Question


class Interview(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    """
    Core interview entity representing an end-to-end practice session.
    """

    __tablename__ = "interviews"

    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    user_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    # Stable identity for both signed-in users and guest browser sessions.
    learner_id: Mapped[str] = mapped_column(
        String(120), nullable=False, default="anonymous", index=True
    )

    # Foreign Keys
    job_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    role_profile_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("role_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # State machine: created -> ready -> running -> question_active -> answering -> answer_submitted -> processing -> next_question -> completing -> completed | failed
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="created",
        index=True,
    )

    # Configuration
    interview_type: Mapped[str] = mapped_column(String(50), nullable=False, default="mixed")
    difficulty_level: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    target_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    current_question_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Session timestamps
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Schema versioning
    metrics_schema_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    evaluation_schema_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    scoring_algorithm_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")

    # Relationships
    job: Mapped[Job | None] = relationship(
        "Job", back_populates="interviews", lazy="selectin"
    )
    role_profile: Mapped[RoleProfile | None] = relationship(
        "RoleProfile", lazy="selectin"
    )
    questions: Mapped[list[Question]] = relationship(
        "Question",
        back_populates="interview",
        order_by="Question.sequence_number",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    answers: Mapped[list[Answer]] = relationship(
        "Answer",
        back_populates="interview",
        order_by="Answer.sequence_number",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Interview id={self.id} title={self.title} status={self.status}>"
