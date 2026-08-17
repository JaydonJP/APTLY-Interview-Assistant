"""
APTLY API — Answer ORM Model (Central Analytical Unit)
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.interview import Interview
    from app.models.metrics import SpeechMetrics
    from app.models.question import Question
    from app.models.transcript import Transcript


class Answer(UUIDMixin, TimestampMixin, Base):
    """
    Central analytical unit representing a candidate's response to a question.
    """

    __tablename__ = "answers"

    interview_id: Mapped[UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[UUID] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="created",
        index=True,
    )  # created, recording, uploaded, transcribing, processing, transcribed, failed

    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Object storage reference
    audio_storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    audio_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audio_checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Relationships
    interview: Mapped[Interview] = relationship(
        "Interview", back_populates="answers", lazy="selectin"
    )
    question: Mapped[Question] = relationship(
        "Question", back_populates="answers", lazy="selectin"
    )
    transcript: Mapped[Transcript | None] = relationship(
        "Transcript",
        back_populates="answer",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    speech_metrics: Mapped[SpeechMetrics | None] = relationship(
        "SpeechMetrics",
        back_populates="answer",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Answer id={self.id} status={self.status} duration={self.duration_seconds}s>"
