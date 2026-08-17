"""
APTLY API — Realtime Interview WebSocket Endpoint

Provides bidirectional communication for live interview sessions:
- Server pushes question events, timers, and processing status updates
- Client sends speaking indicators, pause/resume, heartbeat, and reconnection requests
- Maintains sequence tracking and session state recovery
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.core.logging import get_logger
from app.dependencies import get_session_factory
from app.domain.realtime_events import PROTOCOL_VERSION
from app.services.interview_service import InterviewService
from app.services.providers.mock_llm import MockLLMProvider
from app.services.providers.mock_transcription import MockTranscriptionProvider
from app.services.storage.local import LocalStorageProvider

logger = get_logger(__name__)

router = APIRouter(tags=["Realtime WebSocket"])


class ConnectionManager:
    """Manages active WebSocket connections per interview session."""

    def __init__(self) -> None:
        self.active_connections: dict[UUID, set[WebSocket]] = {}
        self.sequence_counters: dict[UUID, int] = {}

    async def connect(self, interview_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        if interview_id not in self.active_connections:
            self.active_connections[interview_id] = set()
            self.sequence_counters[interview_id] = 0
        self.active_connections[interview_id].add(websocket)
        logger.info("websocket_client_connected", interview_id=str(interview_id))

    def disconnect(self, interview_id: UUID, websocket: WebSocket) -> None:
        if interview_id in self.active_connections:
            self.active_connections[interview_id].discard(websocket)
            if not self.active_connections[interview_id]:
                del self.active_connections[interview_id]
        logger.info("websocket_client_disconnected", interview_id=str(interview_id))

    def next_sequence(self, interview_id: UUID) -> int:
        seq = self.sequence_counters.get(interview_id, 0) + 1
        self.sequence_counters[interview_id] = seq
        return seq

    async def send_envelope(
        self,
        websocket: WebSocket,
        interview_id: UUID,
        event_type: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        envelope = {
            "type": event_type,
            "protocol_version": PROTOCOL_VERSION,
            "event_id": str(uuid4()),
            "session_id": str(interview_id),
            "sequence_number": self.next_sequence(interview_id),
            "timestamp": datetime.now(UTC).isoformat(),
            "payload": payload or {},
        }
        await websocket.send_text(json.dumps(envelope))


manager = ConnectionManager()


@router.websocket("/interviews/{interview_id}/realtime")
async def interview_realtime_websocket(
    websocket: WebSocket,
    interview_id: UUID,
) -> None:
    """
    WebSocket channel for live interview session.
    """
    await manager.connect(interview_id, websocket)

    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)

    try:
        # Send initial session state envelope
        async with session_factory() as db:
            service = InterviewService(
                db_session=db,
                llm_provider=MockLLMProvider(),
                transcription_provider=MockTranscriptionProvider(),
                storage_provider=LocalStorageProvider(
                    root_dir=settings.storage_endpoint
                ),
            )
            interview = await service.get_interview_detail(interview_id)
            if interview:
                current_q = (
                    interview.questions[interview.current_question_index]
                    if interview.current_question_index < len(interview.questions)
                    else None
                )
                await manager.send_envelope(
                    websocket,
                    interview_id,
                    "interview.ready",
                    payload={
                        "status": interview.status,
                        "current_question_index": interview.current_question_index,
                        "total_questions": len(interview.questions),
                        "current_question": (
                            {
                                "id": str(current_q.id),
                                "sequence_number": current_q.sequence_number,
                                "category": current_q.category,
                                "question_text": current_q.question_text,
                                "difficulty": current_q.difficulty,
                            }
                            if current_q
                            else None
                        ),
                    },
                )

        # Main message loop
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg_type = data.get("type", "")

                if msg_type == "heartbeat.ping":
                    await manager.send_envelope(
                        websocket,
                        interview_id,
                        "heartbeat.pong",
                        payload={"client_timestamp": data.get("timestamp")},
                    )

                elif msg_type == "session.reconnect":
                    # Reconnection state synchronization
                    async with session_factory() as db:
                        service = InterviewService(
                            db_session=db,
                            llm_provider=MockLLMProvider(),
                            transcription_provider=MockTranscriptionProvider(),
                            storage_provider=LocalStorageProvider(
                                root_dir=settings.storage_endpoint
                            ),
                        )
                        interview = await service.get_interview_detail(interview_id)
                        if interview:
                            current_q = (
                                interview.questions[interview.current_question_index]
                                if interview.current_question_index
                                < len(interview.questions)
                                else None
                            )
                            await manager.send_envelope(
                                websocket,
                                interview_id,
                                "session.reconnected",
                                payload={
                                    "status": interview.status,
                                    "current_question_index": interview.current_question_index,
                                    "total_questions": len(interview.questions),
                                    "current_question": (
                                        {
                                            "id": str(current_q.id),
                                            "sequence_number": current_q.sequence_number,
                                            "category": current_q.category,
                                            "question_text": current_q.question_text,
                                        }
                                        if current_q
                                        else None
                                    ),
                                },
                            )

                elif msg_type in (
                    "candidate.speaking",
                    "candidate.stopped",
                    "session.pause",
                    "session.resume",
                ):
                    logger.debug(
                        "realtime_client_event",
                        msg_type=msg_type,
                        interview_id=str(interview_id),
                    )
                    # Acknowledge client speaking/state event
                    await manager.send_envelope(
                        websocket,
                        interview_id,
                        f"ack.{msg_type}",
                        payload={"received_at": datetime.now(UTC).isoformat()},
                    )

            except json.JSONDecodeError:
                await manager.send_envelope(
                    websocket,
                    interview_id,
                    "error",
                    payload={
                        "code": "INVALID_JSON",
                        "message": "Expected JSON payload.",
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(interview_id, websocket)
    except Exception as exc:
        logger.error(
            "websocket_session_error", error=str(exc), interview_id=str(interview_id)
        )
        manager.disconnect(interview_id, websocket)
