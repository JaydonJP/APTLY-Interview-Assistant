"""
APTLY API — Domain Events

Defines all domain events that flow through the APTLY system.

Phase 0: These are definitions only — no event bus implementation.
Phase 1+: Wire into a lightweight event dispatcher or message queue.

Design principles:
- Events are immutable facts about what happened
- Every event has a unique ID and timestamp
- Events carry only the data needed for downstream consumers
- Events do NOT reference internal ORM objects
- Events are JSON-serialisable for future queue compatibility

Event naming convention: PastTense noun-phrase
    InterviewCreated (not CreateInterview)
    AnswerRecorded (not RecordAnswer)

Future event bus options (Phase 1+):
    - In-process: simple asyncio event emitter
    - Out-of-process: Redis Pub/Sub (simple), Celery events, or SQS/PubSub
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4


def _now() -> datetime:
    return datetime.now(UTC)


def _new_id() -> UUID:
    return uuid4()


# ── Base Event ────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class DomainEvent:
    """
    Base class for all APTLY domain events.

    frozen=True ensures events are immutable after creation.
    """

    event_id: UUID = field(default_factory=_new_id)
    occurred_at: datetime = field(default_factory=_now)

    def to_dict(self) -> dict[str, Any]:
        """Serialize the event to a JSON-compatible dict."""
        return {
            "event_type": type(self).__name__,
            "event_id": str(self.event_id),
            "occurred_at": self.occurred_at.isoformat(),
        }


# ── Interview Lifecycle Events ────────────────────────────────────────────────


@dataclass(frozen=True)
class InterviewCreated(DomainEvent):
    """Fired when a new interview is created."""

    interview_id: UUID = field(default_factory=_new_id)
    title: str = ""


@dataclass(frozen=True)
class InterviewStarted(DomainEvent):
    """Fired when the candidate begins an interview session."""

    interview_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)


@dataclass(frozen=True)
class QuestionAsked(DomainEvent):
    """Fired when the AI interviewer presents a question."""

    interview_id: UUID = field(default_factory=_new_id)
    question_id: UUID = field(default_factory=_new_id)
    question_text: str = ""
    question_index: int = 0
    prompt_version: str = "unknown"


@dataclass(frozen=True)
class AnswerRecorded(DomainEvent):
    """Fired when a candidate's answer recording is received."""

    interview_id: UUID = field(default_factory=_new_id)
    answer_id: UUID = field(default_factory=_new_id)
    question_id: UUID = field(default_factory=_new_id)
    storage_key: str = ""  # Key in storage provider — NOT a file path
    duration_seconds: float = 0.0


@dataclass(frozen=True)
class AnswerProcessingStarted(DomainEvent):
    """Fired when async processing pipeline begins for an answer."""

    interview_id: UUID = field(default_factory=_new_id)
    answer_id: UUID = field(default_factory=_new_id)
    processing_stages: list[str] = field(
        default_factory=lambda: [
            "transcription",
            "speech_metrics",
            "vision_metrics",
            "content_evaluation",
            "delivery_evaluation",
        ]
    )


@dataclass(frozen=True)
class TranscriptReady(DomainEvent):
    """Fired when transcription is complete for an answer."""

    interview_id: UUID = field(default_factory=_new_id)
    answer_id: UUID = field(default_factory=_new_id)
    transcript_storage_key: str = ""
    word_count: int = 0
    duration_seconds: float = 0.0
    transcription_provider: str = "unknown"
    model_version: str = "unknown"


@dataclass(frozen=True)
class MetricsReady(DomainEvent):
    """Fired when speech and/or vision metrics have been computed."""

    interview_id: UUID = field(default_factory=_new_id)
    answer_id: UUID = field(default_factory=_new_id)
    metrics_type: str = ""  # "speech" | "vision" | "combined"
    metrics_schema_version: str = "1.0"
    metrics_storage_key: str = ""


@dataclass(frozen=True)
class AnswerEvaluated(DomainEvent):
    """
    Fired when content and delivery evaluation is complete for an answer.

    Evaluation is ALWAYS grounded in structured metrics.
    The LLM receives features, not raw media.
    """

    interview_id: UUID = field(default_factory=_new_id)
    answer_id: UUID = field(default_factory=_new_id)
    evaluation_schema_version: str = "1.0"
    prompt_version: str = "unknown"  # Which prompt produced this evaluation
    evaluation_storage_key: str = ""


@dataclass(frozen=True)
class FollowupGenerated(DomainEvent):
    """Fired when the AI generates a follow-up question grounded in answer evidence."""

    interview_id: UUID = field(default_factory=_new_id)
    question_id: UUID = field(default_factory=_new_id)  # The follow-up question
    parent_answer_id: UUID = field(default_factory=_new_id)
    prompt_version: str = "unknown"


@dataclass(frozen=True)
class InterviewCompleted(DomainEvent):
    """Fired when all questions are answered and the session ends."""

    interview_id: UUID = field(default_factory=_new_id)
    total_questions: int = 0
    total_duration_seconds: float = 0.0


@dataclass(frozen=True)
class ReportGenerated(DomainEvent):
    """Fired when the full multimodal report is ready for the candidate."""

    interview_id: UUID = field(default_factory=_new_id)
    report_storage_key: str = ""
    metrics_schema_version: str = "1.0"
    evaluation_schema_version: str = "1.0"
