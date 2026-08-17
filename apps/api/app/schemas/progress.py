"""Learner progress and knowledge graph response contracts."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.schemas.common import AptlyBaseModel


class TopicProgressResponse(AptlyBaseModel):
    id: UUID
    name: str
    category: str
    attempts: int
    correct_attempts: int
    average_score: float
    mastery_score: float
    last_score: float
    last_seen_at: datetime


class KnowledgeEdgeResponse(AptlyBaseModel):
    id: UUID
    source_topic_id: UUID
    target_topic_id: UUID
    edge_type: str
    weight: int


class ProgressResponse(AptlyBaseModel):
    learner_id: str
    sessions_completed: int
    answers_reviewed: int
    average_score: float
    recommended_difficulty: str
    topics: list[TopicProgressResponse]
    edges: list[KnowledgeEdgeResponse]
