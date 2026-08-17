"""
APTLY API — Pressure-Aware Adaptive Engine Schemas

Defines the 6 Pressure Levels and 8 Interview Actions for adaptive difficulty modulation:
1 Warmup -> 2 Clarification -> 3 Evidence challenge -> 4 Technical challenge -> 5 Edge case -> 6 Pressure test
"""

from __future__ import annotations

from enum import IntEnum, StrEnum
from typing import Any

from pydantic import Field

from app.schemas.common import AptlyBaseModel


class PressureLevel(IntEnum):
    """6 Adaptive Pressure / Difficulty Levels."""

    WARMUP = 1
    CLARIFICATION = 2
    EVIDENCE_CHALLENGE = 3
    TECHNICAL_CHALLENGE = 4
    EDGE_CASE = 5
    PRESSURE_TEST = 6

    @property
    def label(self) -> str:
        names = {
            1: "Warmup",
            2: "Clarification",
            3: "Evidence challenge",
            4: "Technical challenge",
            5: "Edge case",
            6: "Pressure test",
        }
        return names.get(self.value, "General")


class PressureAction(StrEnum):
    """8 Adaptive Interviewer Actions."""

    CHALLENGE = "challenge"
    CLARIFY = "clarify"
    PROBE = "probe"
    TRADEOFF = "tradeoff"
    EDGE_CASE = "edge_case"
    CONTRADICTION = "contradiction"
    RECOVER = "recover"
    ADVANCE = "advance"


class PressureDecision(AptlyBaseModel):
    """Calibrated pressure modulation decision for the next question."""

    current_level: PressureLevel = PressureLevel.WARMUP
    next_level: PressureLevel = PressureLevel.WARMUP
    action: PressureAction = PressureAction.ADVANCE
    performance_score: float = Field(default=75.0, ge=0.0, le=100.0)
    level_delta: int = Field(default=0, description="+1 on strong, -1 on weak, 0 on hold")
    suggested_prompt_directive: str = Field(
        default="", description="Guiding directive injected into LLM prompt"
    )
    justification: str = ""
