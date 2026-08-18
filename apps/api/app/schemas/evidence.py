"""
APTLY API — Universal Evidence Event Schema

Standardized evidence event contract grounding all coaching insights,
deterministic speech metrics, and semantic intelligence into timestamped records.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import Field, model_validator

from app.schemas.common import AptlyBaseModel


class EvidenceEventType(StrEnum):
    """Universal categorization of evidence events."""

    FILLER = "filler"
    PAUSE = "pause"
    PACE_SHIFT = "pace_shift"
    CAMERA_ATTENTION = "camera_attention"
    VOICE_ENERGY = "voice_energy"
    UNSUPPORTED_CLAIM = "unsupported_claim"
    STAR_GAP = "star_gap"
    OWNERSHIP_GAP = "ownership_gap"
    CONSISTENCY_ISSUE = "consistency_issue"
    STRONG_EVIDENCE = "strong_evidence"
    CHALLENGE = "challenge"
    PRESSURE_EVENT = "pressure_event"


class EvidenceSource(StrEnum):
    """Origin pipeline for the evidence event."""

    MEASURED = "MEASURED"
    DERIVED = "DERIVED"
    AI_EVALUATED = "AI_EVALUATED"
    UNAVAILABLE = "UNAVAILABLE"


class EvidenceEvent(AptlyBaseModel):
    """
    Universal Evidence Event contract.

    Every report insight must be traceable to one or more evidence events.
    No evidence event means no evidence-backed claim.
    """

    id: str = Field(default_factory=lambda: f"evt-{uuid4().hex[:12]}")
    session_id: str = Field(description="Interview session ID (UUID or identifier)")
    turn_id: str = Field(description="Question or Answer turn ID")
    type: EvidenceEventType = Field(description="Standardized event type")
    start_ms: int = Field(ge=0, description="Start offset in milliseconds from turn start")
    end_ms: int = Field(ge=0, description="End offset in milliseconds from turn start")
    severity: int = Field(default=1, ge=1, le=5, description="Coaching priority from 1 (minor) to 5 (critical)")
    reliability: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")
    title: str = Field(description="Short human-readable summary of what happened")
    explanation: str = Field(description="Why this matters, coaching context, and impact")
    payload: dict[str, Any] = Field(default_factory=dict, description="Arbitrary structured metadata")
    source: EvidenceSource = Field(default=EvidenceSource.MEASURED, description="Origin and measurement method")

    @model_validator(mode="after")
    def validate_timestamp_range(self) -> EvidenceEvent:
        """Ensure end_ms is greater than or equal to start_ms."""
        if self.end_ms < self.start_ms:
            raise ValueError(
                f"end_ms ({self.end_ms}) cannot be less than start_ms ({self.start_ms})"
            )
        return self

    # ── Backward Compatibility Properties ─────────────────────────────────────

    @property
    def start_seconds(self) -> float:
        """Start timestamp in seconds."""
        return round(self.start_ms / 1000.0, 3)

    @property
    def end_seconds(self) -> float:
        """End timestamp in seconds."""
        return round(self.end_ms / 1000.0, 3)

    @property
    def description(self) -> str:
        """Alias for explanation."""
        return self.explanation

    @property
    def quote(self) -> str | None:
        """Convenience accessor for transcript quote payload."""
        return (
            self.payload.get("quote")
            or self.payload.get("word")
            or self.payload.get("text")
        )
