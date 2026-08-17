"""
APTLY API — Structured Logging

Uses structlog for JSON-structured logs in production
and pretty-printed logs in development.

Context variables allow per-request and per-session tracing.
"""

from __future__ import annotations

import logging
import sys
from contextvars import ContextVar
from uuid import uuid4

import structlog
from structlog.types import EventDict, WrappedLogger

# ── Context Variables ─────────────────────────────────────────────────────────
# These are set per-request by the RequestIDMiddleware and can be read
# anywhere in the call stack during that request.

_request_id_var: ContextVar[str] = ContextVar("request_id", default="")
_session_id_var: ContextVar[str] = ContextVar("session_id", default="")
_interview_id_var: ContextVar[str] = ContextVar("interview_id", default="")
_question_id_var: ContextVar[str] = ContextVar("question_id", default="")
_answer_id_var: ContextVar[str] = ContextVar("answer_id", default="")
_job_id_var: ContextVar[str] = ContextVar("job_id", default="")


def get_request_id() -> str:
    """Return the current request ID from context."""
    return _request_id_var.get()


def set_request_id(request_id: str) -> None:
    """Set the request ID in the current context."""
    _request_id_var.set(request_id)


def get_session_id() -> str:
    """Return the current session ID from context."""
    return _session_id_var.get()


def set_session_id(session_id: str) -> None:
    """Set the session ID in the current context."""
    _session_id_var.set(session_id)


def get_interview_id() -> str:
    """Return the current interview ID from context."""
    return _interview_id_var.get()


def set_interview_id(interview_id: str) -> None:
    """Set the interview ID in the current context."""
    _interview_id_var.set(interview_id)


def get_question_id() -> str:
    """Return the current question ID from context."""
    return _question_id_var.get()


def set_question_id(question_id: str) -> None:
    """Set the question ID in the current context."""
    _question_id_var.set(question_id)


def get_answer_id() -> str:
    """Return the current answer ID from context."""
    return _answer_id_var.get()


def set_answer_id(answer_id: str) -> None:
    """Set the answer ID in the current context."""
    _answer_id_var.set(answer_id)


def get_job_id() -> str:
    """Return the current processing job ID from context."""
    return _job_id_var.get()


def set_job_id(job_id: str) -> None:
    """Set the processing job ID in the current context."""
    _job_id_var.set(job_id)


def generate_request_id() -> str:
    """Generate a new unique request ID."""
    return str(uuid4())


# ── Context Injector ──────────────────────────────────────────────────────────


def _add_request_context(
    logger: WrappedLogger,
    method_name: str,
    event_dict: EventDict,
) -> EventDict:
    """
    Structlog processor: injects request/session/interview/question/answer/job context into every log entry.
    """
    if request_id := get_request_id():
        event_dict["request_id"] = request_id
    if session_id := get_session_id():
        event_dict["session_id"] = session_id
    if interview_id := get_interview_id():
        event_dict["interview_id"] = interview_id
    if question_id := get_question_id():
        event_dict["question_id"] = question_id
    if answer_id := get_answer_id():
        event_dict["answer_id"] = answer_id
    if job_id := get_job_id():
        event_dict["job_id"] = job_id
    return event_dict


# ── Logger Configuration ──────────────────────────────────────────────────────


def configure_logging(is_development: bool = True) -> None:
    """
    Configure structured logging for the application.

    In development: pretty-printed, coloured output.
    In production:  JSON-structured output for log aggregators.
    """
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        _add_request_context,
    ]

    if is_development:
        structlog.configure(
            processors=[
                *shared_processors,
                structlog.dev.ConsoleRenderer(colors=True),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=False,
        )
    else:
        structlog.configure(
            processors=[
                *shared_processors,
                structlog.processors.dict_tracebacks,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )

    # Also configure stdlib logging to route through structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

    # Suppress noisy third-party loggers
    for noisy_logger in ["uvicorn.access", "sqlalchemy.engine"]:
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger with the given name."""
    logger: structlog.stdlib.BoundLogger = structlog.get_logger(name)
    return logger
