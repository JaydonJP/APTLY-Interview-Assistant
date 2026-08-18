"""
APTLY — Gemini Adaptive Follow-Up Generator & Realtime Conversational Engine

Generates grounded follow-up questions tailored to candidate answers:
- Real-time conversational moves: FOLLOW_UP, CHALLENGE, CLARIFY, VERIFY, RECOVER, ADVANCE
- Follow-up types: PROBE, QUANTIFY, CLARIFY, CHALLENGE, VERIFY, DEEPEN
- ClaimChaser: Detects quantitative, performance, scale, ownership, and causality claims
- Stop Probing Rule: Advances cleanly when claims are sufficiently supported or depth bound is reached
- Bounded depth: Maximum 2-3 follow-ups per root question
- Session Memory & Contradiction Detection: Reconciles cross-turn claims (e.g. Postgres vs Mongo)
- Natural, concise tone (5–25 words) with zero repetitive generic prompts
"""

from __future__ import annotations

import json
import inspect
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.content_metrics import ContentMetrics
from app.models.question import Question
from app.schemas.claim_chaser import ClaimSupportStatus, ClaimType, FollowUpAction
from app.schemas.pressure_engine import PressureAction, PressureLevel
from app.services.adaptive_interview.followup_decision import (
    FollowUpDecision,
    FollowUpDecisionService,
    FollowUpReason,
)
from app.services.adaptive_interview.pressure_engine import PressureEngineService
from app.services.providers.base import LLMGenerateRequest, LLMProvider
from app.services.session_memory.service import SessionMemoryService

logger = get_logger(__name__)

ADAPTIVE_INTERVIEWER_SYSTEM_PROMPT = """You are APTLY's Realtime Staff Technical & Behavioral Interviewer.
Your goal is to conduct a natural, realistic conversation by asking ONE concise, grounded follow-up or challenge question (5–25 words) based on what the candidate just said.

CRITICAL CONVERSATIONAL RULES:
1. ASK EXACTLY ONE CONCISE QUESTION (5-25 words max). Keep it conversational and punchy.
2. OCCASIONALLY USE NATURAL TRANSITIONS (e.g. "Got it.", "Okay.", "That makes sense.", "Let's go one level deeper.", "Interesting."). Do NOT use one before every question.
3. GROUNDED IN SPOKEN TRANSCRIPT: Only refer to tools, metrics, architectural components, or numbers the candidate actually said.
4. BANNED GENERIC PHRASES: NEVER say "Tell me more", "Can you elaborate", "Could you provide more details", or "What do you mean?". Reference the specific technical claim or quote directly.
5. STOP PROBING WHEN SUPPORTED: If the candidate already provided the baseline, mechanism, and validation, do not re-ask for them.
6. RETURN STRUCTURED JSON with the decision and question.

OUTPUT JSON FORMAT:
{
  "decision": "FOLLOW_UP",
  "follow_up_type": "QUANTIFY",
  "question": "What was the baseline latency before that 40% reduction?",
  "reason_code": "QUANTITATIVE_CLAIM_MISSING_BASELINE",
  "difficulty_action": "HOLD"
}

Allowed decisions: "FOLLOW_UP", "CHALLENGE", "CLARIFY", "VERIFY", "RECOVER", "ADVANCE"
Allowed follow_up_types: "PROBE", "QUANTIFY", "CLARIFY", "CHALLENGE", "VERIFY", "DEEPEN"
Allowed difficulty_actions: "HOLD", "INCREASE", "DECREASE", "RECOVER"
"""


