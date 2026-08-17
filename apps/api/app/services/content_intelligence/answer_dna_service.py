"""
APTLY — Answer DNA & Competency Coverage Service

Extracts structural DNA from candidate answers and evaluates end-to-end JD competency coverage:
- Technical DNA (7 dimensions): problem, approach, reasoning, implementation, tradeoff, validation, result
- Behavioral DNA (6 dimensions): situation, task, action, result, ownership, learning
- Competency Coverage (TESTED, DEMONSTRATED, WEAK_EVIDENCE, NOT_TESTED)
"""

from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from app.core.logging import get_logger
from app.models.content_metrics import ContentMetrics
from app.schemas.answer_dna import (
    BehavioralAnswerDNA,
    CompetencyCoverageStatus,
    CompetencyItemEvaluation,
    DNADimension,
    SessionCompetencyCoverage,
    TechnicalAnswerDNA,
)

logger = get_logger(__name__)


class AnswerDNAService:
    """
    Analyzes structural completeness of candidate answers and cross-references them
    against target Job Description competencies.
    """

    def extract_technical_dna(
        self,
        transcript: str,
        content_metrics: ContentMetrics | None = None,
    ) -> TechnicalAnswerDNA:
        """Extracts the 7 technical dimensions from candidate speech."""
        text = transcript.lower()

        # 1. Problem
        prob_match = re.search(r"\b(?:problem|issue|challenge|bottleneck|constraint|struggled with|needed to)\b", text)
        prob_present = bool(prob_match or len(text.split()) > 25)
        prob_quote = transcript[:80] if prob_present else None
        problem = DNADimension(
            name="problem",
            present=prob_present,
            quality=85.0 if prob_present else 0.0,
            evidence_quote=prob_quote,
            missing_reason=None if prob_present else "Problem context or initial bottleneck was not clearly stated.",
        )

        # 2. Approach
        appr_match = re.search(r"\b(?:approach|designed|architected|strategy|pattern|structured|decided to)\b", text)
        appr_present = bool(appr_match or len(text.split()) > 30)
        approach = DNADimension(
            name="approach",
            present=appr_present,
            quality=85.0 if appr_present else 0.0,
            evidence_quote=transcript[:100] if appr_present else None,
            missing_reason=None if appr_present else "High-level architecture or solution strategy omitted.",
        )

        # 3. Reasoning
        reas_match = re.search(r"\b(?:because|since|in order to|reason was|to avoid|the goal was)\b", text)
        reas_present = bool(reas_match)
        reasoning = DNADimension(
            name="reasoning",
            present=reas_present,
            quality=80.0 if reas_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:because|since|in order to)\b"),
            missing_reason=None if reas_present else "Did not explain the architectural reasoning behind technical choices.",
        )

        # 4. Implementation
        impl_match = re.search(r"\b(?:implemented|built|coded|wrote|postgres|redis|kafka|docker|index|query|schema|api|service)\b", text)
        impl_present = bool(impl_match)
        implementation = DNADimension(
            name="implementation",
            present=impl_present,
            quality=90.0 if impl_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:implemented|built|postgres|redis|kafka|index|schema)\b"),
            missing_reason=None if impl_present else "Lacked concrete tools, data structures, or implementation specifics.",
        )

        # 5. Tradeoff
        trade_match = re.search(r"\b(?:tradeoff|trade-off|alternative|compared to|instead of|evaluated|rejected|drawback|downside)\b", text)
        trade_present = bool(trade_match)
        tradeoff = DNADimension(
            name="tradeoff",
            present=trade_present,
            quality=85.0 if trade_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:tradeoff|trade-off|instead of|compared to)\b"),
            missing_reason=None if trade_present else "No alternatives or trade-offs were discussed.",
        )

        # 6. Validation
        val_match = re.search(r"\b(?:tested|benchmarked|monitored|load test|a/b test|metrics showed|verified|datadog|prometheus|validated)\b", text)
        val_present = bool(val_match)
        validation = DNADimension(
            name="validation",
            present=val_present,
            quality=90.0 if val_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:tested|benchmarked|monitored|load test|verified|validated)\b"),
            missing_reason=None if val_present else "Missing empirical verification (e.g. load testing, canary, benchmarks).",
        )

        # 7. Result
        res_match = re.search(r"\b(?:result|reduced|improved|increased|dropped|achieved|throughput|\d+%|\d+ms)\b", text)
        res_present = bool(res_match)
        result = DNADimension(
            name="result",
            present=res_present,
            quality=90.0 if res_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:reduced|improved|increased|achieved|\d+%|\d+ms)\b"),
            missing_reason=None if res_present else "Did not conclude with a measurable outcome or impact metric.",
        )

        dimensions = [problem, approach, reasoning, implementation, tradeoff, validation, result]
        present_count = sum(1 for d in dimensions if d.present)
        completeness = round((present_count / 7.0) * 100.0, 1)
        missing = [d.name for d in dimensions if not d.present]

        return TechnicalAnswerDNA(
            problem=problem,
            approach=approach,
            reasoning=reasoning,
            implementation=implementation,
            tradeoff=tradeoff,
            validation=validation,
            result=result,
            completeness_score=completeness,
            missing_dimensions=missing,
        )

    def extract_behavioral_dna(
        self,
        transcript: str,
        content_metrics: ContentMetrics | None = None,
    ) -> BehavioralAnswerDNA:
        """Extracts the 6 behavioral dimensions from candidate speech."""
        text = transcript.lower()

        # 1. Situation
        sit_present = len(text.split()) > 15
        situation = DNADimension(
            name="situation",
            present=sit_present,
            quality=80.0 if sit_present else 0.0,
            evidence_quote=transcript[:90] if sit_present else None,
            missing_reason=None if sit_present else "Initial situation and business context omitted.",
        )

        # 2. Task
        task_match = re.search(r"\b(?:my role|my task|needed to|was responsible for|challenge was)\b", text)
        task_present = bool(task_match or sit_present)
        task = DNADimension(
            name="task",
            present=task_present,
            quality=85.0 if task_present else 0.0,
            evidence_quote=transcript[:100] if task_present else None,
            missing_reason=None if task_present else "Specific objective or assignment was unclear.",
        )

        # 3. Action
        act_match = re.search(r"\b(?:i did|i organized|i implemented|i spoke with|i aligned|i initiated)\b", text)
        act_present = bool(act_match or len(text.split()) > 30)
        action = DNADimension(
            name="action",
            present=act_present,
            quality=85.0 if act_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:i did|i organized|i implemented|i spoke|i aligned)\b"),
            missing_reason=None if act_present else "Did not describe concrete actions taken.",
        )

        # 4. Result
        res_match = re.search(r"\b(?:result was|in the end|successfully|we delivered|impact was|achieved|\d+%)\b", text)
        res_present = bool(res_match)
        result = DNADimension(
            name="result",
            present=res_present,
            quality=85.0 if res_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:result was|successfully|delivered|impact|achieved|\d+%)\b"),
            missing_reason=None if res_present else "Omitted measurable final result or business impact.",
        )

        # 5. Ownership
        own_match = re.search(r"\b(?:i personally|i led|my direct responsibility|my contribution)\b", text)
        own_present = bool(own_match)
        ownership = DNADimension(
            name="ownership",
            present=own_present,
            quality=90.0 if own_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:i personally|i led|my direct|my contribution)\b"),
            missing_reason=None if own_present else "Personal contribution was not distinguished from general team effort.",
        )

        # 6. Learning
        learn_match = re.search(r"\b(?:learned|takeaway|in retrospect|what i took from|going forward|improved our process)\b", text)
        learn_present = bool(learn_match)
        learning = DNADimension(
            name="learning",
            present=learn_present,
            quality=90.0 if learn_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:learned|takeaway|in retrospect|going forward)\b"),
            missing_reason=None if learn_present else "No retrospective learning or process takeaway shared.",
        )

        dimensions = [situation, task, action, result, ownership, learning]
        present_count = sum(1 for d in dimensions if d.present)
        completeness = round((present_count / 6.0) * 100.0, 1)
        missing = [d.name for d in dimensions if not d.present]

        return BehavioralAnswerDNA(
            situation=situation,
            task=task,
            action=action,
            result=result,
            ownership=ownership,
            learning=learning,
            completeness_score=completeness,
            missing_dimensions=missing,
        )

    def evaluate_session_competencies(
        self,
        interview_id: str,
        target_competencies: list[str],
        questions_with_answers: list[dict[str, Any]],
    ) -> SessionCompetencyCoverage:
        """
        Evaluates which target Job Description competencies were TESTED, DEMONSTRATED,
        WEAK_EVIDENCE, or NOT_TESTED across the session.
        Important: NOT_TESTED is explicitly framed as an unassessed area, not candidate failure.
        """
        evaluations: list[CompetencyItemEvaluation] = []
        demonstrated_count = 0
        weak_count = 0
        not_tested_count = 0

        # Build mapping of competency occurrences in asked questions
        for comp in target_competencies:
            comp_lower = comp.lower()
            matching_items = []

            for item in questions_with_answers:
                q = item.get("question") or {}
                q_text = (q.get("question_text") or "").lower()
                q_comp = (q.get("competency") or "").lower()
                ans = item.get("answer") or {}
                content = item.get("content_metrics") or {}

                if comp_lower in q_comp or comp_lower in q_text:
                    matching_items.append(item)

            if not matching_items:
                # Competency was not tested
                not_tested_count += 1
                evaluations.append(
                    CompetencyItemEvaluation(
                        competency_name=comp,
                        status=CompetencyCoverageStatus.NOT_TESTED,
                        score=0.0,
                        evidence_snippets=[],
                        question_sequence_numbers=[],
                        explanation=f"'{comp}' was not targeted by any question during this session. This does not indicate poor candidate performance.",
                    )
                )
            else:
                # Competency was tested
                scores = []
                snippets = []
                seqs = []

                for item in matching_items:
                    q = item.get("question") or {}
                    ans = item.get("answer") or {}
                    trans = item.get("transcript") or {}
                    content = item.get("content_metrics") or {}
                    seq = q.get("sequence_number", 1)
                    seqs.append(seq)

                    # Compute score from content metrics
                    score = content.get("overall_content_score", 75.0)
                    scores.append(score)

                    transcript = (
                        ans.get("transcript_text")
                        or trans.get("full_text")
                        or ans.get("transcript")
                        or ""
                    )
                    if transcript:
                        snippets.append(transcript[:120])

                avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

                if avg_score >= 70.0:
                    demonstrated_count += 1
                    status = CompetencyCoverageStatus.DEMONSTRATED
                    explanation = f"Candidate demonstrated strong capability in '{comp}' backed by concrete examples and sound architecture."
                else:
                    weak_count += 1
                    status = CompetencyCoverageStatus.WEAK_EVIDENCE
                    explanation = f"Candidate answered questions regarding '{comp}', but evidence or technical depth was incomplete."

                evaluations.append(
                    CompetencyItemEvaluation(
                        competency_name=comp,
                        status=status,
                        score=avg_score,
                        evidence_snippets=snippets,
                        question_sequence_numbers=seqs,
                        explanation=explanation,
                    )
                )

        total = len(target_competencies)
        coverage_pct = round(((demonstrated_count + weak_count) / max(1, total)) * 100.0, 1)

        return SessionCompetencyCoverage(
            interview_id=interview_id,
            total_competencies=total,
            demonstrated_count=demonstrated_count,
            weak_evidence_count=weak_count,
            not_tested_count=not_tested_count,
            coverage_percentage=coverage_pct,
            competencies=evaluations,
        )

    def _extract_sentence_match(self, text: str, pattern: str) -> str | None:
        """Extracts the exact sentence containing a regex match."""
        sentences = re.split(r"(?<=[.!?])\s+", text)
        for s in sentences:
            if re.search(pattern, s, re.IGNORECASE):
                return s.strip()
        return None
