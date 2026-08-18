"""
Unit and Integration Tests for Answer DNA and Competency Coverage.

Fixtures Tested:
1. Strong technical answer (all 7 dimensions: problem, approach, reasoning, implementation, tradeoff, validation, result)
2. Weak technical answer (missing tradeoff, validation)
3. Strong STAR behavioral answer (situation, task, action, result, ownership, learning)
4. Missing result (behavioral answer missing measurable outcome)
5. Missing validation (technical answer missing empirical tests / benchmarks)
6. Uncovered competency (marked NOT_TESTED with non-judgmental explanation)
"""

from uuid import uuid4

import pytest

from app.schemas.answer_dna import (
    CompetencyCoverageStatus,
    SessionCompetencyCoverage,
)
from app.services.content_intelligence.answer_dna_service import AnswerDNAService


@pytest.fixture
def dna_service() -> AnswerDNAService:
    return AnswerDNAService()


# ── Fixtures ─────────────────────────────────────────────────────────────────

STRONG_TECHNICAL_ANSWER = (
    "Our main problem was database lock contention under 10k RPS. "
    "Our approach was to implement a distributed cache-aside architecture because "
    "we needed to reduce direct query load on PostgreSQL to avoid connection pool exhaustion. "
    "We implemented Redis cluster caching with consistent hashing and wrote automated invalidate triggers in Kafka. "
    "The major tradeoff was accepting eventual consistency for 500ms compared to strict serializability. "
    "We validated this by running load test benchmarks on Datadog telemetry before canary rollout. "
    "As a result, p99 latency dropped by 65% and database CPU utilization decreased from 88% to 22%."
)

WEAK_TECHNICAL_ANSWER = (
    "We used a database. When things got slow, we just added more RAM to the server."
)

STRONG_STAR_BEHAVIORAL_ANSWER = (
    "At my previous company, our production API service had intermittent 504 gateway timeouts. "
    "My task was to diagnose the root cause and stabilize the service before Black Friday. "
    "I personally led the investigation, organized a war room with the SRE team, and implemented connection pooling. "
    "As a result, we achieved 99.99% uptime through Black Friday with zero outages. "
    "I personally took direct ownership of the incident runbook, and what I learned from this in retrospect "
    "is that proactive telemetry alerts are vital before scaling."
)

MISSING_RESULT_BEHAVIORAL_ANSWER = (
    "We had a major conflict between the frontend and backend teams regarding API contracts. "
    "I stepped in and organized a workshop to define OpenAPI specs. We talked through the schemas."
)

MISSING_VALIDATION_TECHNICAL_ANSWER = (
    "The problem was slow query execution on our orders table. "
    "Our approach was to redesign the indexing strategy because sequential scans were killing performance. "
    "We implemented composite B-Tree indexes on user_id and created_at in PostgreSQL. "
    "The tradeoff was a 5% increase in write latency instead of instant inserts."
)


# ── Test Cases ───────────────────────────────────────────────────────────────


def test_strong_technical_answer_extracts_all_seven_dimensions(dna_service: AnswerDNAService):
    """Verify that a comprehensive technical answer extracts all 7 dimensions."""
    dna = dna_service.extract_technical_dna(STRONG_TECHNICAL_ANSWER)

    assert dna.problem.present is True
    assert dna.approach.present is True
    assert dna.reasoning.present is True
    assert dna.implementation.present is True
    assert dna.tradeoff.present is True
    assert dna.validation.present is True
    assert dna.result.present is True
    assert dna.completeness_score == 100.0
    assert len(dna.missing_dimensions) == 0


def test_weak_technical_answer_flags_missing_dimensions(dna_service: AnswerDNAService):
    """Verify that a shallow technical answer flags missing dimensions."""
    dna = dna_service.extract_technical_dna(WEAK_TECHNICAL_ANSWER)

    assert dna.tradeoff.present is False
    assert dna.validation.present is False
    assert dna.completeness_score < 50.0
    assert "tradeoff" in dna.missing_dimensions
    assert "validation" in dna.missing_dimensions


def test_strong_star_behavioral_answer_extracts_all_six_dimensions(dna_service: AnswerDNAService):
    """Verify that a full STAR answer extracts situation, task, action, result, ownership, learning."""
    dna = dna_service.extract_behavioral_dna(STRONG_STAR_BEHAVIORAL_ANSWER)

    assert dna.situation.present is True
    assert dna.task.present is True
    assert dna.action.present is True
    assert dna.result.present is True
    assert dna.ownership.present is True
    assert dna.learning.present is True
    assert dna.completeness_score == 100.0
    assert len(dna.missing_dimensions) == 0


def test_behavioral_answer_missing_result(dna_service: AnswerDNAService):
    """Verify that a behavioral story without a concrete outcome flags missing result."""
    dna = dna_service.extract_behavioral_dna(MISSING_RESULT_BEHAVIORAL_ANSWER)

    assert dna.result.present is False
    assert "result" in dna.missing_dimensions
    assert dna.result.missing_reason is not None


def test_technical_answer_missing_validation(dna_service: AnswerDNAService):
    """Verify that technical answer with implementation and tradeoff but no benchmarks flags validation."""
    dna = dna_service.extract_technical_dna(MISSING_VALIDATION_TECHNICAL_ANSWER)

    assert dna.problem.present is True
    assert dna.implementation.present is True
    assert dna.tradeoff.present is True
    assert dna.validation.present is False
    assert "validation" in dna.missing_dimensions
    assert dna.validation.missing_reason is not None


def test_competency_coverage_with_tested_and_uncovered_competencies(dna_service: AnswerDNAService):
    """
    Verify full session coverage matrix:
    - DEMONSTRATED for strong technical answers
    - NOT_TESTED for competencies not asked during the interview
    - Validates rule: NOT_TESTED does not penalize or say candidate is bad.
    """
    interview_id = str(uuid4())
    target_competencies = [
        "Distributed Caching",
        "Incident Management",
        "Kubernetes & Orchestration",  # Uncovered / NOT_TESTED
    ]

    questions_with_answers = [
        {
            "question": {
                "sequence_number": 1,
                "question_text": "How did you handle Distributed Caching and lock contention?",
                "competency": "Distributed Caching",
            },
            "answer": {"transcript": STRONG_TECHNICAL_ANSWER},
            "content_metrics": {"overall_content_score": 92.0},
        },
        {
            "question": {
                "sequence_number": 2,
                "question_text": "Tell me about an Incident Management crisis you resolved.",
                "competency": "Incident Management",
            },
            "answer": {"transcript": STRONG_STAR_BEHAVIORAL_ANSWER},
            "content_metrics": {"overall_content_score": 88.0},
        },
    ]

    coverage: SessionCompetencyCoverage = dna_service.evaluate_session_competencies(
        interview_id=interview_id,
        target_competencies=target_competencies,
        questions_with_answers=questions_with_answers,
    )

    assert coverage.total_competencies == 3
    assert coverage.demonstrated_count == 2
    assert coverage.not_tested_count == 1
    assert coverage.coverage_percentage == 66.7

    # Check the uncovered competency
    uncovered = next(c for c in coverage.competencies if c.competency_name == "Kubernetes & Orchestration")
    assert uncovered.status == CompetencyCoverageStatus.NOT_TESTED
    assert "not indicate poor" in uncovered.explanation.lower() or "not targeted" in uncovered.explanation.lower()

    # Check demonstrated competency
    demonstrated = next(c for c in coverage.competencies if c.competency_name == "Distributed Caching")
    assert demonstrated.status == CompetencyCoverageStatus.DEMONSTRATED
    assert len(demonstrated.evidence_snippets) > 0
