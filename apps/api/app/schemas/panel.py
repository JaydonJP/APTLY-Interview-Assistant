"""
APTLY API — Panel Mode Schemas

Defines the multi-persona Panel Interview system:
- Personas: HR Lead (People Partner) & Technical Lead (Staff Architect)
- Focus dimensions (HR: communication, ownership, teamwork, conflict, motivation; Tech: architecture, depth, tradeoffs, validation, scale, failure modes)
- Dual-Perspective Report: HR perspective, Technical perspective, Combined evidence
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import Field

from app.schemas.common import AptlyBaseModel


class InterviewerPersona(StrEnum):
    """Active interviewer persona in Panel Mode."""

    HR_LEAD = "HR_LEAD"
    TECH_LEAD = "TECH_LEAD"


class PersonaProfile(AptlyBaseModel):
    """Metadata describing an active interviewer persona."""

    id: InterviewerPersona
    name: str
    role_title: str
    focus_areas: list[str]
    avatar_accent: str


PERSONA_REGISTRY: dict[InterviewerPersona, PersonaProfile] = {
    InterviewerPersona.HR_LEAD: PersonaProfile(
        id=InterviewerPersona.HR_LEAD,
        name="Sarah Chen",
        role_title="HR Lead & People Partner",
        focus_areas=["communication", "ownership", "teamwork", "conflict", "motivation"],
        avatar_accent="border-violet-400 bg-violet-500/15 text-violet-200",
    ),
    InterviewerPersona.TECH_LEAD: PersonaProfile(
        id=InterviewerPersona.TECH_LEAD,
        name="Alex Rivera",
        role_title="Staff Systems Architect & Tech Lead",
        focus_areas=["architecture", "technical depth", "tradeoffs", "validation", "scale", "failure modes"],
        avatar_accent="border-cyan-400 bg-cyan-500/15 text-cyan-200",
    ),
}


class HRPerspectiveReport(AptlyBaseModel):
    """Behavioral, leadership, and organizational evaluation from the HR Lead."""

    overall_score: float = Field(default=80.0, ge=0.0, le=100.0)
    communication_score: float = Field(default=80.0, ge=0.0, le=100.0)
    ownership_score: float = Field(default=80.0, ge=0.0, le=100.0)
    teamwork_score: float = Field(default=80.0, ge=0.0, le=100.0)
    conflict_resolution_score: float = Field(default=80.0, ge=0.0, le=100.0)
    motivation_alignment: str = "Strong growth mindset and mission clarity"
    key_observations: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    growth_areas: list[str] = Field(default_factory=list)


class TechPerspectiveReport(AptlyBaseModel):
    """Architectural, algorithmic, and production engineering evaluation from the Tech Lead."""

    overall_score: float = Field(default=80.0, ge=0.0, le=100.0)
    architecture_score: float = Field(default=80.0, ge=0.0, le=100.0)
    technical_depth_score: float = Field(default=80.0, ge=0.0, le=100.0)
    tradeoffs_rigor_score: float = Field(default=80.0, ge=0.0, le=100.0)
    validation_methodology_score: float = Field(default=80.0, ge=0.0, le=100.0)
    scale_and_failure_handling: str = "Comprehensive distributed failure mode understanding"
    key_observations: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    growth_areas: list[str] = Field(default_factory=list)


class PanelInterviewReport(AptlyBaseModel):
    """Comprehensive dual-perspective evaluation report for Panel Mode."""

    is_panel_interview: bool = True
    hr_perspective: HRPerspectiveReport = Field(default_factory=HRPerspectiveReport)
    tech_perspective: TechPerspectiveReport = Field(default_factory=TechPerspectiveReport)
    combined_summary: str = ""
    unified_hiring_signal: str = "STRONG_HIRE"


def get_persona_profile(persona: str | InterviewerPersona | None) -> PersonaProfile | None:
    """Retrieve full PersonaProfile given a persona identifier string or enum."""
    if not persona:
        return None
    key = str(persona).upper()
    if key in ("HR_LEAD", "HR", "SARAH_CHEN", "SARAH"):
        return PERSONA_REGISTRY[InterviewerPersona.HR_LEAD]
    if key in ("TECH_LEAD", "TECH", "ALEX_RIVERA", "ALEX"):
        return PERSONA_REGISTRY[InterviewerPersona.TECH_LEAD]
    return PERSONA_REGISTRY.get(persona)  # type: ignore[arg-type]


def get_all_personas() -> list[PersonaProfile]:
    """Retrieve list of all active panel personas."""
    return list(PERSONA_REGISTRY.values())

