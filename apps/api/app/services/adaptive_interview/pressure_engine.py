"""
APTLY — Pressure-Aware Adaptive Engine Service

Dynamically adjusts question pressure (Levels 1 to 6) based on candidate performance:
- Strong Answer: Increases difficulty level and issues challenge/tradeoff/edge_case.
- Weak Answer: De-escalates difficulty level and issues structured recovery/clarify.
- Guardrails: Professional, rigorous, and supportive; NEVER hostile or abusive.
"""

from __future__ import annotations

from app.core.logging import get_logger
from app.models.content_metrics import ContentMetrics
from app.models.metrics import SpeechMetrics
from app.schemas.pressure_engine import (
    PressureAction,
    PressureDecision,
    PressureLevel,
)

logger = get_logger(__name__)

LEVEL_DIRECTIVES: dict[PressureLevel, str] = {
    PressureLevel.WARMUP: "Level 1 Warmup: Ask open-ended questions establishing high-level architecture and scope.",
    PressureLevel.CLARIFICATION: "Level 2 Clarification: Ask for precise definitions, baselines, and boundaries of the problem.",
    PressureLevel.EVIDENCE_CHALLENGE: "Level 3 Evidence Challenge: Challenge stated metrics, baselines, and validation methodologies.",
    PressureLevel.TECHNICAL_CHALLENGE: "Level 4 Technical Challenge: Probe deeply into internals, locking, concurrency models, and indexing strategies.",
    PressureLevel.EDGE_CASE: "Level 5 Edge Case: Test boundary conditions, failovers, cascading outages, and partial network partitions.",
    PressureLevel.PRESSURE_TEST: "Level 6 Pressure Test: Impose severe constraints (e.g. 10x traffic spike, degraded database latency, 50ms SLA) to test trade-offs under duress.",
}


class PressureEngineService:
    """
    Evaluates real-time candidate answers and calculates the next pressure level and action.
    """

    def evaluate_pressure(
        self,
        current_level: PressureLevel | int = PressureLevel.WARMUP,
        content_metrics: ContentMetrics | None = None,
        speech_metrics: SpeechMetrics | None = None,
        transcript: str = "",
    ) -> PressureDecision:
        """
        Calculates the adaptive pressure modulation for the subsequent turn.
        """
        curr_lvl = PressureLevel(int(current_level))

        # Compute aggregate performance score
        content_score = content_metrics.overall_content_score if content_metrics else 75.0
        relevance_score = content_metrics.relevance_score if content_metrics else 75.0
        depth_score = content_metrics.technical_depth_score if content_metrics else 75.0

        fillers = speech_metrics.filler_count if speech_metrics else 0
        pauses = speech_metrics.pause_count if speech_metrics else 0

        # Weighted performance score
        raw_score = (content_score * 0.5) + (relevance_score * 0.25) + (depth_score * 0.25)

        # Deduct if significant speech distress
        if fillers >= 8 or pauses >= 4:
            raw_score = max(30.0, raw_score - 15.0)

        performance_score = round(raw_score, 1)

        # Rule 1: Strong Candidate (Score >= 80) -> Increase Challenge
        if performance_score >= 80.0:
            next_lvl = PressureLevel(min(6, curr_lvl.value + 1))
            level_delta = next_lvl.value - curr_lvl.value

            if next_lvl == PressureLevel.PRESSURE_TEST:
                action = PressureAction.TRADEOFF
                justification = "Candidate demonstrated mastery; escalating to Level 6 Pressure Test under extreme constraints."
            elif next_lvl == PressureLevel.EDGE_CASE:
                action = PressureAction.EDGE_CASE
                justification = "Candidate answered strongly; escalating to Level 5 Edge Case to test boundary conditions."
            elif next_lvl == PressureLevel.TECHNICAL_CHALLENGE:
                action = PressureAction.CHALLENGE
                justification = "Candidate demonstrated solid competence; escalating to Level 4 Technical Challenge."
            elif next_lvl == PressureLevel.EVIDENCE_CHALLENGE:
                action = PressureAction.CHALLENGE
                justification = "Escalating to Level 3 Evidence Challenge on claims and metrics."
            else:
                action = PressureAction.PROBE
                justification = f"Escalating difficulty to {next_lvl.label}."

        # Rule 2: Weak / Struggling Candidate (Score < 60) -> Recovery & De-escalation
        elif performance_score < 60.0:
            next_lvl = PressureLevel(max(1, curr_lvl.value - 1))
            level_delta = next_lvl.value - curr_lvl.value
            action = PressureAction.RECOVER
            justification = "Candidate struggled with the previous answer; providing a structured recovery ramp-down without hostility."

        # Rule 3: Moderate Candidate (60 - 79.9) -> Hold Level & Clarify/Probe
        else:
            next_lvl = curr_lvl
            level_delta = 0
            action = PressureAction.PROBE if curr_lvl.value >= 3 else PressureAction.CLARIFY
            justification = f"Maintaining current difficulty at {curr_lvl.label} to solidify foundational concepts."

        directive = LEVEL_DIRECTIVES.get(next_lvl, LEVEL_DIRECTIVES[PressureLevel.WARMUP])

        return PressureDecision(
            current_level=curr_lvl,
            next_level=next_lvl,
            action=action,
            performance_score=performance_score,
            level_delta=level_delta,
            suggested_prompt_directive=directive,
            justification=justification,
        )
