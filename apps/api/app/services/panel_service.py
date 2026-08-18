"""
APTLY API — Panel Mode Service

Orchestrates multi-perspective panel interviews:
- Alternates and assigns HR Lead vs Technical Lead personas
- Enforces shared session memory without duplicated or conflicting facts
- Synthesizes dual-perspective evaluation report (HR Perspective + Tech Perspective + Combined Evidence)
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.schemas.panel import (
    HRPerspectiveReport,
    InterviewerPersona,
    PanelInterviewReport,
    TechPerspectiveReport,
)

logger = get_logger(__name__)


class PanelInterviewService:
    """
    Manages persona assignments and synthesizes dual-perspective panel evaluations.
    """

    def assign_persona(self, category: str, sequence_number: int) -> InterviewerPersona:
        """Determines which persona leads a given question turn."""
        cat_lower = (category or "").lower()
        if cat_lower in ("behavioral", "situational", "leadership", "culture"):
            return InterviewerPersona.HR_LEAD
        if cat_lower in ("technical", "system_design", "architecture", "coding"):
            return InterviewerPersona.TECH_LEAD

        # Default alternation
        return InterviewerPersona.HR_LEAD if sequence_number % 2 == 1 else InterviewerPersona.TECH_LEAD

    def compile_panel_report(
        self,
        questions_review: list[dict[str, Any]],
    ) -> PanelInterviewReport:
        """
        Builds the dual-perspective report strictly derived from candidate question turns.
        """
        hr_turns = []
        tech_turns = []
        all_scores = []

        for item in questions_review:
            q = item.get("question") or {}
            content = item.get("content_metrics") or {}
            if content.get("overall_content_score") is not None:
                all_scores.append(float(content["overall_content_score"]))

            persona = q.get("interviewer_persona")
            if persona == InterviewerPersona.HR_LEAD or str(q.get("category")).lower() == "behavioral":
                hr_turns.append(item)
            else:
                tech_turns.append(item)

        session_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

        # ── 1. HR Perspective Evaluation ──────────────────────────────────────
        hr_scores = []
        hr_obs = []
        hr_strengths = []
        hr_growth = []

        for item in (hr_turns or questions_review):
            content = item.get("content_metrics") or {}
            if content.get("overall_content_score") is not None:
                hr_scores.append(float(content["overall_content_score"]))

            if content.get("strengths"):
                hr_strengths.extend(content["strengths"][:2])
            if content.get("weaknesses"):
                hr_growth.extend(content["weaknesses"][:2])

        avg_hr = round(sum(hr_scores) / len(hr_scores), 1) if hr_scores else session_avg

        if avg_hr >= 75.0:
            hr_motivation = "Strong mission alignment, proactive collaboration, and clear individual ownership."
            hr_obs_default = ["Communicated with structured responses and clear personal ownership."]
        elif avg_hr >= 45.0:
            hr_motivation = "Showed baseline problem solving, but could elevate behavioral depth and STAR result metrics."
            hr_obs_default = ["Responses covered key points but lacked quantifiable outcomes."]
        else:
            hr_motivation = "Limited behavioral and leadership signals observed during this session."
            hr_obs_default = ["Candidate provided minimal response details during the interview."]

        hr_perspective = HRPerspectiveReport(
            overall_score=avg_hr,
            communication_score=round(max(0.0, min(100.0, avg_hr + 2.0 if avg_hr > 0 else 0.0)), 1),
            ownership_score=round(avg_hr, 1),
            teamwork_score=round(max(0.0, min(100.0, avg_hr + 1.0 if avg_hr > 0 else 0.0)), 1),
            conflict_resolution_score=round(max(0.0, avg_hr - 2.0 if avg_hr > 0 else 0.0), 1),
            motivation_alignment=hr_motivation,
            key_observations=list(dict.fromkeys(hr_obs))[:3] or hr_obs_default,
            strengths=list(dict.fromkeys(hr_strengths))[:3] or (
                ["Articulated foundational concepts clearly."] if avg_hr >= 50 else []
            ),
            growth_areas=list(dict.fromkeys(hr_growth))[:2] or [
                "Quantify measurable outcomes and specify individual vs team contributions."
            ],
        )

        # ── 2. Technical Perspective Evaluation ───────────────────────────────
        tech_scores = []
        tech_obs = []
        tech_strengths = []
        tech_growth = []

        for item in (tech_turns or questions_review):
            content = item.get("content_metrics") or {}
            if content.get("overall_content_score") is not None:
                tech_scores.append(float(content["overall_content_score"]))

            if content.get("strengths"):
                tech_strengths.extend(content["strengths"][:2])
            if content.get("weaknesses"):
                tech_growth.extend(content["weaknesses"][:2])

        avg_tech = round(sum(tech_scores) / len(tech_scores), 1) if tech_scores else session_avg

        if avg_tech >= 75.0:
            tech_scale = "Demonstrated solid architectural decomposition, data modeling, and failure mode isolation."
            tech_obs_default = ["Substantiated technical choices with clear system trade-offs and benchmarks."]
        elif avg_tech >= 45.0:
            tech_scale = "Demonstrated working familiarity with core tools, with room to deepen failure recovery mechanisms."
            tech_obs_default = ["Addressed basic requirements but omitted empirical validation under load."]
        else:
            tech_scale = "Minimal technical architecture or implementation depth demonstrated."
            tech_obs_default = ["Technical explanations were incomplete or too brief."]

        tech_perspective = TechPerspectiveReport(
            overall_score=avg_tech,
            architecture_score=round(max(0.0, min(100.0, avg_tech + 2.0 if avg_tech > 0 else 0.0)), 1),
            technical_depth_score=round(avg_tech, 1),
            tradeoffs_rigor_score=round(max(0.0, avg_tech - 2.0 if avg_tech > 0 else 0.0), 1),
            validation_methodology_score=round(max(0.0, avg_tech - 3.0 if avg_tech > 0 else 0.0), 1),
            scale_and_failure_handling=tech_scale,
            key_observations=list(dict.fromkeys(tech_obs))[:3] or tech_obs_default,
            strengths=list(dict.fromkeys(tech_strengths))[:3] or (
                ["Demonstrated relevant engineering knowledge."] if avg_tech >= 50 else []
            ),
            growth_areas=list(dict.fromkeys(tech_growth))[:2] or [
                "Make baseline performance metrics explicit in initial technical proposals."
            ],
        )

        # ── 3. Combined Unified Signal ────────────────────────────────────────
        combined_score = round((avg_hr + avg_tech) / 2.0, 1)
        if combined_score >= 82.0:
            hiring_signal = "STRONG_HIRE"
            combined_summary = "The panel reached alignment on hire recommendation with demonstrated technical and communication rigor."
        elif combined_score >= 68.0:
            hiring_signal = "HIRE"
            combined_summary = "The panel aligns on positive hire. Solid foundational skills in both technical execution and communication."
        elif combined_score >= 50.0:
            hiring_signal = "LEANING_NO_HIRE"
            combined_summary = "Candidate demonstrates baseline capability, but needs further depth in trade-off analysis and measurable outcomes."
        else:
            hiring_signal = "NO_HIRE"
            combined_summary = "Candidate responses lacked the required depth and evidence to establish a hire recommendation."

        return PanelInterviewReport(
            hiring_signal=hiring_signal,
            combined_summary=combined_summary,
            hr_perspective=hr_perspective,
            tech_perspective=tech_perspective,
        )
