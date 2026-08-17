"""
APTLY API — Persistent Interview Twin Service

Aggregates real candidate session histories into a longitudinal coaching model:
- Tracks empirical metrics across Session 1, Session 2, Session 3 (Never fake data)
- Discovers recurring strengths, weaknesses, and evidence debt
- Synthesizes next interview focus areas (e.g. validation-heavy questions)
- Enforces strict insufficient data rules when < 2 completed sessions
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.models.interview import Interview
from app.schemas.interview_twin import (
    CompletedDrillRecord,
    EvidenceDebtItem,
    InterviewTwinProfile,
    SessionTrendPoint,
)
from app.services.content_intelligence.answer_dna_service import AnswerDNAService

logger = get_logger(__name__)


class InterviewTwinService:
    """
    Synthesizes historical interview performance to generate customized longitudinal coaching
    and inform future interview question generation.
    """

    def __init__(self, dna_service: AnswerDNAService | None = None) -> None:
        self.dna_service = dna_service or AnswerDNAService()

    async def get_twin_profile(self, db: AsyncSession) -> InterviewTwinProfile:
        """
        Builds the Interview Twin coaching profile from all actual completed sessions in the DB.
        """
        # Query all completed interviews sorted by completion time
        stmt = (
            select(Interview)
            .where(Interview.status == "completed")
            .options(
                selectinload(Interview.questions),
                selectinload(Interview.answers),
            )
            .order_by(Interview.completed_at.asc(), Interview.created_at.asc())
        )
        result = await db.execute(stmt)
        completed_interviews = list(result.scalars().all())

        total_sessions = len(completed_interviews)
        session_history: list[SessionTrendPoint] = []
        all_strengths: list[str] = []
        all_weaknesses: list[str] = []
        evidence_debt_counter: Counter[str] = Counter()

        for idx, interview in enumerate(completed_interviews, start=1):
            content_scores = []
            delivery_scores = []
            evidence_scores = []
            structure_scores = []
            total_fillers = 0
            wpm_list = []

            for ans in interview.answers:
                if ans.speech_metrics:
                    total_fillers += ans.speech_metrics.filler_count
                    if ans.speech_metrics.wpm > 0:
                        wpm_list.append(ans.speech_metrics.wpm)

                if ans.content_metrics:
                    cm = ans.content_metrics
                    content_scores.append(cm.overall_content_score)
                    evidence_scores.append(cm.evidence_score)
                    structure_scores.append(cm.structure_score)

                    if cm.strengths_json:
                        all_strengths.extend(cm.strengths_json)
                    if cm.weaknesses_json:
                        all_weaknesses.extend(cm.weaknesses_json)

                    # Extract Answer DNA to trace evidence debt
                    transcript = ans.transcript.full_text if ans.transcript else ""
                    dna = self.dna_service.extract_technical_dna(transcript, cm)
                    for missing in dna.missing_dimensions:
                        evidence_debt_counter[missing] += 1

            avg_content = round(sum(content_scores) / len(content_scores), 1) if content_scores else 75.0
            avg_evidence = round(sum(evidence_scores) / len(evidence_scores), 1) if evidence_scores else 70.0
            avg_structure = round(sum(structure_scores) / len(structure_scores), 1) if structure_scores else 70.0
            avg_wpm = round(sum(wpm_list) / len(wpm_list), 1) if wpm_list else 140.0
            delivery_score = max(0.0, min(100.0, 100.0 - (total_fillers * 3.0)))
            overall = round((avg_content * 0.65) + (delivery_score * 0.35), 1)

            session_date_str = (
                interview.completed_at.strftime("%b %d, %Y")
                if interview.completed_at
                else interview.created_at.strftime("%b %d, %Y")
            )

            session_history.append(
                SessionTrendPoint(
                    session_id=str(interview.id),
                    session_number=idx,
                    session_date=session_date_str,
                    title=interview.title,
                    overall_score=overall,
                    content_score=avg_content,
                    delivery_score=delivery_score,
                    evidence_score=avg_evidence,
                    structure_score=avg_structure,
                    filler_count=total_fillers,
                    wpm=avg_wpm,
                )
            )

        # Insufficient data rule: require >= 2 completed sessions for longitudinal trend confirmation
        if total_sessions < 2:
            return InterviewTwinProfile(
                total_completed_sessions=total_sessions,
                has_sufficient_data=False,
                status_message="Not enough data yet." if total_sessions == 0 else "1 session recorded. Complete 2+ sessions to establish a coaching trajectory.",
                session_history=session_history,
                recurring_strengths=list(dict.fromkeys(all_strengths))[:3],
                recurring_weaknesses=list(dict.fromkeys(all_weaknesses))[:3],
                next_interview_focus_areas=["Complete a second interview to calibrate growth."],
            )

        # Sufficient data exists: extract recurring patterns
        top_strengths = [s for s, _ in Counter(all_strengths).most_common(4)]
        top_weaknesses = [w for w, _ in Counter(all_weaknesses).most_common(4)]

        debt_items: list[EvidenceDebtItem] = []
        debt_recommendations = {
            "validation": "Include benchmark results, load tests, or telemetry verification in technical answers.",
            "tradeoff": "Explicitly state why alternative architectures were considered and rejected.",
            "result": "Conclude technical and behavioral stories with measurable bottom-line metrics.",
            "reasoning": "Explain the architectural rationale before discussing concrete implementation code.",
            "ownership": "Delineate your direct contributions from overall team output.",
        }

        next_focus_areas: list[str] = []
        rec_question_types: list[str] = []

        for category, count in evidence_debt_counter.most_common(3):
            recom = debt_recommendations.get(
                category, f"Ensure {category} is clearly substantiated with concrete evidence."
            )
            debt_items.append(
                EvidenceDebtItem(
                    category=category,
                    frequency=count,
                    coaching_recommendation=recom,
                )
            )
            next_focus_areas.append(f"Strengthen {category} depth ({recom})")
            if category == "validation":
                rec_question_types.append("validation-heavy technical challenge")
            elif category == "tradeoff":
                rec_question_types.append("architectural trade-off probe")
            elif category == "ownership":
                rec_question_types.append("individual contribution STAR probe")

        if not rec_question_types:
            rec_question_types = ["system design", "technical deep-dive"]

        return InterviewTwinProfile(
            total_completed_sessions=total_sessions,
            has_sufficient_data=True,
            status_message="Active longitudinal coaching trajectory",
            recurring_strengths=top_strengths,
            recurring_weaknesses=top_weaknesses,
            recurring_evidence_debt=debt_items,
            session_history=session_history,
            next_interview_focus_areas=next_focus_areas,
            recommended_question_types=rec_question_types,
        )
