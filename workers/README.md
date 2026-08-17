# workers/ — Background Job Workers

## Purpose

Long-running background processing jobs that run asynchronously after an answer is recorded.

## Phase 0 Status

**Stub only.** No worker implementation yet.

## Architecture

Workers are triggered by the Redis job queue (Phase 1+).

```
API Server (FastAPI)
      ↓ (enqueue job)
Redis Queue
      ↓ (dequeue)
Worker Process (Celery / ARQ / RQ)
      ↓
Processing Pipeline:
  1. Transcription Worker
  2. Speech Metrics Worker
  3. Vision Metrics Receiver
  4. Content Evaluation Worker
  5. Delivery Evaluation Worker
  6. Coaching Worker
  7. Report Generation Worker
```

## Job Schemas

Each job carries minimal data — workers load from storage/DB as needed:

```json
{
  "job_type": "transcribe_answer",
  "interview_id": "uuid",
  "answer_id": "uuid",
  "audio_storage_key": "raw_audio/uuid.webm",
  "created_at": "2026-01-01T00:00:00Z"
}
```

## Future Files

```
workers/
├── README.md               ← This file
└── (Phase 1+)
    ├── celery_app.py       ← Or ARQ/RQ configuration
    ├── transcription_worker.py
    ├── speech_metrics_worker.py
    ├── evaluation_worker.py
    ├── coaching_worker.py
    └── report_worker.py
```

## Redis Configuration

Redis URL is configured via `REDIS_URL` environment variable.
Database 0: Job queues
Database 1: Caching
Database 2: Realtime session state