class GeminiAdaptiveEngine:
    """
    Orchestrates real-time adaptive conversational decisions, ClaimChaser probes,
    cross-turn session memory retrieval, and grounded question graph extensions.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        decision_service: FollowUpDecisionService | None = None,
        memory_service: SessionMemoryService | None = None,
        pressure_engine: PressureEngineService | None = None,
    ) -> None:
        self.llm_provider = llm_provider
        self.decision_service = decision_service or FollowUpDecisionService(max_followups_per_question=3, max_followup_depth=3)
        self.memory_service = memory_service or SessionMemoryService()
        self.pressure_engine = pressure_engine or PressureEngineService()

    async def evaluate_conversational_move(
        self,
        db: AsyncSession,
        parent_question: Question,
        candidate_transcript: str,
        content_metrics: ContentMetrics | None,
        role_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Produce a structured conversational move (FOLLOW_UP / CHALLENGE / ADVANCE / etc.)
        with memory updates, contradiction handling, and concise question text.
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

        # 4. Evaluate base follow-up decision & ClaimChaser analysis
        followup_result = await db.execute(
            select(func.count(Question.id)).where(
                Question.interview_id == parent_question.interview_id,
                Question.root_question_id == (
                    parent_question.root_question_id or parent_question.id
                ),
                Question.question_source == "follow_up",
            )
        )
        raw_followup_count = followup_result.scalar_one()
        if inspect.isawaitable(raw_followup_count):
            raw_followup_count = await raw_followup_count
        try:
            existing_followups_count = int(raw_followup_count)
        except (TypeError, ValueError):
            # Lightweight mocked sessions do not always provide scalar values;
            # the database-backed path remains fully counted.
            existing_followups_count = 0

        decision = self.decision_service.evaluate_decision(
            question=parent_question,
            transcript=candidate_transcript,
            content_metrics=content_metrics,
            existing_followups_count=existing_followups_count,
        )

        # 5. Evaluate pressure engine
        current_lvl = 1
        if parent_question.difficulty and parent_question.difficulty.isdigit():
            current_lvl = int(parent_question.difficulty)
        elif parent_question.follow_up_depth > 0:
            current_lvl = min(6, parent_question.follow_up_depth + 1)

        pressure_decision = self.pressure_engine.evaluate_pressure(
            current_level=current_lvl,
            content_metrics=content_metrics,
            transcript=candidate_transcript,
        )

        # Contradiction override
        if contradictions:
            top_contra = contradictions[0]
            return {
                "decision": "VERIFY",
                "follow_up_type": "VERIFY",
                "question": top_contra.suggested_probe,
                "reason_code": "CROSS_TURN_CONTRADICTION_DETECTED",
                "difficulty": str(pressure_decision.next_level),
                "difficulty_action": "HOLD",
                "target_competency": parent_question.competency,
                "context_quote": top_contra.second_statement,
            }

        # Severe struggle recovery override
        if pressure_decision.action == PressureAction.RECOVER:
            return {
                "decision": "RECOVER",
                "follow_up_type": "CLARIFY",
                "question": "Let's step back: how would you structure the foundational components and trade-offs before diving into optimizations?",
                "reason_code": "CANDIDATE_STRUGGLE_FOUNDATION_RECOVERY",
                "difficulty": str(pressure_decision.next_level),
                "difficulty_action": "RECOVER",
                "target_competency": parent_question.competency,
                "context_quote": None,
            }

        # Edge case / high-pressure challenge
        if pressure_decision.action == PressureAction.EDGE_CASE:
            return {
                "decision": "CHALLENGE",
                "follow_up_type": "CHALLENGE",
                "question": "Under a partial network partition or sudden 10x traffic spike, what failure modes would you expect and how would the system fail safely?",
                "reason_code": "HIGH_COMPETENCY_PRESSURE_PROBE",
                "difficulty": str(pressure_decision.next_level),
                "difficulty_action": "INCREASE",
                "target_competency": parent_question.competency,
                "context_quote": None,
            }

        # If base decision says do not follow up (e.g. max depth reached or answer complete), advance cleanly
        if not decision.should_follow_up:
            return {
                "decision": "ADVANCE",
                "follow_up_type": "ADVANCE",
                "question": None,
                "reason_code": "COMPETENCY_EVALUATION_SATISFIED",
                "difficulty_action": "HOLD",
                "target_competency": parent_question.competency,
                "context_quote": None,
            }

        role_title = role_context.get("role_title", "Software Engineer") if role_context else "Software Engineer"
        domain = role_context.get("domain", "Engineering") if role_context else "Engineering"
        memory_context = self.memory_service.format_memory_for_prompt(relevant_memories)
        lvl_enum = PressureLevel(int(pressure_decision.next_level))

        # Ask LLM for concise structured decision
        prompt = f"""### INTERVIEW CONTEXT
- Target Role: {role_title} ({domain})
- Question Asked: "{parent_question.question_text}"
- Question Competency: {parent_question.competency}
- Pressure Level: {lvl_enum.value} ({lvl_enum.label})
- Pressure Directive: {pressure_decision.suggested_prompt_directive}

### CANDIDATE'S SPOKEN ANSWER
\"\"\"{candidate_transcript}\"\"\"

{memory_context}

### CLAIMCHASER INTENT
- Action: {str(decision.followup_action)}
- Reason: {str(decision.reason)}
- Justification: {decision.justification}
{f'- Missing Evidence: {", ".join(decision.missing_evidence)}' if decision.missing_evidence else ''}
{f'- Context Anchor Quote: "{decision.context_quote}"' if decision.context_quote else ''}

