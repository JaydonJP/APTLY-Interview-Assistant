"""
APTLY API — Transcript ORM Model
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.answer import Answer


class Transcript(UUIDMixin, TimestampMixin, Base):
    """
    Word-level aligned transcription of an Answer audio.
    """

    __tablename__ = "transcripts"

    answer_id: Mapped[UUID] = mapped_column(
        ForeignKey("answers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    full_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    word_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="en")

    # Timestamped structures: segments and word-level timing
    segments_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    words_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )

    # Provider & model auditability
    model_provider: Mapped[str] = mapped_column(
        String(50), nullable=False, default="mock"
    )
    model_version: Mapped[str] = mapped_column(
        String(100), nullable=False, default="mock-v1.0"
    )
    schema_version: Mapped[str] = mapped_column(
        String(20), nullable=False, default="1.0"
    )

    # Relationships
    answer: Mapped[Answer] = relationship(
        "Answer", back_populates="transcript", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Transcript id={self.id} words={self.word_count}>"
