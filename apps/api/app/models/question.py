"""
APTLY API — Question ORM Model
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.answer import Answer
    from app.models.interview import Interview


class Question(UUIDMixin, TimestampMixin, Base):
    """
    Represents an interview question generated for a candidate.
    """

    __tablename__ = "questions"

    interview_id: Mapped[UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="technical")
    question_type: Mapped[str] = mapped_column(String(50), nullable=False, default="concept")
    competency: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    expected_topics: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1")

    # Phase 3 Question Graph & Adaptive Tracking
    parent_question_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("questions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    root_question_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("questions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    question_source: Mapped[str] = mapped_column(String(50), nullable=False, default="initial")
    follow_up_depth: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    target_competency: Mapped[str] = mapped_column(String(100), nullable=False, default="")

    # Relationships
    interview: Mapped[Interview] = relationship(
        "Interview", back_populates="questions", lazy="selectin"
    )
    answers: Mapped[list[Answer]] = relationship(
        "Answer",
        back_populates="question",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Question id={self.id} seq={self.sequence_number} category={self.category}>"
