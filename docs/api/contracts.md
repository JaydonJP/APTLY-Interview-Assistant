# APTLY — API Contracts

## Versioning Strategy

All API routes are prefixed `/api/v1/`.
Breaking changes require a new prefix (`/api/v2/`) — never modify existing versioned contracts.

## Schema Version Convention

All structured AI/metric outputs include:
```json
{
  "schema_version": "1.0",
  ...
}
```

## Base URL

```
http://localhost:8000        (local development)
https://api.aptly.app        (production)
```

---

## Implemented Endpoints (Phase 0)

### `GET /health`
Liveness probe. Always 200 if process is alive.

**Response:**
```json
{
  "status": "ok",
  "app_name": "APTLY",
  "app_version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-01-01T00:00:00Z",
  "services": [],
  "using_mock_providers": true
}
```

### `GET /api/v1/health`
Detailed health with dependency checks.

**Response:**
```json
{
  "status": "ok",
  "services": [
    {"name": "postgresql", "status": "ok", "latency_ms": 2.4},
    {"name": "llm_provider (mock)", "status": "ok", "message": "mock"},
    {"name": "storage (local)", "status": "ok"}
  ],
  "using_mock_providers": true
}
```

---

## Planned Endpoints (Phase 1+)

### `POST /api/v1/jobs/analyze`
Analyze a job description and extract a structured role profile.

**Request:**
```json
{
  "job_description": "string (raw job posting text)"
}
```

**Response:**
```json
{
  "schema_version": "1.0",
  "role_title": "Senior Software Engineer",
  "seniority_level": "senior",
  "required_skills": ["Python", "FastAPI"],
  "key_responsibilities": ["..."],
  "interview_focus_areas": ["system design", "distributed systems"]
}
```

---

### `POST /api/v1/interviews`
Create a new interview session.

**Request:**
```json
{
  "title": "Google SWE Interview Practice",
  "role_profile_id": "uuid (optional)",
  "job_description": "string (optional — analyzed on creation)"
}
```

**Response:** `Interview` object

---

### `GET /api/v1/interviews/{id}`
Get interview details, status, and question list.

**Response:** `Interview` object with nested questions

---

### `POST /api/v1/interviews/{id}/start`
Transition interview to `active` state. Returns first question.

**Response:**
```json
{
  "interview_id": "uuid",
  "status": "active",
  "first_question": {
    "id": "uuid",
    "text": "Tell me about yourself",
    "audio_url": "presigned_url_to_tts_audio"
  }
}
```

---

### `GET /api/v1/interviews/{id}/upload-url`
Get a presigned upload URL for answer audio.

**Response:**
```json
{
  "upload_url": "presigned_s3_url",
  "answer_id": "uuid",
  "expires_at": "2026-01-01T01:00:00Z"
}
```

---

### `POST /api/v1/interviews/{id}/answers`
Register a completed answer (after audio uploaded directly to storage).

**Request:**
```json
{
  "answer_id": "uuid",
  "question_id": "uuid",
  "storage_key": "raw_audio/interview_id/uuid.webm",
  "duration_seconds": 45.2,
  "vision_metrics": {
    "schema_version": "1.0",
    "camera_facing_ratio": 0.87,
    "...": "..."
  }
}
```

---

### `POST /api/v1/interviews/{id}/finish`
Mark interview complete. Triggers async report generation.

---

### `GET /api/v1/interviews/{id}/report`
Get the completed evaluation report.

**Response:**
```json
{
  "schema_version": "1.0",
  "evaluation_schema_version": "1.0",
  "prompt_version": "content_evaluation/v1",
  "scoring_algorithm_version": "1.0",
  "overall_score": 0.74,
  "answers": [...],
  "coaching_items": [...],
  "practice_drills": [...]
}
```

---

### `GET /api/v1/progress`
Historical progress snapshots and trend data.

---

## WebSocket Protocol

```
WS /api/v1/interviews/{id}/realtime
```

See `docs/architecture/realtime.md` for full protocol specification.

---

## Standard Error Response

All errors return the same envelope:

```json
{
  "error": {
    "code": "INTERVIEW_NOT_FOUND",
    "message": "Interview does not exist",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "details": null
  }
}
```

### Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource does not exist |
| `INTERVIEW_NOT_FOUND` | 404 | Interview not found |
| `VALIDATION_ERROR` | 422 | Domain validation failed |
| `REQUEST_VALIDATION_ERROR` | 422 | Request body invalid |
| `MEDIA_VALIDATION_ERROR` | 422 | File type/size invalid |
| `STORAGE_ERROR` | 500 | Storage operation failed |
| `PROVIDER_ERROR` | 503 | AI/ML provider unavailable |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_IMPLEMENTED` | 501 | Phase 0 stub |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
