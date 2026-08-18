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
                          │ raw_video/{uuid}.webm       │  │ 3. Enqueues job         │
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
  1. The current interview flow submits the `MediaRecorder` WebM as multipart
     `audio_file` for compatibility; the backend classifies it as audio or
     video from its MIME/stream metadata and stores opaque keys.
  2. The browser separately sends bounded `vision_metrics_json`; sampled frames
     and face embeddings are never sent.
  3. The original media is retained for private evidence replay while FFmpeg
     extracts a normalized WAV for transcription.

### 2. Browser-Side MediaPipe (Privacy & Performance)
- **Design**: MediaPipe runs client-side in WebAssembly (WASM).
- **Extracted Browser Metrics**:
  - Face mesh landmarks
  - Head pose (pitch, yaw, roll)
  - Camera-facing attention proxy (eye gaze alignment)
  - Look-away events
  - Head nods / shakes
- **Privacy Guarantee**: Raw video frames are never sent to a model API or
  retained as individual analysis frames. Only anonymized scalar
  `VisionMetrics` JSON is sent for visual coaching; the original recording is
  separately retained for the user's private replay.
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
