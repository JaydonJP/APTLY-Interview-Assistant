"""
APTLY — Repair Mode Service

Implements the 7-stage Repair cycle:
weakness -> evidence -> explanation -> targeted drill -> retry -> reevaluation -> before/after

Enforces strict measurement validation:
Never claims improvement unless BOTH attempts have real, empirical measurements.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.models.content_metrics import ContentMetrics
from app.models.metrics import SpeechMetrics
from app.schemas.repair import (
    BeforeAfterDelta,
    RepairDrillType,
    RepairMetricsSnapshot,
    RepairSessionEvaluation,
)

logger = get_logger(__name__)

DRILL_CATALOG: dict[RepairDrillType, dict[str, Any]] = {
    RepairDrillType.METRIC_BASELINE_METHOD: {
        "title": "Metric-Baseline-Method Drill",
        "description": "Structure your impact claim: 1) Initial baseline, 2) Precise intervention, 3) Measurement methodology.",
        "example": "Before: 'I improved latency by 40%.' → Repaired: 'Our p99 latency was 320ms; by introducing Redis connection pooling and indexing the query, we brought p99 down to 190ms measured over 2 weeks of production traffic.'",
        "primary_metric": "evidence_score",
    },
    RepairDrillType.RESULT_FIRST: {
        "title": "Result-First Headline Drill",
        "description": "Lead with the concrete outcome in your first sentence before explaining the context and mechanics.",
        "example": "Lead directly with: 'We reduced query runtime from 12s to 400ms by replacing recursive joins with a denormalized read model.'",
        "primary_metric": "structure_score",
    },
    RepairDrillType.OWNERSHIP_DRILL: {
        "title": "Individual Ownership Delineation Drill",
        "description": "Clearly state what was your specific architecture and code contribution vs what the broader team delivered.",
        "example": "'While the team handled client integration, I personally designed the idempotency layer and wrote the Redis locking logic.'",
        "primary_metric": "technical_depth_score",
    },
    RepairDrillType.VALIDATION_DRILL: {
        "title": "Validation & Verification Drill",
        "description": "Walk through the test suite, canary rollout, or benchmark harness used to verify the solution in production.",
        "example": "'We validated the fix by running Locust load tests up to 15,000 rps in staging and monitoring error rates through Datadog.'",
        "primary_metric": "evidence_score",
    },
    RepairDrillType.TRADEOFF_DRILL: {
        "title": "Architectural Tradeoff Drill",
        "description": "Explicitly contrast two viable technical approaches and explain the trade-offs that drove your selection.",
        "example": "'We evaluated Kafka versus RabbitMQ; while RabbitMQ had lower initial setup cost, we chose Kafka for its replayability and high-throughput partition model.'",
        "primary_metric": "technical_depth_score",
    },
    RepairDrillType.STAR_RESULT_DRILL: {
        "title": "STAR Result Punchline Drill",
        "description": "Close your behavioral STAR answer with quantifiable business impact and key lessons learned.",
        "example": "'As a result, API availability increased to 99.98% and on-call paging dropped by 65% over the following quarter.'",
        "primary_metric": "structure_score",
    },
    RepairDrillType.FILLER_REDUCTION_DRILL: {
        "title": "Filler Reduction Drill",
        "description": "Replace verbal crutches ('um', 'like', 'you know') with clean, 1-second deliberate pauses to gather your thoughts.",
        "example": "Pause silently before transitioning to your next point instead of vocalizing fillers.",
        "primary_metric": "filler_count",
    },
    RepairDrillType.PAUSE_RECOVERY_DRILL: {
        "title": "Structured Pause Recovery Drill",
        "description": "When stumped, articulate your mental framework aloud rather than falling into dead air.",
        "example": "'Let me structure this into three parts: data ingestion, storage format, and query caching.'",
        "primary_metric": "pause_count",
    },
    RepairDrillType.TECHNICAL_DEPTH_DRILL: {
        "title": "Technical Depth & Internals Drill",
        "description": "Name specific algorithms, database locking modes, or memory characteristics instead of high-level buzzwords.",
        "example": "'We used optimistic concurrency control with version column checks to prevent lost updates under high write concurrency.'",
        "primary_metric": "technical_depth_score",
    },
}


class RepairService:
    """
    Evaluates repair retries and constructs verifiable before/after comparisons.
    """

    def select_drill(
        self,
        content_metrics: ContentMetrics | None,
        speech_metrics: SpeechMetrics | None,
    ) -> RepairDrillType:
        """Determines the most urgent drill based on measured gaps."""
        if speech_metrics and speech_metrics.filler_count is not None and speech_metrics.filler_count >= 5:
            return RepairDrillType.FILLER_REDUCTION_DRILL

        if content_metrics:
            evidence = content_metrics.evidence_score or 100.0
            structure = content_metrics.structure_score or 100.0
            depth = content_metrics.technical_depth_score or 100.0

            if evidence < 65.0:
                return RepairDrillType.METRIC_BASELINE_METHOD
            if structure < 65.0:
                return RepairDrillType.RESULT_FIRST
            if depth < 65.0:
                return RepairDrillType.TECHNICAL_DEPTH_DRILL

        return RepairDrillType.VALIDATION_DRILL

    def build_metrics_snapshot(
        self,
        content_metrics: ContentMetrics | None = None,
        speech_metrics: SpeechMetrics | None = None,
    ) -> RepairMetricsSnapshot:
        """Constructs a standardized snapshot from measured data."""
        has_real = False
        evidence_score: float | None = None
        filler_count: int | None = None
        structure_score: float | None = None
        technical_depth_score: float | None = None
        relevance_score: float | None = None
        pause_count: int | None = None
        wpm: float | None = None

        if content_metrics:
            evidence_score = content_metrics.evidence_score
            structure_score = content_metrics.structure_score
            technical_depth_score = content_metrics.technical_depth_score
            relevance_score = content_metrics.relevance_score
            if evidence_score is not None or structure_score is not None:
                has_real = True

        if speech_metrics:
            filler_count = speech_metrics.filler_count
            pause_count = speech_metrics.pause_count
            wpm = speech_metrics.wpm
            if filler_count is not None or wpm is not None:
                has_real = True

        return RepairMetricsSnapshot(
            evidence_score=evidence_score,
            filler_count=filler_count,
            structure_score=structure_score,
            technical_depth_score=technical_depth_score,
            relevance_score=relevance_score,
            pause_count=pause_count,
            wpm=wpm,
            has_real_measurements=has_real,
        )

    def evaluate_before_after(
        self,
        interview_id: str,
        question_id: str,
        weakness_title: str,
        evidence_snippet: str,
        explanation: str,
        drill_type: RepairDrillType,
        before: RepairMetricsSnapshot,
        after: RepairMetricsSnapshot,
    ) -> RepairSessionEvaluation:
        """
        Computes exact Before / After deltas adhering strictly to the rule:
        Never claim improvement unless BOTH attempts have real measurements.
        """
        deltas: list[BeforeAfterDelta] = []
        drill_info = DRILL_CATALOG.get(drill_type, DRILL_CATALOG[RepairDrillType.METRIC_BASELINE_METHOD])

        # 1. Evidence Score (higher is better)
        if before.evidence_score is not None and after.evidence_score is not None:
            b_val = round(before.evidence_score, 1)
            a_val = round(after.evidence_score, 1)
            diff = round(a_val - b_val, 1)
            deltas.append(
                BeforeAfterDelta(
                    metric_name="Evidence",
                    before_value=b_val,
                    after_value=a_val,
                    delta=diff,
                    improved=diff > 0,
                    display_text=f"{int(b_val)} → {int(a_val)}",
                )
            )

        # 2. Filler Count (lower is better)
        if before.filler_count is not None and after.filler_count is not None:
            b_val = before.filler_count
            a_val = after.filler_count
            diff = a_val - b_val
            deltas.append(
                BeforeAfterDelta(
                    metric_name="Fillers",
                    before_value=float(b_val),
                    after_value=float(a_val),
                    delta=float(diff),
                    improved=diff < 0,
                    display_text=f"{b_val} → {a_val}",
                )
            )

        # 3. Structure Score (higher is better)
        if before.structure_score is not None and after.structure_score is not None:
            b_val = round(before.structure_score, 1)
            a_val = round(after.structure_score, 1)
            diff = round(a_val - b_val, 1)
            deltas.append(
                BeforeAfterDelta(
                    metric_name="Structure",
                    before_value=b_val,
                    after_value=a_val,
                    delta=diff,
                    improved=diff > 0,
                    display_text=f"{int(b_val)} → {int(a_val)}",
                )
            )

        # 4. Technical Depth Score (higher is better)
        if before.technical_depth_score is not None and after.technical_depth_score is not None:
            b_val = round(before.technical_depth_score, 1)
            a_val = round(after.technical_depth_score, 1)
            diff = round(a_val - b_val, 1)
            deltas.append(
                BeforeAfterDelta(
                    metric_name="Technical Depth",
                    before_value=b_val,
                    after_value=a_val,
                    delta=diff,
                    improved=diff > 0,
                    display_text=f"{int(b_val)} → {int(a_val)}",
                )
            )

        # 5. Relevance Score (higher is better)
        if before.relevance_score is not None and after.relevance_score is not None:
            b_val = round(before.relevance_score, 1)
            a_val = round(after.relevance_score, 1)
            diff = round(a_val - b_val, 1)
            deltas.append(
                BeforeAfterDelta(
                    metric_name="Relevance",
                    before_value=b_val,
                    after_value=a_val,
                    delta=diff,
                    improved=diff > 0,
                    display_text=f"{int(b_val)} → {int(a_val)}",
                )
            )

        # Strict Rule Check
        has_both_real_measurements = before.has_real_measurements and after.has_real_measurements
        any_improvement = any(d.improved for d in deltas)
        improvement_verified = has_both_real_measurements and any_improvement

        if improvement_verified:
            improved_names = [d.metric_name for d in deltas if d.improved]
            summary_verdict = f"Measurable improvement verified across: {', '.join(improved_names)}."
        elif not has_both_real_measurements:
            summary_verdict = "Incomplete measurements: Cannot claim verified improvement without baseline and retry data."
        else:
            summary_verdict = "No significant metric gains detected. Try another rep focusing on the drill instructions."

        return RepairSessionEvaluation(
            interview_id=interview_id,
            question_id=question_id,
            weakness_title=weakness_title,
            evidence_snippet=evidence_snippet,
            explanation=explanation,
            drill=drill_type,
            drill_instructions=drill_info["description"],
            before_metrics=before,
            after_metrics=after,
            deltas=deltas,
            improvement_verified=improvement_verified,
            summary_verdict=summary_verdict,
        )
