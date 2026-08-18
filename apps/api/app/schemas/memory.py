"""
APTLY API — Session Memory Schemas

Pydantic schemas for relational session memory extraction, retrieval, and consistency checking.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import AptlyBaseModel


class MemoryType(StrEnum):
    """Supported domain memory categories."""

    CLAIMS = "claims"
    TECHNOLOGIES = "technologies"
    METRICS = "metrics"
    DECISIONS = "decisions"
    ARCHITECTURE = "architecture"
    OWNERSHIP = "ownership"
    EVIDENCE = "evidence"
    OPEN_QUESTIONS = "open_questions"
    CONTRADICTIONS = "contradictions"


class MemoryEntry(AptlyBaseModel):
    """Single discrete memory item extracted from an interview answer."""

    id: str | None = None
    interview_id: str
    question_id: str | None = None
    turn_number: int = 1
    memory_type: MemoryType
    entity_key: str = Field(description="Normalized entity key (e.g. 'PostgreSQL', 'latency')")
    entity_value: str = Field(description="Summary / value of what was stated")
    quote: str | None = Field(default=None, description="Exact spoken phrase")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class ContradictionItem(AptlyBaseModel):
    """Detected potential conflict between statements across turns."""

    entity_key: str
    first_statement: str
    first_turn: int
    second_statement: str
    second_turn: int
    suggested_probe: str = Field(
        description="Polite, non-accusatory question clarifying the relationship between statements"
    )


class SessionMemorySummary(AptlyBaseModel):
    """Compact summary of active session memories for an interview."""

    interview_id: str
    total_memories: int
    technologies: list[str] = Field(default_factory=list)
    claims: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    contradictions: list[ContradictionItem] = Field(default_factory=list)
