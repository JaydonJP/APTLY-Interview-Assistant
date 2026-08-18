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
        text = transcript.lower().strip()
        words = text.split()

        # If response is empty or very short, all dimensions are missing
        if len(words) < 6 or "no speech was detected" in text:
            missing = ["problem", "approach", "reasoning", "implementation", "tradeoff", "validation", "result"]
            return TechnicalAnswerDNA(
                problem=DNADimension(name="problem", present=False, quality=0.0, missing_reason="Problem context was not provided."),
                approach=DNADimension(name="approach", present=False, quality=0.0, missing_reason="High-level solution strategy omitted."),
                reasoning=DNADimension(name="reasoning", present=False, quality=0.0, missing_reason="Architectural reasoning omitted."),
                implementation=DNADimension(name="implementation", present=False, quality=0.0, missing_reason="Tools, data structures, or code specifics omitted."),
                tradeoff=DNADimension(name="tradeoff", present=False, quality=0.0, missing_reason="No architectural trade-offs discussed."),
                validation=DNADimension(name="validation", present=False, quality=0.0, missing_reason="Empirical benchmarks or testing omitted."),
                result=DNADimension(name="result", present=False, quality=0.0, missing_reason="Measurable outcomes omitted."),
                completeness_score=0.0,
                missing_dimensions=missing,
            )

        # 1. Problem
        prob_match = re.search(r"\b(?:problem|issue|challenge|bottleneck|constraint|struggled|needed to|latency|slow|failure)\b", text)
        prob_present = bool(prob_match)
        problem = DNADimension(
            name="problem",
            present=prob_present,
            quality=85.0 if prob_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:problem|issue|challenge|bottleneck|latency|constraint)\b") or transcript[:80],
            missing_reason=None if prob_present else "Problem context or initial bottleneck was not clearly stated.",
        )

        # 2. Approach
        appr_match = re.search(r"\b(?:approach|designed|architected|strategy|pattern|structured|decided to|implemented|solution|pipeline)\b", text)
        appr_present = bool(appr_match)
        approach = DNADimension(
            name="approach",
            present=appr_present,
            quality=85.0 if appr_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:designed|architected|approach|strategy|pipeline)\b") or transcript[:90],
            missing_reason=None if appr_present else "High-level architecture or solution strategy omitted.",
        )

        # 3. Reasoning
        reas_match = re.search(r"\b(?:because|since|in order to|reason was|to avoid|the goal was|to optimize|to ensure)\b", text)
        reas_present = bool(reas_match)
        reasoning = DNADimension(
            name="reasoning",
            present=reas_present,
            quality=80.0 if reas_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:because|since|in order to|to optimize|to avoid)\b"),
            missing_reason=None if reas_present else "Did not explain the architectural reasoning behind technical choices.",
        )

        # 4. Implementation
        impl_match = re.search(r"\b(?:implemented|built|coded|wrote|postgres|postgresql|redis|kafka|docker|index|indexes|query|schema|api|service|caching|python)\b", text)
        impl_present = bool(impl_match)
        implementation = DNADimension(
            name="implementation",
            present=impl_present,
            quality=90.0 if impl_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:implemented|built|postgres|redis|kafka|caching|indexes|python)\b"),
            missing_reason=None if impl_present else "Lacked concrete tools, data structures, or implementation specifics.",
        )

        # 5. Tradeoff
        trade_match = re.search(r"\b(?:tradeoff|trade-off|alternative|compared to|instead of|evaluated|rejected|drawback|downside|consistency|overhead)\b", text)
        trade_present = bool(trade_match)
        tradeoff = DNADimension(
            name="tradeoff",
            present=trade_present,
            quality=85.0 if trade_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:tradeoff|trade-off|instead of|compared to|overhead|consistency)\b"),
            missing_reason=None if trade_present else "No alternatives or trade-offs were discussed.",
        )

        # 6. Validation
        val_match = re.search(r"\b(?:tested|testing|benchmarked|benchmarks|monitored|load test|a/b test|metrics showed|verified|datadog|prometheus|validated|requests per second)\b", text)
        val_present = bool(val_match)
        validation = DNADimension(
            name="validation",
            present=val_present,
            quality=90.0 if val_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:tested|testing|benchmarked|benchmarks|load test|verified|validated|requests per second)\b"),
            missing_reason=None if val_present else "Missing empirical verification (e.g. load testing, canary, benchmarks).",
        )

        # 7. Result
        res_match = re.search(r"\b(?:result|reduced|reducing|improved|increased|dropped|achieved|throughput|\d+%|\d+ms|zero downtime)\b", text)
        res_present = bool(res_match)
        result = DNADimension(
            name="result",
            present=res_present,
            quality=90.0 if res_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:reduced|reducing|improved|increased|achieved|\d+%|\d+ms|zero downtime)\b"),
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
        text = transcript.lower().strip()
        words = text.split()

        if len(words) < 6 or "no speech was detected" in text:
            missing = ["situation", "task", "action", "result", "ownership", "learning"]
            return BehavioralAnswerDNA(
                situation=DNADimension(name="situation", present=False, quality=0.0, missing_reason="Situation context was not provided."),
                task=DNADimension(name="task", present=False, quality=0.0, missing_reason="Task / objective was omitted."),
                action=DNADimension(name="action", present=False, quality=0.0, missing_reason="Specific actions taken were omitted."),
                result=DNADimension(name="result", present=False, quality=0.0, missing_reason="Measurable outcome omitted."),
                ownership=DNADimension(name="ownership", present=False, quality=0.0, missing_reason="Personal ownership was unclear."),
                learning=DNADimension(name="learning", present=False, quality=0.0, missing_reason="Retrospective takeaways omitted."),
                completeness_score=0.0,
                missing_dimensions=missing,
            )

        sit_match = re.search(r"\b(?:at my previous|when i was at|in my role|we were working on|the context was|production api|project)\b", text)
        sit_present = bool(sit_match)
        situation = DNADimension(
            name="situation",
            present=sit_present,
            quality=80.0 if sit_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:at my previous|when i was|in my role|project|production api)\b") or transcript[:80],
            missing_reason=None if sit_present else "Situation context not clearly established.",
        )

        task_match = re.search(r"\b(?:my task was|my goal was|i was tasked with|we needed to|the goal was|objective|diagnose|stabilize)\b", text)
        task_present = bool(task_match)
        task = DNADimension(
            name="task",
            present=task_present,
            quality=80.0 if task_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:my task was|my goal was|tasked with|needed to|objective|diagnose)\b") or transcript[:80],
            missing_reason=None if task_present else "Specific objective or challenge was omitted.",
        )

        act_match = re.search(r"\b(?:i personally led|i led|i implemented|i designed|i proposed|i stepped in|i decided to|i built|investigation|organized|pooling)\b", text)
        act_present = bool(act_match)
        action = DNADimension(
            name="action",
            present=act_present,
            quality=85.0 if act_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:i personally led|i led|i implemented|i designed|investigation|organized)\b") or transcript[:90],
            missing_reason=None if act_present else "Concrete individual actions taken were not detailed.",
        )

        res_match = re.search(r"\b(?:as a result|ultimately|the outcome was|we achieved|successfully|improved by|zero outages|\d+%)|\b99\.\d+%", text)
        res_present = bool(res_match)
        result = DNADimension(
            name="result",
            present=res_present,
            quality=85.0 if res_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:as a result|outcome|achieved|improved|zero outages|\d+%)\b") or transcript[:80],
            missing_reason=None if res_present else "Measurable outcome or business impact omitted.",
        )

        own_match = re.search(r"\b(?:i personally took|direct ownership|ownership of|i was responsible|i took ownership|i led|my direct contribution|i owned)\b", text)
        own_present = bool(own_match)
        ownership = DNADimension(
            name="ownership",
            present=own_present,
            quality=85.0 if own_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:i personally took|direct ownership|ownership of|i was responsible)\b") or transcript[:80],
            missing_reason=None if own_present else "Personal contribution vs team action was unclear.",
        )

        learn_match = re.search(r"\b(?:what i learned|i learned|in retrospect|looking back|key takeaway|what i would do differently|vital before)\b", text)
        learn_present = bool(learn_match)
        learning = DNADimension(
            name="learning",
            present=learn_present,
            quality=80.0 if learn_present else 0.0,
            evidence_quote=self._extract_sentence_match(transcript, r"\b(?:what i learned|i learned|in retrospect|looking back|key takeaway)\b") or transcript[:80],
            missing_reason=None if learn_present else "Did not articulate retrospective learnings or reflection.",
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
        """
        evaluations: list[CompetencyItemEvaluation] = []
        demonstrated_count = 0
        weak_count = 0
        not_tested_count = 0

        for comp in target_competencies:
            comp_lower = comp.lower()
            matching_items = []

            for item in questions_with_answers:
                q = item.get("question") or {}
                q_text = (q.get("question_text") or "").lower()
                q_comp = (q.get("competency") or "").lower()

                if comp_lower in q_comp or comp_lower in q_text:
                    matching_items.append(item)

            if not matching_items:
                not_tested_count += 1
                evaluations.append(
                    CompetencyItemEvaluation(
                        competency_name=comp,
                        status=CompetencyCoverageStatus.NOT_TESTED,
                        score=0.0,
                        evidence_snippets=[],
                        question_sequence_numbers=[],
                        explanation=f"'{comp}' was not targeted by any question during this session. This does not indicate poor candidate capability.",
                    )
                )
            else:
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

                    score = float(content.get("overall_content_score", 0.0) if content else 0.0)
                    scores.append(score)

                    transcript_str = (
                        ans.get("transcript_text")
                        or trans.get("full_text")
                        or ans.get("transcript")
                        or ""
                    )
                    if transcript_str and len(transcript_str.strip().split()) >= 4 and "no speech was detected" not in transcript_str.lower():
                        snippets.append(transcript_str[:120])

                avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

                if avg_score >= 70.0 and len(snippets) > 0:
                    demonstrated_count += 1
                    status = CompetencyCoverageStatus.DEMONSTRATED
                    explanation = f"Candidate demonstrated capability in '{comp}' with evidence from spoken answers."
                else:
                    weak_count += 1
                    status = CompetencyCoverageStatus.WEAK_EVIDENCE
                    explanation = f"Candidate was questioned on '{comp}', but evidence or technical depth was minimal or omitted."

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

        coverage_ratio = (
            round((demonstrated_count / len(target_competencies)) * 100.0, 1)
            if target_competencies
            else 0.0
        )

        return SessionCompetencyCoverage(
            interview_id=interview_id,
            total_competencies=len(target_competencies),
            demonstrated_count=demonstrated_count,
            weak_evidence_count=weak_count,
            not_tested_count=not_tested_count,
            coverage_percentage=coverage_ratio,
            competencies=evaluations,
        )

    def _extract_sentence_match(self, transcript: str, pattern: str) -> str | None:
        """Finds and returns the full sentence containing a regex match."""
        sentences = re.split(r"[.!?]\s+", transcript)
        for s in sentences:
            if re.search(pattern, s, re.IGNORECASE):
                clean = s.strip()
                if len(clean) > 8:
                    return clean
        return None
