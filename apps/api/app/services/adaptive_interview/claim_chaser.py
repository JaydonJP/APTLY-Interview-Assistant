"""
APTLY — ClaimChaser Service

Extracts candidate claims, classifies missing evidence dimensions,
and formulates precise, grounded follow-up probes.
"""

from __future__ import annotations

import re
from typing import Any

from app.core.logging import get_logger
from app.schemas.claim_chaser import (
    ClaimChaserAnalysis,
    ClaimSupportStatus,
    ClaimType,
    ExtractedClaim,
    FollowUpAction,
)
from app.services.providers.base import (
    LLMGenerateRequest,
    LLMProvider,
    LLMStructuredRequest,
)

logger = get_logger(__name__)

CLAIM_CHASER_SYSTEM_PROMPT = """You are APTLY's ClaimChaser engine.
Your role is to analyze a candidate's spoken interview answer, extract specific claims they make, evaluate the supporting evidence provided in the answer, and generate an evidence-seeking follow-up probe.

CRITICAL RULES:
1. NEVER CALL A CANDIDATE DISHONEST: Frame all missing evidence as seeking depth, baseline context, or validation.
2. ANSWER-GROUNDED: Every follow-up question must reference the candidate's ACTUAL WORDS or specific numbers/claims.
3. NEVER GENERATE GENERIC PROBES: Never output "Tell me more", "Can you elaborate?", or generic fluff.
4. EXPLICIT EVIDENCE GAPS: Identify what is missing (e.g. baseline, metric definition, validation, personal contribution, measurement method).
"""


