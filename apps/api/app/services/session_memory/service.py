"""
APTLY — Session Memory & Consistency Service

Extracts, persists, and retrieves structured domain memories across interview turns.
Detects potential architectural and factual conflicts without accusatory tone.
No vector database needed — relational/domain indexing powers fast, targeted retrieval.
"""

from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.memory import SessionMemory
from app.schemas.memory import (
    ContradictionItem,
    MemoryEntry,
    MemoryType,
)

logger = get_logger(__name__)

# Known technology catalog for fast deterministic extraction
KNOWN_TECHNOLOGIES = {
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "redis": "Redis",
    "mysql": "MySQL",
    "dynamodb": "DynamoDB",
    "cassandra": "Cassandra",
    "kafka": "Apache Kafka",
    "rabbitmq": "RabbitMQ",
    "elasticsearch": "Elasticsearch",
    "opensearch": "OpenSearch",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "gcp": "Google Cloud Platform",
    "azure": "Microsoft Azure",
    "fastapi": "FastAPI",
    "react": "React",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "graphql": "GraphQL",
    "grpc": "gRPC",
    "terraform": "Terraform",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "sqlite": "SQLite",
}

# Domain conflict pairings (e.g. primary persistence conflicting with another primary persistence)
PRIMARY_STORAGE_TECHS = {"PostgreSQL", "MongoDB", "MySQL", "DynamoDB", "Cassandra"}


