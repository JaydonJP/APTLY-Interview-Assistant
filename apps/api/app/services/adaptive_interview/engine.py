"""
APTLY — Gemini Adaptive Follow-Up Generator & Question Graph Engine

Generates grounded follow-up questions tailored to candidate answers:
- Uses Google Gemini to generate precise, natural follow-up questions
- Binds follow-up to parent question in the Question Graph
- Anti-hallucination: Never cites technologies not mentioned by the candidate
- Bounded depth & budget enforcement
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.content_metrics import ContentMetrics
from app.models.question import Question
from app.services.adaptive_interview.followup_decision import (
    FollowUpDecisionService,
    FollowUpReason,
)
from app.services.providers.base import LLMGenerateRequest, LLMProvider

logger = get_logger(__name__)

ADAPTIVE_INTERVIEWER_SYSTEM_PROMPT = """You are APTLY's Staff-Level Technical Interviewer.
Your goal is to ask ONE precise, natural, evidence-grounded follow-up question based on what the candidate just said.

CRITICAL RULES:
1. ASK EXACTLY ONE QUESTION: Do not preamble (e.g. "Great answer!"). Ask the question directly.
2. ANSWER-GROUNDED ONLY: Quote or refer only to concepts, tools, numbers, or claims the candidate explicitly mentioned in their transcript.
3. NEVER INVENT / FABRICATE: If the candidate did not mention Kubernetes, Docker, or Kafka, NEVER mention them.
4. PROBE THE SPECIFIC GAP: Address the reason provided (e.g., how they measured an improvement claim, their personal role vs team role, or trade-offs considered).
5. TONE: Professional, conversational, and encouraging yet rigorous.
"""


from app.services.session_memory.service import SessionMemoryService


class GeminiAdaptiveEngine:
    """
    Orchestrates adaptive follow-up evaluation and generation with Google Gemini and Session Memory.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        decision_service: FollowUpDecisionService | None = None,
        memory_service: SessionMemoryService | None = None,
    ) -> None:
        self.llm_provider = llm_provider
        self.decision_service = decision_service or FollowUpDecisionService()
        self.memory_service = memory_service or SessionMemoryService()

    async def maybe_generate_followup(
        self,
        db: AsyncSession,
        parent_question: Question,
        candidate_transcript: str,
        content_metrics: ContentMetrics | None,
        role_context: dict[str, Any] | None = None,
    ) -> Question | None:
        """
        Evaluate if a follow-up is warranted and generate a grounded Question entity with session memory.
        """
        # 1. Extract and persist current turn memories
        current_memories = self.memory_service.extract_memories(
            interview_id=str(parent_question.interview_id),
            question_id=str(parent_question.id),
            turn_number=parent_question.sequence_number,
            transcript=candidate_transcript,
            content_metrics=content_metrics,
        )
        await self.memory_service.persist_memories(db, current_memories)

        # 2. Retrieve relevant historical session memory
        relevant_memories = await self.memory_service.get_relevant_memories(
            db=db,
            interview_id=parent_question.interview_id,
            current_transcript=candidate_transcript,
            limit=4,
        )

        # 3. Check for cross-turn contradictions
        contradictions = self.memory_service.detect_contradictions(
            current_memories=current_memories,
            historical_memories=relevant_memories,
        )

        decision = self.decision_service.evaluate_decision(
            question=parent_question,
            transcript=candidate_transcript,
            content_metrics=content_metrics,
        )

        # If contradiction found, override decision to probe consistency
        if contradictions:
            top_contra = contradictions[0]
            decision.should_follow_up = True
            decision.reason = FollowUpReason.CLAIM_REQUIRES_CLARIFICATION
            decision.justification = f"Consistency check: {top_contra.suggested_probe}"
            decision.context_quote = top_contra.second_statement

        if not decision.should_follow_up:
            logger.info(
                "adaptive_followup_skipped",
                question_id=str(parent_question.id),
                reason=str(decision.reason),
                justification=decision.justification,
            )
            return None

        role_title = role_context.get("role_title", "Software Engineer") if role_context else "Software Engineer"
        domain = role_context.get("domain", "Engineering") if role_context else "Engineering"
        memory_context = self.memory_service.format_memory_for_prompt(relevant_memories)

        prompt = f"""### INTERVIEW CONTEXT
- Target Role: {role_title} ({domain})
- Parent Question Asked: "{parent_question.question_text}"
- Question Competency: {parent_question.competency}

### CANDIDATE'S ACTUAL SPOKEN ANSWER
\"\"\"{candidate_transcript}\"\"\"

{memory_context}

### FOLLOW-UP OBJECTIVE
- Action: {str(decision.followup_action)}
- Reason: {str(decision.reason)}
- Focus: {decision.justification}
{f'- Missing Evidence: {", ".join(decision.missing_evidence)}' if decision.missing_evidence else ''}
{f'- Context Anchor Quote: "{decision.context_quote}"' if decision.context_quote else ''}

Generate exactly ONE grounded follow-up question probing this point. Reference the candidate's quote and ask for the missing evidence. Never use generic phrases like 'Tell me more'.
"""

        follow_up_text: str | None = None

        if contradictions:
            follow_up_text = contradictions[0].suggested_probe
        else:
            try:
                req = LLMGenerateRequest(
                    prompt=prompt,
                    system_prompt=ADAPTIVE_INTERVIEWER_SYSTEM_PROMPT,
                    temperature=0.3,
                    max_tokens=120,
                )
                resp = await self.llm_provider.generate_text(req)
                follow_up_text = resp.text.strip().replace('"', '')
            except Exception as exc:
                logger.warning("adaptive_followup_llm_failed_falling_back", error=str(exc))
            # Resilient fallback: Synthesize grounded deterministic follow-up from quote & action
            if decision.context_quote:
                action_str = str(decision.followup_action)
                if action_str == "QUANTIFY":
                    follow_up_text = f"What was the initial baseline and how did you measure the results when you mentioned '{decision.context_quote}'?"
                elif action_str == "CLARIFY":
                    follow_up_text = f"Regarding '{decision.context_quote}', what was your specific individual contribution?"
                else:
                    follow_up_text = f"Could you walk through how you validated the outcome for '{decision.context_quote}'?"

        if not follow_up_text:
            return None

        try:
            # Create and attach follow-up question to Question Graph
            root_id = parent_question.root_question_id or parent_question.id
            followup_q = Question(
                interview_id=parent_question.interview_id,
                sequence_number=parent_question.sequence_number,
                category=parent_question.category,
                question_type="follow_up",
                competency=decision.target_competency,
                difficulty=parent_question.difficulty,
                question_text=follow_up_text,
                expected_topics=[str(decision.reason)],
                prompt_version="gemini_adaptive_v2",
                parent_question_id=parent_question.id,
                root_question_id=root_id,
                question_source="follow_up",
                follow_up_depth=parent_question.follow_up_depth + 1,
                target_competency=decision.target_competency,
            )

            db.add(followup_q)
            await db.commit()
            await db.refresh(followup_q)

            logger.info(
                "adaptive_followup_generated",
                parent_id=str(parent_question.id),
                followup_id=str(followup_q.id),
                question_text=follow_up_text,
                action=str(decision.followup_action),
                depth=followup_q.follow_up_depth,
            )
            return followup_q
        except Exception as exc:
            logger.error("adaptive_followup_persistence_failed", error=str(exc))
            return None
