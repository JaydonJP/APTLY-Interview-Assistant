"""
APTLY API — WebSocket Realtime Event Schemas

Defines typed schemas for the realtime interview WebSocket protocol.

WebSocket endpoint (Phase 1+):
    WS /api/v1/interviews/{id}/realtime

Protocol design principles:
1. All messages conform to a standard envelope:
   - protocol_version: "1.0"
   - event_id: UUID
   - session_id: UUID
   - sequence_number: int (monotonic for ordering, replay, and deduplication)
   - timestamp: ISO-8601 UTC
   - type: event discriminator
   - payload: event data dict
2. Heartbeat support: client/server ping & pong messages
3. Reconnection resilience: server retains session state in Redis so clients
   reconnecting with session_id can request missed sequence numbers.

Current protocol version: "1.0"
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

PROTOCOL_VERSION = "1.0"


def _now() -> datetime:
    return datetime.now(UTC)


def _new_id() -> UUID:
    return uuid4()


# ── Standard WebSocket Envelope ───────────────────────────────────────────────


@dataclass(frozen=True)
class WebSocketEnvelope:
    """Standard envelope for all WebSocket messages."""

    type: str
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    payload: dict[str, Any] = field(default_factory=dict)


# ── Heartbeat & Connection Management ─────────────────────────────────────────


@dataclass(frozen=True)
class PingMessage:
    """Heartbeat ping."""

    type: Literal["heartbeat.ping"] = "heartbeat.ping"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class PongMessage:
    """Heartbeat pong reply."""

    type: Literal["heartbeat.pong"] = "heartbeat.pong"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SessionReconnectRequest:
    """Client requests session recovery after disconnect."""

    type: Literal["session.reconnect"] = "session.reconnect"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    last_received_sequence: int = 0
    timestamp: datetime = field(default_factory=_now)
    payload: dict[str, Any] = field(default_factory=dict)


# ── Client → Server Events ────────────────────────────────────────────────────


@dataclass(frozen=True)
class SessionStartEvent:
    """Candidate is ready to begin the interview."""

    type: Literal["session.start"] = "session.start"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    interview_id: UUID = field(default_factory=_new_id)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CandidateSpeakingEvent:
    """Voice Activity Detection: candidate has started speaking."""

    type: Literal["candidate.speaking"] = "candidate.speaking"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    answer_id: UUID = field(default_factory=_new_id)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CandidateStoppedEvent:
    """Voice Activity Detection: candidate has finished speaking."""

    type: Literal["candidate.stopped"] = "candidate.stopped"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    answer_id: UUID = field(default_factory=_new_id)
    duration_seconds: float = 0.0
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SessionPauseEvent:
    """Candidate pauses the session."""

    type: Literal["session.pause"] = "session.pause"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    reason: str = ""
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SessionResumeEvent:
    """Candidate resumes the session."""

    type: Literal["session.resume"] = "session.resume"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SessionEndEvent:
    """Candidate ends the session."""

    type: Literal["session.end"] = "session.end"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    reason: str = ""
    payload: dict[str, Any] = field(default_factory=dict)


# ── Server → Client Events ────────────────────────────────────────────────────


@dataclass(frozen=True)
class InterviewerSpeakingEvent:
    """AI interviewer has started speaking (TTS audio playing)."""

    type: Literal["interviewer.speaking"] = "interviewer.speaking"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    question_id: UUID = field(default_factory=_new_id)
    text: str = ""
    audio_url: str = ""
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class InterviewerFinishedEvent:
    """AI interviewer has finished speaking."""

    type: Literal["interviewer.finished"] = "interviewer.finished"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    question_id: UUID = field(default_factory=_new_id)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class QuestionStartedEvent:
    """A new question period has started."""

    type: Literal["question.started"] = "question.started"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    question_id: UUID = field(default_factory=_new_id)
    question_index: int = 0
    total_questions: int = 0
    time_limit_seconds: int | None = None
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class QuestionEndedEvent:
    """Question period has ended."""

    type: Literal["question.ended"] = "question.ended"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    question_id: UUID = field(default_factory=_new_id)
    reason: str = ""
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ProcessingStartedEvent:
    """Async processing pipeline has begun for an answer."""

    type: Literal["processing.started"] = "processing.started"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    answer_id: UUID = field(default_factory=_new_id)
    stages: list[str] = field(default_factory=list)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ProcessingCompletedEvent:
    """All processing is complete and report is ready."""

    type: Literal["processing.completed"] = "processing.completed"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    interview_id: UUID = field(default_factory=_new_id)
    report_url: str = ""
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RealtimeErrorEvent:
    """An error occurred in the realtime session."""

    type: Literal["error"] = "error"
    protocol_version: str = PROTOCOL_VERSION
    event_id: UUID = field(default_factory=_new_id)
    session_id: UUID = field(default_factory=_new_id)
    sequence_number: int = 0
    timestamp: datetime = field(default_factory=_now)
    code: str = "UNKNOWN_ERROR"
    message: str = "An error occurred"
    recoverable: bool = True
    payload: dict[str, Any] = field(default_factory=dict)


ClientEvent = (
    PingMessage
    | SessionReconnectRequest
    | SessionStartEvent
    | CandidateSpeakingEvent
    | CandidateStoppedEvent
    | SessionPauseEvent
    | SessionResumeEvent
    | SessionEndEvent
)

ServerEvent = (
    PongMessage
    | InterviewerSpeakingEvent
    | InterviewerFinishedEvent
    | QuestionStartedEvent
    | QuestionEndedEvent
    | ProcessingStartedEvent
    | ProcessingCompletedEvent
    | RealtimeErrorEvent
)
