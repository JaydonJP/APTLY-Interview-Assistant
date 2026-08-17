# APTLY — Media Pipeline & Architecture

## Overview

The APTLY media pipeline handles high-throughput video and audio recording, browser-side computer vision inference, direct object storage uploads, and asynchronous ML audio processing.

```
                          ┌──────────────────────────────────────────────────────────┐
                          │                        BROWSER                           │
                          │                                                          │
                          │   Camera / Mic ──────► getUserMedia                      │
                          │                             │                            │
                          │              ┌──────────────┴──────────────┐             │
                          │              ▼                             ▼             │
                          │        MediaRecorder                   MediaPipe         │
                          │         (Audio/Video)                  (Vision)          │
                          │              │                             │             │
                          │              │ WebM Chunks                 │ Landmarks   │
                          │              ▼                             ▼             │
                          │    Direct Storage Upload              VisionMetrics      │
                          │    (Signed S3/R2 URL)                 (JSON only)        │
                          └──────────────┬─────────────────────────────┬─────────────┘
                                         │                             │
                                  Direct │ Upload                      │ POST
                                         ▼                             ▼
                          ┌─────────────────────────────┐  ┌─────────────────────────┐
                          │       OBJECT STORAGE        │  │     FASTAPI BACKEND     │
                          │       (S3 / R2 / Dev Local) │  │                         │
                          │                             │  │ 1. Issues signed URL    │
                          │ Audio/Video Key:            │  │ 2. Receives metrics     │
                          │ raw_audio/{uuid}.webm       │  │ 3. Enqueues job         │
                          └──────────────┬──────────────┘  └───────────┬─────────────┘
                                         │                             │
                                         │ Trigger                     │
                                         ▼                             ▼
                          ┌──────────────────────────────────────────────────────────┐
                          │                   ASYNC WORKER POOL                      │
                          │                                                          │
                          │   1. FFmpeg: Audio extraction & normalization (16kHz)    │
                          │   2. WhisperX: Timestamped word-level transcription      │
                          │   3. Audio Feature Extraction: WPM, fillers, pauses, RMS │
                          │   4. LLM Content Evaluation (receives structured JSON)   │
                          │   5. Multimodal Feature Fusion & Coaching Generation     │
                          └──────────────────────────────────────────────────────────┘
```

---

## Key Architecture Principles

### 1. Media NEVER Travels Through JSON API Bodies
- **Rule**: `POST /answers` does **NOT** accept Base64-encoded audio/video payloads.
- **Workflow**:
  1. Frontend requests an authorized presigned upload URL: `GET /api/v1/interviews/{id}/upload-url`.
  2. Backend generates a presigned S3/R2 URL bound to a UUID key (`raw_audio/{interview_id}/{uuid}.webm`).
  3. Frontend uploads binary chunks directly from `MediaRecorder` to Object Storage via HTTP `PUT`.
  4. Frontend commits metadata (`storage_key`, `duration_seconds`, `checksum_sha256`) to the backend.

### 2. Browser-Side MediaPipe (Privacy & Performance)
- **Design**: MediaPipe runs client-side in WebAssembly (WASM).
- **Extracted Browser Metrics**:
  - Face mesh landmarks
  - Head pose (pitch, yaw, roll)
  - Camera-facing attention proxy (eye gaze alignment)
  - Look-away events
  - Head nods / shakes
- **Privacy Guarantee**: Raw video frames **never leave the user's browser**. Only anonymized scalar `VisionMetrics` JSON are transmitted to backend servers.
- **Benefits**:
  - Zero GPU server processing costs for video streaming.
  - Sub-millisecond latency for visual delivery feedback.
  - Full GDPR / biometric privacy compliance.

### 3. Media Asset Lifecycle State Machine

```
              ┌───────────────┐
              │   UPLOADING   │ (Browser uploading to storage)
              └───────┬───────┘
                      │ Upload complete & committed
                      ▼
              ┌───────────────┐
              │   UPLOADED    │ (Storage verified, ready for workers)
              └───────┬───────┘
                      │ Job claimed by worker
                      ▼
        ┌────────►┌───────────────┐
        │         │  PROCESSING   │ (FFmpeg -> WhisperX -> Metrics)
        │         └───────┬───────┘
        │ Retry           │
        │                 ├───────────────────────┐
        │ Success         │ Failure               │
        │                 ▼                       ▼
        │         ┌───────────────┐       ┌───────────────┐
        │         │   PROCESSED   │       │    FAILED     │
        │         └───────┬───────┘       └───────┬───────┘
        │                 │                       │
        └─────────────────┼───────────────────────┘
                          │ Retention expired / User requested
                          ▼
                  ┌───────────────┐
                  │    DELETED    │
                  └───────────────┘
```

### 4. Processing Job States

| Status | Trigger / Meaning |
|---|---|
| `PENDING` | Answer recorded, job record created |
| `QUEUED` | Job enqueued in Redis worker queue |
| `PROCESSING` | Worker actively executing transcription / analysis |
| `COMPLETED` | All analysis stages finished, evaluation & metrics stored |
| `FAILED` | Worker crashed or encountered corrupted audio |
| `RETRYING` | Scheduled for automated retry with exponential backoff |
