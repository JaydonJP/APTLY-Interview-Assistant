"""
Unit and Integration Tests for Upgraded Repair Mode.

Tests cover:
- All 9 specialized drills
- The 7-stage Repair cycle evaluation
- Verified Before/After calculations (Evidence: 42 -> 81, Fillers: 7 -> 3, Structure: 58 -> 88)
- Strict Rule: Never claim improvement unless both attempts have real measurements
- Drill auto-selection based on empirical gaps
"""

from uuid import uuid4
import pytest

from app.models.content_metrics import ContentMetrics
from app.models.metrics import SpeechMetrics
from app.schemas.repair import (
    RepairDrillType,
    RepairMetricsSnapshot,
)
from app.services.repair_service import DRILL_CATALOG, RepairService


# ── 1. All 9 Specialized Drills Catalog Validation ───────────────────────────


def test_all_nine_repair_drills_exist():
    """Verify all 9 specified Repair Drills exist in the catalog."""
    expected_drills = [
        RepairDrillType.METRIC_BASELINE_METHOD,
        RepairDrillType.RESULT_FIRST,
        RepairDrillType.OWNERSHIP_DRILL,
        RepairDrillType.VALIDATION_DRILL,
        RepairDrillType.TRADEOFF_DRILL,
        RepairDrillType.STAR_RESULT_DRILL,
        RepairDrillType.FILLER_REDUCTION_DRILL,
        RepairDrillType.PAUSE_RECOVERY_DRILL,
        RepairDrillType.TECHNICAL_DEPTH_DRILL,
    ]

    for drill in expected_drills:
        assert drill in DRILL_CATALOG
        drill_info = DRILL_CATALOG[drill]
        assert "title" in drill_info
        assert "description" in drill_info
        assert "example" in drill_info


# ── 2. Before / After Comparison Calculation ──────────────────────────────────


def test_before_after_metric_comparison_example_values():
    """
    Test Case Requirement:
    Example:
    Evidence: 42 → 81
    Fillers: 7 → 3
    Structure: 58 → 88
    """
    service = RepairService()

    before = RepairMetricsSnapshot(
        evidence_score=42.0,
        filler_count=7,
        structure_score=58.0,
        technical_depth_score=50.0,
        relevance_score=80.0,
        has_real_measurements=True,
    )

    after = RepairMetricsSnapshot(
        evidence_score=81.0,
        filler_count=3,
        structure_score=88.0,
        technical_depth_score=75.0,
        relevance_score=90.0,
        has_real_measurements=True,
    )

    eval_result = service.evaluate_before_after(
        interview_id=str(uuid4()),
        question_id=str(uuid4()),
        weakness_title="Unsupported Metric Gap",
        evidence_snippet="I improved throughput by 40%.",
        explanation="Baseline and validation method were missing.",
        drill_type=RepairDrillType.METRIC_BASELINE_METHOD,
        before=before,
        after=after,
    )

    assert eval_result.improvement_verified is True

    deltas = {d.metric_name: d for d in eval_result.deltas}

    # 1. Evidence: 42 -> 81
    assert "Evidence" in deltas
    assert deltas["Evidence"].display_text == "42 → 81"
    assert deltas["Evidence"].delta == 39.0
    assert deltas["Evidence"].improved is True

    # 2. Fillers: 7 -> 3
    assert "Fillers" in deltas
    assert deltas["Fillers"].display_text == "7 → 3"
    assert deltas["Fillers"].delta == -4.0
    assert deltas["Fillers"].improved is True

    # 3. Structure: 58 -> 88
    assert "Structure" in deltas
    assert deltas["Structure"].display_text == "58 → 88"
    assert deltas["Structure"].delta == 30.0
    assert deltas["Structure"].improved is True


# ── 3. Strict Rule: Never claim improvement without real measurements ─────────


def test_rule_never_claim_improvement_without_real_measurements():
    """
    Critical Rule Requirement:
    Never claim improvement unless both attempts have real measurements.
    """
    service = RepairService()

    # Attempt 1: Incomplete before baseline (no real measurements)
    before_unmeasured = RepairMetricsSnapshot(
        evidence_score=None,
        filler_count=None,
        structure_score=None,
        has_real_measurements=False,
    )

    after_measured = RepairMetricsSnapshot(
        evidence_score=85.0,
        filler_count=2,
        structure_score=90.0,
        has_real_measurements=True,
    )

    eval_unmeasured_before = service.evaluate_before_after(
        interview_id=str(uuid4()),
        question_id=str(uuid4()),
        weakness_title="Gap",
        evidence_snippet="Quote",
        explanation="Explanation",
        drill_type=RepairDrillType.RESULT_FIRST,
        before=before_unmeasured,
        after=after_measured,
    )

    # Must NOT claim verified improvement
    assert eval_unmeasured_before.improvement_verified is False
    assert "Incomplete measurements" in eval_unmeasured_before.summary_verdict


# ── 4. Targeted Drill Selection ───────────────────────────────────────────────


def test_targeted_drill_selection_rules():
    """Verify drill auto-selection routes to correct drill based on measured gaps."""
    service = RepairService()

    # Case A: High filler word count -> Filler reduction drill
    speech_fillers = SpeechMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        speaking_duration_seconds=30.0,
        total_words=60,
        wpm=120.0,
        filler_count=8,
        filler_words_json=[],
        pause_count=1,
        pauses_json=[],
    )
    drill_a = service.select_drill(content_metrics=None, speech_metrics=speech_fillers)
    assert drill_a == RepairDrillType.FILLER_REDUCTION_DRILL

    # Case B: Low evidence score -> Metric-Baseline-Method
    content_low_evidence = ContentMetrics(
        id=uuid4(),
        answer_id=uuid4(),
        overall_content_score=60.0,
        relevance_score=80.0,
        technical_depth_score=80.0,
        structure_score=80.0,
        evidence_score=40.0,
        claims_json=[],
        star_analysis_json={},
        evidence_json=[],
        strengths_json=[],
        weaknesses_json=[],
        feedback_json=[],
        practice_drills_json=[],
    )
    drill_b = service.select_drill(content_metrics=content_low_evidence, speech_metrics=None)
    assert drill_b == RepairDrillType.METRIC_BASELINE_METHOD
