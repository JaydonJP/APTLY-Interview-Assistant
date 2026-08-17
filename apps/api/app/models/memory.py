"""
APTLY API — Session Memory ORM Model

Structured relational domain storage for session-level interview memory:
- Technologies mentioned across turns
- Factual and numerical claims
- Metrics & baselines
- Architectural decisions & trade-offs
- Ownership distinctions
- Contradictions & consistency tracking
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class SessionMemory(UUIDMixin, TimestampMixin, Base):
    """
    Structured domain memory record captured during an interview session.
    No vector database required — indexed relational queries provide fast, precise recall.
    """

    __tablename__ = "session_memories"

    interview_id: Mapped[UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("questions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    memory_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # claims, technologies, metrics, decisions, architecture, ownership, evidence, open_questions, contradictions

    entity_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    entity_value: Mapped[str] = mapped_column(String(2048), nullable=False)
    quote: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