class ClaimChaserService:
    """
    Extracts and evaluates claims from candidate interview transcripts.
    """

    def __init__(self, llm_provider: LLMProvider | None = None) -> None:
        self.llm_provider = llm_provider

    def extract_heuristic_claims(self, transcript: str) -> list[ExtractedClaim]:
        """
        Deterministic, fast extraction of factual, quantitative, and performance claims.
        """
        claims: list[ExtractedClaim] = []
        text = transcript.strip()

        # 1. Percentage / Multiplier Quantitative Claims (e.g. "reduced latency by 40%", "improved by 30%")
        quant_matches = list(
            re.finditer(
                r"(?:improved|increased|reduced|decreased|cut|boosted|dropped|sped up|optimized)\s+(?:the\s+)?([a-zA-Z\s]+?)\s+by\s+(\d+(?:\.\d+)?%|\d+x|\d+\s+times)",
                text,
                re.IGNORECASE,
            )
        )
        for match in quant_matches:
            metric = match.group(1).strip()
            amount = match.group(2).strip()
            quote = match.group(0)

            has_baseline = bool(
                re.search(r"(?:from\s+\d+|baseline|previously|was\s+\d+|before)", text, re.IGNORECASE)
            )
            has_method = bool(
                re.search(
                    r"(?:by\s+using|using|implemented|migrated|refactored|indexed|cached|architected)",
                    text,
                    re.IGNORECASE,
                )
            )
            has_validation = bool(
                re.search(r"(?:measured|verified|load tested|benchmarked|ab test|a/b tested)", text, re.IGNORECASE)
            )

            missing: list[str] = []
            present: list[str] = []

            if has_baseline:
                present.append("baseline")
            else:
                missing.append("baseline")

            if has_validation:
                present.append("validation")
            else:
                missing.append("validation")

            if has_method:
                present.append("method")
            else:
                missing.append("method")

            missing.extend(["metric definition", "measurement", "personal contribution"])
            # De-duplicate while preserving order
            missing = list(dict.fromkeys(missing))

            support = (
                ClaimSupportStatus.SUPPORTED
                if (has_baseline and has_validation and has_method)
                else ClaimSupportStatus.PARTIALLY_SUPPORTED
                if (has_baseline or has_method or has_validation)
                else ClaimSupportStatus.UNSUPPORTED_IN_ANSWER
            )

            claims.append(
                ExtractedClaim(
                    claim_text=f"{amount} {metric} improvement",
                    claim_type=ClaimType.QUANTITATIVE,
                    support_status=support,
                    quote=quote,
                    present_evidence=present,
                    missing_evidence=missing,
                    recommended_action=FollowUpAction.QUANTIFY,
                )
            )

        # 2. General Quantitative Numbers (e.g. "reduced latency by 40%")
        if not quant_matches:
            alt_quant = list(
                re.finditer(
                    r"(?:reduced|increased|improved|scaled|handled)\s+([a-zA-Z\s]+?)\s+(?:by|to)\s+(\d+(?:%|k|M|ms|s|gb|tb|rps)?)",
                    text,
                    re.IGNORECASE,
                )
            )
            for match in alt_quant:
                metric = match.group(1).strip()
                amount = match.group(2).strip()
                quote = match.group(0)
                claims.append(
                    ExtractedClaim(
                        claim_text=f"{amount} {metric}",
                        claim_type=ClaimType.QUANTITATIVE,
                        support_status=ClaimSupportStatus.UNSUPPORTED_IN_ANSWER,
                        quote=quote,
                        present_evidence=[],
                        missing_evidence=["baseline", "measurement", "method"],
                        recommended_action=FollowUpAction.QUANTIFY,
                    )
                )

        # 3. Scale Claims (e.g. "handled 100k requests", "scaled to millions")
        scale_matches = list(
            re.finditer(
                r"(?:handled|processed|scaled to|serving)\s+(\d+[\w\s]+(?:requests|users|queries|rps|tps|events|records))",
                text,
                re.IGNORECASE,
            )
        )
        for match in scale_matches:
            quote = match.group(0)
            claims.append(
                ExtractedClaim(
                    claim_text=f"Scale: {match.group(1).strip()}",
                    claim_type=ClaimType.SCALE,
                    support_status=ClaimSupportStatus.UNSUPPORTED_IN_ANSWER,
                    quote=quote,
                    present_evidence=[],
                    missing_evidence=["architecture", "bottlenecks", "validation"],
                    recommended_action=FollowUpAction.VERIFY,
                )
            )

        # 4. Ownership Claims (e.g. "We built the recommendation engine")
        ownership_matches = list(
            re.finditer(
                r"\b(?:we|our team|the team)\s+(?:built|developed|designed|migrated|created|implemented)\s+([a-zA-Z\s]{4,30})",
                text,
                re.IGNORECASE,
            )
        )
        for match in ownership_matches:
            quote = match.group(0)
            claims.append(
                ExtractedClaim(
                    claim_text=f"Team ownership of {match.group(1).strip()}",
                    claim_type=ClaimType.OWNERSHIP,
                    support_status=ClaimSupportStatus.PARTIALLY_SUPPORTED,
                    quote=quote,
                    present_evidence=["team achievement"],
                    missing_evidence=["personal contribution", "individual role", "design ownership"],
                    recommended_action=FollowUpAction.CLARIFY,
                )
            )

        # 5. Technical Causality (e.g. "Moving to Redis resolved all our bottlenecks")
        causality_matches = list(
            re.finditer(
                r"(?:because we|by using|switching to|migrating to)\s+([a-zA-Z0-9]+)\s+(?:it fixed|we solved|resolved|eliminated)\s+([a-zA-Z\s]+)",
                text,
                re.IGNORECASE,
            )
        )
        for match in causality_matches:
            quote = match.group(0)
            tech = match.group(1).strip()
            issue = match.group(2).strip()
            claims.append(
                ExtractedClaim(
                    claim_text=f"{tech} resolved {issue}",
                    claim_type=ClaimType.TECHNICAL_CAUSALITY,
                    support_status=ClaimSupportStatus.UNSUPPORTED_IN_ANSWER,
                    quote=quote,
                    present_evidence=[],
                    missing_evidence=["root cause analysis", "trade-offs", "alternatives considered"],
                    recommended_action=FollowUpAction.PROBE,
                )
            )

        return claims

    def generate_heuristic_followup(
        self,
        claim: ExtractedClaim,
        candidate_transcript: str,
    ) -> str:
        """
        Synthesizes a grounded, non-generic follow-up question directly from the claim.
        """
        quote = claim.quote
        missing = claim.missing_evidence

        if claim.claim_type == ClaimType.QUANTITATIVE or claim.recommended_action == FollowUpAction.QUANTIFY:
            if "baseline" in missing and ("validation" in missing or "measurement" in missing):
                return f"What was the baseline and how did you validate the {claim.claim_text}?"
            elif "baseline" in missing:
                return f"What was the initial baseline before you {quote}?"
            else:
                return f"How did you measure and validate that you {quote}?"

        elif claim.claim_type == ClaimType.OWNERSHIP or claim.recommended_action == FollowUpAction.CLARIFY:
            return f"When you mentioned '{quote}', what was your specific personal role versus the team's contribution?"

        elif claim.claim_type == ClaimType.SCALE or claim.recommended_action == FollowUpAction.VERIFY:
            return f"When scaling to '{quote}', what specific architecture bottlenecks did you encounter and how were they resolved?"

        elif claim.claim_type == ClaimType.TECHNICAL_CAUSALITY or claim.recommended_action == FollowUpAction.PROBE:
            return f"Regarding '{quote}', what trade-offs and alternative approaches did you evaluate before making that decision?"

        return f"Could you walk through how you validated the outcome when you {quote}?"

    async def analyze_claims(
        self,
        transcript: str,
        question_text: str = "",
        role_context: dict[str, Any] | None = None,
    ) -> ClaimChaserAnalysis:
        """
        Complete claim analysis combining heuristic extraction with optional LLM reasoning.
        """
        heuristic_claims = self.extract_heuristic_claims(transcript)

        # If LLM provider is available, attempt structured extraction
        if self.llm_provider:
            try:
                prompt = f"""### CANDIDATE SPOKEN ANSWER:
\"\"\"{transcript}\"\"\"

### QUESTION ASKED:
"{question_text}"

Extract all claims made by the candidate. For any unsupported claim, identify the missing evidence and formulate an evidence-seeking follow-up probe.
"""
                req = LLMStructuredRequest(
                    prompt=prompt,
                    system_prompt=CLAIM_CHASER_SYSTEM_PROMPT,
                    response_schema=ClaimChaserAnalysis,
                    temperature=0.2,
                )
                analysis_data = await self.llm_provider.generate_structured(req)
                if isinstance(analysis_data, dict):
                    analysis = ClaimChaserAnalysis.model_validate(analysis_data)
                    if analysis.claims:
                        return analysis
            except Exception as exc:
                logger.warning("claim_chaser_llm_failed_fallback_to_heuristic", error=str(exc))

        # Fallback to deterministic heuristic analysis
        primary_claim = heuristic_claims[0] if heuristic_claims else None
        followup_q = (
            self.generate_heuristic_followup(primary_claim, transcript)
            if primary_claim
            else None
        )
        action = primary_claim.recommended_action if primary_claim else FollowUpAction.ADVANCE

        return ClaimChaserAnalysis(
            claims=heuristic_claims,
            primary_claim=primary_claim,
            suggested_followup_question=followup_q,
            followup_action=action,
            confidence=0.95 if heuristic_claims else 0.5,
        )
