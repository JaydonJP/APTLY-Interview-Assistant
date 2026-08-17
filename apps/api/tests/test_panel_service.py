"""
Tests for APTLY Panel Mode Service, Personas, and Dual-Perspective Evaluation.
"""

from __future__ import annotations

import pytest
from uuid import uuid4

from app.schemas.panel import (
    InterviewerPersona,
    PERSONA_REGISTRY,
    get_all_personas,
    get_persona_profile,
)
from app.services.panel_service import PanelInterviewService


def test_persona_registry_completeness():
    """Verify Sarah Chen (HR) and Alex Rivera (Tech) exist with proper metadata."""
    personas = get_all_personas()
    assert len(personas) >= 2

    hr_profile = get_persona_profile("HR_LEAD")
    assert hr_profile is not None
    assert hr_profile.name == "Sarah Chen"
    assert "HR Lead" in hr_profile.role_title
    assert "communication" in hr_profile.focus_areas

    tech_profile = get_persona_profile("TECH_LEAD")
    assert tech_profile is not None
    assert tech_profile.name == "Alex Rivera"
    assert "Tech Lead" in tech_profile.role_title
    assert "architecture" in tech_profile.focus_areas


def test_assign_persona_by_category():
    """Test persona assignment based on question category and turn number."""
    service = PanelInterviewService()

    # Behavioral / leadership categories route to HR Lead
    assert service.assign_persona("behavioral", 1) == InterviewerPersona.HR_LEAD
    assert service.assign_persona("leadership", 2) == InterviewerPersona.HR_LEAD
    assert service.assign_persona("culture", 3) == InterviewerPersona.HR_LEAD

    # Technical / system design categories route to Tech Lead
    assert service.assign_persona("technical", 1) == InterviewerPersona.TECH_LEAD
    assert service.assign_persona("system_design", 2) == InterviewerPersona.TECH_LEAD
    assert service.assign_persona("architecture", 3) == InterviewerPersona.TECH_LEAD

    # General alternation fallback
    assert service.assign_persona("general", 1) == InterviewerPersona.HR_LEAD
    assert service.assign_persona("general", 2) == InterviewerPersona.TECH_LEAD


def test_compile_panel_report_dual_perspectives():
    """Test synthesis of HR and Technical perspective scorecards with consensus."""
    service = PanelInterviewService()

    questions_review = [
        {
            "question": {
                "sequence_number": 1,
                "category": "behavioral",
                "interviewer_persona": "HR_LEAD",
            },
            "content_metrics": {
                "overall_content_score": 88.0,
                "relevance_score": 90.0,
                "strengths": ["Structured STAR answer", "High accountability"],
                "weaknesses": ["Could quantify team impact"],
            },
            "behavioral_dna": {
                "ownership": {"present": True},
                "learning": {"present": True},
            },
        },
        {
            "question": {
                "sequence_number": 2,
                "category": "technical",
                "interviewer_persona": "TECH_LEAD",
            },
            "content_metrics": {
                "overall_content_score": 92.0,
                "relevance_score": 95.0,
                "strengths": ["Deep distributed cache understanding", "Zero-downtime migrations"],
                "weaknesses": ["Explicit latency bounds omitted"],
            },
            "technical_dna": {
                "tradeoff": {"present": True},
                "validation": {"present": True},
            },
        },
    ]

    report = service.compile_panel_report(questions_review)

    assert report.is_panel_interview is True
    # HR Perspective
    assert report.hr_perspective.overall_score >= 80.0
    assert report.hr_perspective.communication_score >= 80.0
    assert len(report.hr_perspective.strengths) > 0
    assert len(report.hr_perspective.key_observations) > 0

    # Tech Perspective
    assert report.tech_perspective.overall_score >= 80.0
    assert report.tech_perspective.architecture_score >= 80.0
    assert len(report.tech_perspective.strengths) > 0
    assert len(report.tech_perspective.key_observations) > 0

    # Unified signal
    assert report.unified_hiring_signal in ("STRONG_HIRE", "HIRE", "NEEDS_DEVELOPMENT")
    assert len(report.combined_summary) > 20
