"""Knowledge graph updates and learner progress aggregation."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from itertools import combinations
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.answer import Answer
from app.models.interview import Interview
from app.models.knowledge import KnowledgeEdge, KnowledgeTopic, LearnerTopicProgress
from app.models.question import Question


def normalize_topic(value: str) -> str:
    """Create a stable key while preserving a readable display label."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+#. ]", " ", value.lower())).strip()


def _topic_category(topic: str) -> str:
    lowered = topic.lower()
    if any(term in lowered for term in ("behavior", "star", "communication", "ownership")):
        return "behavioral"
    if any(term in lowered for term in ("database", "python", "api", "system", "cache", "redis")):
        return "technical"
    return "general"


class KnowledgeGraphService:
    """Persists concepts and turns each answer into measurable progress."""

    async def record_answer(
        self,
        db: AsyncSession,
        learner_id: str,
        interview_id: Any,
        answer_id: Any,
        question: Question,
        content_metrics: Any,
    ) -> None:
        coverage = content_metrics.topic_coverage_json or []
        coverage_by_topic = {
            normalize_topic(str(item.get("topic", ""))): item
            for item in coverage
            if item.get("topic")
        }
        candidate_topics = [
            *question.expected_topics,
            question.competency,
            *[str(item.get("topic", "")) for item in coverage if item.get("topic")],
        ]
        topic_labels: dict[str, str] = {}
        for label in candidate_topics:
            normalized = normalize_topic(str(label))
            if normalized and normalized not in topic_labels:
                topic_labels[normalized] = str(label).strip()
        if not topic_labels:
            return

        topic_rows: list[KnowledgeTopic] = []
        for normalized, display_name in topic_labels.items():
            topic = (
                await db.execute(
                    select(KnowledgeTopic).where(KnowledgeTopic.normalized_name == normalized)
                )
            ).scalar_one_or_none()
            if topic is None:
                topic = KnowledgeTopic(
                    normalized_name=normalized,
                    display_name=display_name,
                    category=_topic_category(display_name),
                )
                db.add(topic)
                await db.flush()
            topic_rows.append(topic)

        # Each answer links the concepts it exercised. Edges make the graph
        # useful for discovering neighboring topics in future question sets.
        for source, target in combinations(topic_rows, 2):
            if source.id == target.id:
                continue
            edge = (
                await db.execute(
                    select(KnowledgeEdge).where(
                        KnowledgeEdge.source_topic_id == source.id,
                        KnowledgeEdge.target_topic_id == target.id,
                        KnowledgeEdge.edge_type == "co_occurs",
                    )
                )
            ).scalar_one_or_none()
            if edge is None:
                db.add(
                    KnowledgeEdge(
                        source_topic_id=source.id,
                        target_topic_id=target.id,
                        edge_type="co_occurs",
                        weight=1,
                    )
                )
            else:
                edge.weight += 1

        now = datetime.now(UTC)
        for topic in topic_rows:
            item = coverage_by_topic.get(topic.normalized_name)
            score = float(
                item.get("score", content_metrics.correctness_score)
                if item
                else content_metrics.correctness_score
            )
            covered = bool(item.get("covered")) if item else score >= 70.0
            progress = (
                await db.execute(
                    select(LearnerTopicProgress).where(
                        LearnerTopicProgress.learner_id == learner_id,
                        LearnerTopicProgress.topic_id == topic.id,
                    )
                )
            ).scalar_one_or_none()
            if progress is None:
                progress = LearnerTopicProgress(
                    learner_id=learner_id,
                    topic_id=topic.id,
                    attempts=0,
                    correct_attempts=0,
                    average_score=0.0,
                    mastery_score=0.0,
                )
                db.add(progress)
                await db.flush()

            progress.attempts += 1
            progress.correct_attempts += int(covered and score >= 70.0)
            progress.average_score = round(
                ((progress.average_score * (progress.attempts - 1)) + score)
                / progress.attempts,
                1,
            )
            progress.mastery_score = round(
                min(100.0, (progress.mastery_score * 0.7) + (score * 0.3)),
                1,
            )
            progress.last_score = round(score, 1)
            progress.last_interview_id = interview_id
            progress.last_answer_id = answer_id
            topic.answer_count += 1
            topic.average_score = round(
                ((topic.average_score * (topic.answer_count - 1)) + score)
                / topic.answer_count,
                1,
            )
            topic.mastery_score = round(
                min(100.0, (topic.mastery_score * 0.7) + (score * 0.3)),
                1,
            )
            topic.last_seen_at = now

        await db.commit()

    async def get_progress(self, db: AsyncSession, learner_id: str) -> dict[str, Any]:
        """Return session trend, recommended next difficulty, and graph data."""
        topic_rows = (
            await db.execute(
                select(LearnerTopicProgress, KnowledgeTopic)
                .join(KnowledgeTopic, KnowledgeTopic.id == LearnerTopicProgress.topic_id)
                .where(LearnerTopicProgress.learner_id == learner_id)
                .order_by(desc(LearnerTopicProgress.mastery_score))
            )
        ).all()
        session_count = int(
            (
                await db.execute(
                    select(func.count(Interview.id)).where(
                        Interview.learner_id == learner_id,
                        Interview.status == "completed",
                    )
                )
            ).scalar_one()
        )
        answer_count = int(
            (
                await db.execute(
                    select(func.count(Answer.id))
                    .join(Interview, Interview.id == Answer.interview_id)
                    .where(Interview.learner_id == learner_id, Answer.processing_status == "processed")
                )
            ).scalar_one()
        )
        average_score = round(
            sum(progress.average_score for progress, _ in topic_rows) / len(topic_rows),
            1,
        ) if topic_rows else 0.0
        recommended = "easy" if not topic_rows else (
            "hard" if average_score >= 82 and session_count >= 2
            else "medium" if average_score >= 65 or session_count >= 1
            else "easy"
        )

        edges = (
            await db.execute(
                select(KnowledgeEdge)
                .join(
                    LearnerTopicProgress,
                    LearnerTopicProgress.topic_id == KnowledgeEdge.source_topic_id,
                )
                .where(LearnerTopicProgress.learner_id == learner_id)
                .order_by(desc(KnowledgeEdge.weight))
                .limit(100)
            )
        ).scalars().all()
        return {
            "learner_id": learner_id,
            "sessions_completed": session_count,
            "answers_reviewed": answer_count,
            "average_score": average_score,
            "recommended_difficulty": recommended,
            "topics": [
                {
                    "id": topic.id,
                    "name": topic.display_name,
                    "category": topic.category,
                    "attempts": progress.attempts,
                    "correct_attempts": progress.correct_attempts,
                    "average_score": progress.average_score,
                    "mastery_score": progress.mastery_score,
                    "last_score": progress.last_score,
                    "last_seen_at": topic.last_seen_at,
                }
                for progress, topic in topic_rows
            ],
            "edges": [
                {
                    "id": edge.id,
                    "source_topic_id": edge.source_topic_id,
                    "target_topic_id": edge.target_topic_id,
                    "edge_type": edge.edge_type,
                    "weight": edge.weight,
                }
                for edge in edges
            ],
        }
