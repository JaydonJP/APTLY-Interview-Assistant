"""
APTLY API — Question Generator Service

Generates role-aware, structured interview questions from a RoleProfile.
Uses LLMProvider with deterministic fallback templates in mock mode.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.logging import get_logger
from app.models.job import RoleProfile
from app.models.question import Question
from app.schemas.panel import InterviewerPersona
from app.services.panel_service import PanelInterviewService
from app.services.providers.base import LLMProvider, LLMStructuredRequest

logger = get_logger(__name__)

PROMPT_VERSION = "question_generation/v1"


class QuestionGeneratorService:
    """
    Generates dynamic interview questions tailored to a specific RoleProfile.
    Supports single-interviewer and dual-persona Panel Mode (HR Lead + Tech Lead).
    """

    def __init__(self, llm_provider: LLMProvider) -> None:
        self.llm_provider = llm_provider
        self.panel_service = PanelInterviewService()

    async def generate_questions(
        self,
        interview_id: UUID,
        role_profile: RoleProfile,
        interview_type: str = "mixed",
        difficulty_level: str = "medium",
        question_count: int = 3,
        twin_profile: Any | None = None,
        is_panel_mode: bool = False,
    ) -> list[Question]:
        """
        Generate structured Question ORM entities for an interview session,
        incorporating previous session weaknesses and coaching history from the Interview Twin.
        Assigns active interviewer personas when in Panel Mode.
        """
        is_panel = is_panel_mode or interview_type.lower() == "panel"
        logger.info(
            "question_generation_started",
            interview_id=str(interview_id),
            role_title=role_profile.role_title,
            count=question_count,
            type=interview_type,
            is_panel_mode=is_panel,
            has_twin_context=bool(twin_profile),
        )

        schema = {
            "questions": [
                {
                    "category": "technical | behavioral | situational",
                    "question_type": "concept | scenario | star | system_design | problem_solving",
                    "competency": "string",
                    "difficulty": "easy | medium | hard",
                    "question_text": "string",
                    "expected_topics": ["string"],
                    "interviewer_persona": "HR_LEAD | TECH_LEAD",
                }
            ]
        }

        if is_panel:
            system_prompt = (
                "You are conducting a dual-interviewer Panel Interview with two distinct personas:\n"
                "1. Sarah Chen (HR Lead & People Partner): Friendly, empathetic tone. Evaluates STAR behavioral stories, leadership, conflict resolution, ownership, and core motivation.\n"
                "2. Alex Rivera (Staff Systems Architect & Tech Lead): Skeptical, rigorous tone. Evaluates distributed systems design, concurrency, database indexing, latency tradeoffs, failure modes, and empirical benchmarking.\n"
                f"Generate {question_count} tailored interview questions for a {role_profile.seniority} {role_profile.role_title}, alternating between Sarah Chen (HR_LEAD) and Alex Rivera (TECH_LEAD)."
            )
        else:
            system_prompt = (
                "You are a technical interviewer at a top tier technology company. "
                f"Generate {question_count} tailored interview questions for a {role_profile.seniority} {role_profile.role_title}. "
                f"Interview Type: {interview_type}. Difficulty: {difficulty_level}."
            )

        user_prompt = (
            f"Role Profile:\n"
            f"- Title: {role_profile.role_title} ({role_profile.seniority})\n"
            f"- Technical Skills: {', '.join(role_profile.technical_skills)}\n"
            f"- Tools: {', '.join(role_profile.tools)}\n"
            f"- Responsibilities: {', '.join(role_profile.responsibilities[:2])}\n"
            f"- Focus Topics: {', '.join(role_profile.interview_topics[:3])}\n"
        )

        # Inject Interview Twin coaching history if available
        if twin_profile and hasattr(twin_profile, "recurring_weaknesses") and twin_profile.recurring_weaknesses:
            weak_str = ", ".join(str(w) for w in twin_profile.recurring_weaknesses[:3])
            focus_str = ", ".join(str(f) for f in getattr(twin_profile, "next_interview_focus_areas", [])[:2])
            user_prompt += (
                f"\nCandidate Coaching History (Interview Twin):\n"
                f"- Previous Weaknesses Identified: {weak_str}\n"
                f"- Focus Growth Areas: {focus_str}\n"
                f"Ensure at least one technical question deliberately challenges these previous weaknesses (e.g. testing validation, empirical benchmarks, or architectural trade-offs).\n"
            )

        user_prompt += f"\nGenerate exactly {question_count} distinct questions."

        try:
            raw_result = await self.llm_provider.generate_structured(
                LLMStructuredRequest(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    output_schema=schema,
                )
            )
        except Exception as exc:
            logger.warning("question_generator_llm_failed_using_deterministic_fallback", error=str(exc))
            raw_result = {"_mock": True, "fallback": True}

        # Parse or synthesize question definitions
        question_defs = self._parse_or_synthesize(
            raw_result=raw_result,
            role_profile=role_profile,
            interview_type="mixed" if is_panel else interview_type,
            difficulty_level=difficulty_level,
            question_count=question_count,
            twin_profile=twin_profile,
        )

        questions: list[Question] = []
        for idx, q_data in enumerate(question_defs, start=1):
            category = q_data["category"]
            persona = q_data.get("interviewer_persona") or self.panel_service.assign_persona(category, idx)
            q = Question(
                interview_id=interview_id,
                sequence_number=idx,
                category=category,
                question_type=q_data["question_type"],
                competency=q_data["competency"],
                difficulty=q_data["difficulty"],
                question_text=q_data["question_text"],
                expected_topics=q_data["expected_topics"],
                prompt_version=PROMPT_VERSION,
                interviewer_persona=persona.value if isinstance(persona, InterviewerPersona) else str(persona),
            )
            questions.append(q)

        logger.info(
            "question_generation_completed",
            interview_id=str(interview_id),
            generated_count=len(questions),
        )

        return questions


    def _parse_or_synthesize(
        self,
        raw_result: dict[str, Any],
        role_profile: RoleProfile,
        interview_type: str,
        difficulty_level: str,
        question_count: int,
        twin_profile: Any | None = None,
    ) -> list[dict[str, Any]]:
        """
        Parses LLM output or generates high-quality deterministic mock questions,
        tailored to the candidate's coaching history from the Interview Twin.
        """
        if (
            "questions" in raw_result
            and isinstance(raw_result["questions"], list)
            and len(raw_result["questions"]) > 0
        ):
            parsed: list[dict[str, Any]] = []
            for item in raw_result["questions"][:question_count]:
                if isinstance(item, dict) and "question_text" in item:
                    parsed.append(
                        {
                            "category": str(
                                item.get("category") or "technical"
                            ).lower(),
                            "question_type": str(
                                item.get("question_type") or "concept"
                            ).lower(),
                            "competency": str(
                                item.get("competency") or "Core Engineering"
                            ),
                            "difficulty": str(
                                item.get("difficulty") or difficulty_level
                            ).lower(),
                            "question_text": str(item.get("question_text")).strip(),
                            "expected_topics": [
                                str(t).strip()
                                for t in item.get("expected_topics", [])
                                if t
                            ],
                        }
                    )
            if len(parsed) >= question_count:
                return parsed

        # Deterministic role-aware question templates
        primary_skill = (
            role_profile.technical_skills[0]
            if role_profile.technical_skills
            else "Python"
        )
        secondary_skill = (
            role_profile.technical_skills[1]
            if len(role_profile.technical_skills) > 1
            else "PostgreSQL"
        )

        templates: list[dict[str, Any]] = []

        # If Twin history indicates validation or tradeoff weakness, inject targeted questions
        weaknesses_flat = (
            " ".join(str(w) for w in getattr(twin_profile, "recurring_weaknesses", [])).lower()
            if twin_profile
            else ""
        )

        if "validation" in weaknesses_flat:
            templates.append(
                {
                    "category": "technical",
                    "question_type": "scenario",
                    "competency": f"{primary_skill} Validation & Benchmarking",
                    "difficulty": difficulty_level,
                    "question_text": (
                        f"When architecting a production system in {primary_skill}, how do you empirically validate performance claims "
                        f"and test baseline constraints using load benchmarks, canary telemetry, or A/B testing before rollout?"
                    ),
                    "expected_topics": [
                        "Empirical load testing and benchmarking",
                        "Canary deployments and telemetry verification",
                        "Baseline metric comparison",
                    ],
                }
            )

        templates.extend([
            {
                "category": "technical",
                "question_type": "scenario",
                "competency": primary_skill,
                "difficulty": difficulty_level,
                "question_text": (
                    f"Can you walk me through how you design and structure a high-performance backend service in {primary_skill}? "
                    f"Specifically, how do you handle database concurrency, caching, and connection lifecycle under heavy load?"
                ),
                "expected_topics": [
                    "Connection Pooling & Async IO",
                    "Database Indexing & Query Optimization",
                    "Caching layers (Redis) and cache invalidation",
                    "Error isolation and circuit breaking",
                ],
            },
            {
                "category": "behavioral",
                "question_type": "star",
                "competency": "Problem Solving & Ownership",
                "difficulty": difficulty_level,
                "question_text": (
                    "Tell me about a time when a critical bug or performance degradation occurred in production. "
                    "How did you diagnose the root cause, what trade-offs did you evaluate, and how did you verify the fix?"
                ),
                "expected_topics": [
                    "Structured Incident Triaging (STAR Situation & Task)",
                    "Root cause isolation via metrics/logs (Action)",
                    "Verification and automated regression tests (Result)",
                    "Post-mortem documentation and long-term prevention",
                ],
            },
            {
                "category": "technical",
                "question_type": "system_design",
                "competency": secondary_skill,
                "difficulty": difficulty_level,
                "question_text": (
                    f"When designing a schema with {secondary_skill}, how do you approach data integrity, indexing strategies, "
                    f"and schema migrations without causing downtime on live tables?"
                ),
                "expected_topics": [
                    "Zero-downtime migration patterns",
                    "Locking mechanisms and transaction isolation levels",
                    "B-tree and composite indexing trade-offs",
                    "Foreign key cascading and soft deletion lifecycle",
                ],
            },
            {
                "category": "situational",
                "question_type": "problem_solving",
                "competency": "Technical Leadership & Communication",
                "difficulty": difficulty_level,
                "question_text": (
                    "Suppose your team is split on whether to refactor a legacy monolithic module or rebuild it from scratch as an async microservice. "
                    "How would you facilitate this architectural decision and measure success?"
                ),
                "expected_topics": [
                    "Objective evaluation criteria (latency, complexity, maintenance cost)",
                    "Incremental strangler fig refactoring strategy",
                    "Measuring developer velocity and blast radius",
                    "Stakeholder communication and alignment",
                ],
            },
            {
                "category": "behavioral",
                "question_type": "star",
                "competency": "Collaboration & Mentorship",
                "difficulty": difficulty_level,
                "question_text": (
                    "Describe a situation where you had a strong technical disagreement with a peer or team lead during a pull request review. "
                    "How did you resolve the conflict constructively?"
                ),
                "expected_topics": [
                    "Data-driven argumentation (benchmarks, trade-off analysis)",
                    "Empathy and maintaining code review quality standards",
                    "Pragmatic compromise and team velocity alignment",
                ],
            },
        ])

        # Filter by interview_type if specific
        if interview_type == "technical":
            filtered = [t for t in templates if t["category"] == "technical"]
        elif interview_type == "behavioral":
            filtered = [
                t for t in templates if t["category"] in ("behavioral", "situational")
            ]
        else:
            filtered = templates

        return filtered[:question_count]
