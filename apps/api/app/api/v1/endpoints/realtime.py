"""
APTLY API — Realtime Interview WebSocket Endpoint & Live Orchestrator

Provides bidirectional communication for live interview sessions:
- Coordinates live turn-by-turn conversational flow (VAD, speech recognition, ClaimChaser evaluation, TTS)
- Server pushes question events, thinking/processing state, and timers
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
from app.dependencies import (
    _get_llm_provider_instance,
    _get_storage_provider_instance,
    _get_transcription_provider_instance,
    _get_tts_provider_instance,
    get_session_factory,
)
from app.domain.realtime_events import PROTOCOL_VERSION
from app.services.interview_service import InterviewService

logger = get_logger(__name__)

router = APIRouter(tags=["Realtime WebSocket"])


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts per interview session."""

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
        try:
            await websocket.send_text(json.dumps(envelope))
        except Exception as exc:
            logger.warning("websocket_send_failed", interview_id=str(interview_id), error=str(exc))

    async def broadcast_envelope(
        self,
        interview_id: UUID,
        event_type: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Broadcast an event to all connected clients for a session."""
        connections = list(self.active_connections.get(interview_id, []))
        for ws in connections:
            await self.send_envelope(ws, interview_id, event_type, payload)


manager = ConnectionManager()


@router.websocket("/interviews/{interview_id}/realtime")
async def interview_realtime_websocket(
    websocket: WebSocket,
    interview_id: UUID,
) -> None:
    """
    WebSocket channel for live, real-time interview practice session.
    """
    await manager.connect(interview_id, websocket)

    settings = get_settings()
    session_factory = get_session_factory(settings.database_url)

    llm = _get_llm_provider_instance(settings.llm_provider, settings.llm_api_key)
    stt = _get_transcription_provider_instance(settings.transcription_provider, settings.transcription_api_key)
    tts = _get_tts_provider_instance(settings.tts_provider)
    storage = _get_storage_provider_instance(
        settings.storage_provider,
        settings.storage_endpoint,
        settings.storage_access_key,
        settings.storage_secret_key,
        settings.storage_bucket,
    )

    try:
        # Send initial session state envelope
        async with session_factory() as db:
            service = InterviewService(
                db_session=db,
                llm_provider=llm,
                transcription_provider=stt,
                storage_provider=storage,
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
                                "interviewer_persona": current_q.interviewer_persona,
                                "follow_up_depth": current_q.follow_up_depth,
                                "question_source": current_q.question_source,
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
                payload = data.get("payload", {})

                if msg_type == "heartbeat.ping":
                    await manager.send_envelope(
                        websocket,
                        interview_id,
                        "heartbeat.pong",
                        payload={"client_timestamp": data.get("timestamp")},
                    )

                elif msg_type == "session.reconnect":
                    async with session_factory() as db:
                        service = InterviewService(
                            db_session=db,
                            llm_provider=llm,
                            transcription_provider=stt,
                            storage_provider=storage,
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
                                "session.reconnect.ack",
                                payload={
                                    "status": interview.status,
                                    "current_question_index": interview.current_question_index,
                                    "current_question": (
                                        {
                                            "id": str(current_q.id),
                                            "sequence_number": current_q.sequence_number,
                                            "question_text": current_q.question_text,
                                            "interviewer_persona": current_q.interviewer_persona,
                                        }
                                        if current_q
                                        else None
                                    ),
                                },
                            )

                elif msg_type == "candidate.speaking":
                    # Broadcast candidate speaking indicator to session
                    await manager.send_envelope(
                        websocket,
                        interview_id,
                        "interview.state",
                        payload={"state": "LISTENING", "speaking": True},
                    )

                elif msg_type == "candidate.stopped":
                    # Broadcast candidate stopped indicator to session
                    await manager.send_envelope(
                        websocket,
                        interview_id,
                        "interview.processing",
                        payload={"state": "PROCESSING", "speaking": False},
                    )

                elif msg_type == "session.pause":
                    await manager.send_envelope(
                        websocket,
                        interview_id,
                        "session.paused",
                        payload={"status": "paused"},
                    )

                elif msg_type == "session.resume":
                    await manager.send_envelope(
                        websocket,
                        interview_id,
                        "session.resumed",
                        payload={"status": "running"},
                    )

            except json.JSONDecodeError:
                logger.warning("websocket_invalid_json_received", interview_id=str(interview_id))

    except WebSocketDisconnect:
        manager.disconnect(interview_id, websocket)
    except Exception as exc:
        logger.error("websocket_session_error", interview_id=str(interview_id), error=str(exc))
        manager.disconnect(interview_id, websocket)
