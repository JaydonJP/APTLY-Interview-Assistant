# APTLY — Realtime Architecture

## WebSocket Endpoint

```
WS /api/v1/interviews/{id}/realtime
```

Phase 1+ implementation. Protocol defined here for Phase 0 planning.

## Protocol Design

### Versioning

Every message includes `protocol_version: "1.0"`.
Breaking protocol changes increment to `"2.0"`.
Old clients on v1 must be handled during transition.

### Message Format

```json
{
  "type": "event.type",
  "protocol_version": "1.0",
  "message_id": "uuid",
  "timestamp": "2026-01-01T00:00:00Z",
  ...event-specific fields
}
```

## Client → Server Events

| Event Type | Trigger | Payload |
|---|---|---|
| `session.start` | Candidate ready | `interview_id` |
| `candidate.speaking` | VAD detects voice | `answer_id` |
| `candidate.stopped` | VAD detects silence | `answer_id`, `duration_seconds` |
| `session.pause` | Candidate pauses | `reason` |
| `session.resume` | Candidate resumes | — |
| `session.end` | Candidate exits | `reason` |

## Server → Client Events

| Event Type | Trigger | Payload |
|---|---|---|
| `question.started` | New question begins | `question_id`, `index`, `total`, `time_limit_seconds` |
| `question.ended` | Time expired or candidate done | `reason` |
| `interviewer.speaking` | TTS audio available | `text`, `audio_url` |
| `interviewer.finished` | TTS playback complete | — |
| `processing.started` | Async pipeline begins | `stages` |
| `processing.completed` | Report ready | `report_url` |
| `error` | Server error | `code`, `message`, `recoverable` |

## Session Reconnect Strategy (Phase 1+)

Interview session state lives in **Redis** (not in-memory).
If WebSocket drops:
1. Client detects disconnection
2. Client shows "Reconnecting..." UI
3. Client reconnects with same `interview_id`
4. Server restores session state from Redis
5. Interview continues from where it left off

```
Redis key: session:{interview_id}
TTL: 24 hours
Contains: current_question_index, elapsed_time, answer_ids
```

## Voice Activity Detection (VAD)

VAD runs **browser-side** (WebRTC AudioWorklet or Silero VAD WASM).

Timeline:
```
T+0    Interviewer finishes speaking
T+0    Browser starts VAD
T+2s   Candidate starts speaking → candidate.speaking event
T+35s  Candidate stops → VAD detects silence for 1.5s
T+36s  candidate.stopped event sent
T+36s  Browser stops recording and uploads audio chunk
```

## Audio Upload Flow

Large audio files NEVER pass through WebSocket JSON messages.
```
1. Browser records audio (MediaRecorder API)
2. On session.end or answer completion:
   a. API: GET /api/v1/interviews/{id}/upload-url (presigned URL)
   b. Browser: PUT audio directly to storage (S3/R2)
   c. Browser: POST /api/v1/interviews/{id}/answers (storage key only)
3. Server enqueues transcription job
```