Return JSON with decision, follow_up_type, concise question (5-25 words), reason_code, and difficulty_action.
"""

        try:
            req = LLMGenerateRequest(
                prompt=prompt,
                system_prompt=ADAPTIVE_INTERVIEWER_SYSTEM_PROMPT,
                temperature=0.2,
                max_tokens=150,
            )
            resp = await self.llm_provider.generate_text(req)
            raw = resp.text.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and "question" in parsed:
                return {
                    "decision": parsed.get("decision", "FOLLOW_UP"),
                    "follow_up_type": parsed.get("follow_up_type", str(decision.followup_action)),
                    "question": parsed.get("question", "").strip(),
                    "reason_code": parsed.get("reason_code", str(decision.reason)),
                    "difficulty_action": parsed.get("difficulty_action", "HOLD"),
                    "target_competency": parent_question.competency,
                    "context_quote": decision.context_quote,
                }
        except Exception as exc:
            logger.warning("adaptive_move_llm_json_failed_using_deterministic", error=str(exc))

        # Resilient fallback synthesis
        fallback_q = None
        action_str = str(decision.followup_action)
        if decision.context_quote:
            if action_str == "QUANTIFY":
                fallback_q = f"What was the initial baseline and how did you measure the results when you mentioned '{decision.context_quote}'?"
            elif action_str == "CLARIFY":
                fallback_q = f"Regarding '{decision.context_quote}', what specific part did you personally own?"
            else:
                fallback_q = f"Could you walk through how you validated the outcome for '{decision.context_quote}'?"
        else:
            fallback_q = "What specific trade-offs and alternative approaches did you evaluate?"

        return {
            "decision": "FOLLOW_UP",
            "follow_up_type": action_str,
            "question": fallback_q,
            "reason_code": str(decision.reason),
            "difficulty": str(lvl_enum.value),
            "difficulty_action": "HOLD",
            "target_competency": parent_question.competency,
            "context_quote": decision.context_quote,
        }

    async def maybe_generate_followup(
        self,
        db: AsyncSession,
        parent_question: Question,
        candidate_transcript: str,
        content_metrics: ContentMetrics | None,
        role_context: dict[str, Any] | None = None,
    ) -> Question | None:
        """
        Evaluate conversational move and generate a linked Question entity in the graph.
        """
        move = await self.evaluate_conversational_move(
            db=db,
            parent_question=parent_question,
            candidate_transcript=candidate_transcript,
            content_metrics=content_metrics,
            role_context=role_context,
        )

        if move.get("decision") == "ADVANCE" or not move.get("question"):
            return None

        question_text = move["question"]
        follow_up_type = move.get("follow_up_type", "PROBE")

        try:
            root_id = parent_question.root_question_id or parent_question.id
            current_depth = parent_question.follow_up_depth or 0
            # Keep follow-ups immediately after the answered question. The
            # question list is ordered by sequence_number, so shift later
            # turns before inserting the new linked turn.
            later_result = await db.execute(
                select(Question).where(
                    Question.interview_id == parent_question.interview_id,
                    Question.sequence_number > parent_question.sequence_number,
                )
            )
            later_scalars = later_result.scalars()
            if inspect.isawaitable(later_scalars):
                later_scalars = await later_scalars
            later_questions = later_scalars.all()
            if inspect.isawaitable(later_questions):
                later_questions = await later_questions
            for later_question in later_questions if isinstance(later_questions, (list, tuple)) else []:
                if isinstance(later_question, Question):
                    later_question.sequence_number += 1

            followup_q = Question(
                interview_id=parent_question.interview_id,
                sequence_number=parent_question.sequence_number + 1,
                category=parent_question.category,
                question_type="follow_up",
                competency=parent_question.competency,
                difficulty=move.get("difficulty", parent_question.difficulty or "2"),
                question_text=question_text,
                expected_topics=[move.get("reason_code", "follow_up")],
                prompt_version="realtime_conversational_engine_v1",
                parent_question_id=parent_question.id,
                root_question_id=root_id,
                question_source="follow_up",
                follow_up_depth=current_depth + 1,
                target_competency=move.get("target_competency", parent_question.competency),
                interviewer_persona=parent_question.interviewer_persona,
            )

            db.add(followup_q)
            await db.commit()
            await db.refresh(followup_q)

            logger.info(
                "realtime_followup_question_persisted",
                parent_id=str(parent_question.id),
                followup_id=str(followup_q.id),
                question_text=question_text,
                action=follow_up_type,
                depth=followup_q.follow_up_depth,
            )
            return followup_q
        except Exception as exc:
            logger.error("realtime_followup_persistence_failed", error=str(exc))
            return None