class SessionMemoryService:
    """
    Manages session-scoped memory and consistency verification across interview turns.
    """

    def extract_memories(
        self,
        interview_id: str,
        question_id: str | None,
        turn_number: int,
        transcript: str,
        content_metrics: Any | None = None,
    ) -> list[MemoryEntry]:
        """
        Deterministically extracts structured memory items from candidate speech.
        """
        memories: list[MemoryEntry] = []
        lower_transcript = transcript.lower()

        # 1. Technologies
        seen_techs: set[str] = set()
        for pattern, canonical_name in KNOWN_TECHNOLOGIES.items():
            if re.search(rf"\b{re.escape(pattern)}\b", lower_transcript):
                if canonical_name not in seen_techs:
                    seen_techs.add(canonical_name)
                    # Extract sentence containing technology for exact quote
                    quote_match = re.search(
                        rf"([^.!?]*\b{re.escape(pattern)}\b[^.!?]*)",
                        transcript,
                        re.IGNORECASE,
                    )
                    quote = quote_match.group(1).strip() if quote_match else transcript[:100]

                    memories.append(
                        MemoryEntry(
                            interview_id=interview_id,
                            question_id=question_id,
                            turn_number=turn_number,
                            memory_type=MemoryType.TECHNOLOGIES,
                            entity_key=canonical_name,
                            entity_value=f"Used {canonical_name} in turn {turn_number}",
                            quote=quote,
                            confidence=0.98,
                            metadata_json={"canonical_name": canonical_name},
                        )
                    )

        # 2. Metrics & Numbers
        metric_matches = list(
            re.finditer(
                r"(\d+(?:\.\d+)?%|\d+x|\d+\s*(?:ms|s|seconds|minutes|rps|tps|k|million|gb|tb))",
                transcript,
                re.IGNORECASE,
            )
        )
        for m in metric_matches:
            val = m.group(1).strip()
            memories.append(
                MemoryEntry(
                    interview_id=interview_id,
                    question_id=question_id,
                    turn_number=turn_number,
                    memory_type=MemoryType.METRICS,
                    entity_key=val,
                    entity_value=f"Cited metric {val} in turn {turn_number}",
                    quote=transcript[:120],
                    confidence=0.95,
                    metadata_json={"metric_value": val},
                )
            )

        # 3. Claims
        if content_metrics and hasattr(content_metrics, "claims_json"):
            for claim_data in content_metrics.claims_json or []:
                claim_text = claim_data.get("claim", "")
                if claim_text:
                    memories.append(
                        MemoryEntry(
                            interview_id=interview_id,
                            question_id=question_id,
                            turn_number=turn_number,
                            memory_type=MemoryType.CLAIMS,
                            entity_key=claim_text[:60],
                            entity_value=claim_text,
                            quote=claim_data.get("evidence_quote") or claim_text,
                            confidence=0.90,
                            metadata_json={"support_status": claim_data.get("support_status")},
                        )
                    )

        # 4. Ownership
        if re.search(r"\b(?:i led|i designed|i architected|i built|i wrote)\b", lower_transcript):
            memories.append(
                MemoryEntry(
                    interview_id=interview_id,
                    question_id=question_id,
                    turn_number=turn_number,
                    memory_type=MemoryType.OWNERSHIP,
                    entity_key="individual_ownership",
                    entity_value="Individual technical leadership/ownership stated",
                    quote=transcript[:100],
                    confidence=0.90,
                )
            )
        elif re.search(r"\b(?:we built|our team|we migrated|we designed)\b", lower_transcript):
            memories.append(
                MemoryEntry(
                    interview_id=interview_id,
                    question_id=question_id,
                    turn_number=turn_number,
                    memory_type=MemoryType.OWNERSHIP,
                    entity_key="team_ownership",
                    entity_value="Team collaboration stated",
                    quote=transcript[:100],
                    confidence=0.90,
                )
            )

        return memories

    async def persist_memories(
        self,
        db: AsyncSession,
        memories: list[MemoryEntry],
    ) -> list[SessionMemory]:
        """Save memory records to relational database."""
        db_records: list[SessionMemory] = []
        for m in memories:
            record = SessionMemory(
                interview_id=UUID(m.interview_id),
                question_id=UUID(m.question_id) if m.question_id else None,
                turn_number=m.turn_number,
                memory_type=m.memory_type.value if hasattr(m.memory_type, "value") else str(m.memory_type),
                entity_key=m.entity_key,
                entity_value=m.entity_value,
                quote=m.quote,
                confidence=m.confidence,
                metadata_json=m.metadata_json,
            )
            db.add(record)
            db_records.append(record)

        if db_records:
            await db.commit()

        return db_records

    def detect_contradictions(
        self,
        current_memories: list[MemoryEntry],
        historical_memories: list[SessionMemory | MemoryEntry],
    ) -> list[ContradictionItem]:
        """
        Consistency Engine: Checks for potential conflicts across turns without accusatory tone.
        """
        contradictions: list[ContradictionItem] = []

        current_techs = [
            m for m in current_memories if str(m.memory_type) in ("technologies", MemoryType.TECHNOLOGIES)
        ]
        historical_techs = [
            m for m in historical_memories if str(m.memory_type) in ("technologies", MemoryType.TECHNOLOGIES)
        ]

        for curr in current_techs:
            curr_tech = curr.entity_key
            if curr_tech in PRIMARY_STORAGE_TECHS:
                for hist in historical_techs:
                    hist_tech = hist.entity_key
                    if (
                        hist_tech in PRIMARY_STORAGE_TECHS
                        and hist_tech != curr_tech
                        and hist.turn_number < curr.turn_number
                    ):
                        probe = f"Earlier you mentioned {hist_tech} and now you're describing {curr_tech}. How were the two used?"
                        contradictions.append(
                            ContradictionItem(
                                entity_key=f"{hist_tech} vs {curr_tech}",
                                first_statement=hist.quote or hist_tech,
                                first_turn=hist.turn_number,
                                second_statement=curr.quote or curr_tech,
                                second_turn=curr.turn_number,
                                suggested_probe=probe,
                            )
                        )

        return contradictions

    async def get_relevant_memories(
        self,
        db: AsyncSession,
        interview_id: UUID,
        current_transcript: str = "",
        topic_keywords: list[str] | None = None,
        limit: int = 5,
    ) -> list[SessionMemory]:
        """
        Selective Memory API: Retrieves only relevant memories matching current context
        without dumping entire session history into the prompt.
        """
        all_memories: list[SessionMemory] = []
        try:
            stmt = (
                select(SessionMemory)
                .where(SessionMemory.interview_id == interview_id)
                .order_by(SessionMemory.turn_number.desc(), SessionMemory.created_at.desc())
            )
            res = await db.execute(stmt)
            scalars_res = res.scalars()
            if hasattr(scalars_res, "all") and callable(scalars_res.all):
                all_memories = list(scalars_res.all())
        except Exception:
            all_memories = []

        if not all_memories:
            return []

        # If keywords or transcript provided, prioritize matching entities
        if current_transcript or topic_keywords:
            words = re.findall(r"\w+", current_transcript.lower())
            keywords = set([k.lower() for k in (topic_keywords or [])] + [w for w in words if len(w) > 2])
            matched: list[SessionMemory] = []
            unmatched: list[SessionMemory] = []

            for m in all_memories:
                key_lower = m.entity_key.lower()
                val_lower = m.entity_value.lower()
                if any(kw in key_lower or kw in val_lower for kw in keywords):
                    matched.append(m)
                else:
                    unmatched.append(m)

            return (matched + unmatched)[:limit]

        return all_memories[:limit]

    def format_memory_for_prompt(self, memories: list[SessionMemory | MemoryEntry]) -> str:
        """Compact, token-efficient serialization for LLM prompt injection."""
        if not memories:
            return ""

        lines = ["### RELEVANT SESSION MEMORY (From earlier turns):"]
        for m in memories:
            lines.append(f"- [Turn {m.turn_number} {m.memory_type}] {m.entity_key}: {m.entity_value}")

        return "\n".join(lines)
