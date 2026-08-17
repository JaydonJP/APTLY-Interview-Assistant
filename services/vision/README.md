# services/vision — Vision Feature Extraction (Browser-Side)

## Purpose

Extracts delivery features from video using computer vision.

## Phase 0 Status

**Stub only.** No vision processing implementation yet.

## Architecture Decision: Browser-Side Processing

Vision processing runs **IN THE BROWSER** using MediaPipe (WASM).

Reasons:
1. **Privacy**: Raw video never leaves the device
2. **Latency**: No upload round-trip for realtime feedback
3. **Cost**: No GPU inference cost for vision features
4. **Compliance**: Raw video can be retained locally, not on servers

```
Browser (MediaPipe WASM)
      ↓
Face Landmarks → Head Pose → Eye Contact Proxy
      ↓
VisionMetrics (JSON) → sent to server per answer
      ↓
Server stores structured metrics (NOT raw video)
```

## Features (Phase 1+)

| Feature | Method | Unit |
|---|---|---|
| Camera-facing ratio | Normalized eye gaze direction | 0.0-1.0 |
| Head nod count | Head rotation detection | count |
| Head shake count | Head rotation detection | count |
| Head movement variance | Rotation variance | degrees |
| Face detected ratio | Frames with face / total | ratio |
| Face confidence | MediaPipe detection confidence | 0.0-1.0 |

## VisionMetrics Schema (v1.0)

```json
{
  "schema_version": "1.0",
  "sampling_fps": 5,
  "total_frames": 150,
  "camera_facing_ratio": 0.87,
  "head_nod_count": 3,
  "head_shake_count": 1,
  "head_movement_variance_deg": 12.4,
  "face_detected_ratio": 0.95,
  "timestamps": []
}
```

## Important: What We DO NOT Do

- Do NOT run emotion recognition
- Do NOT classify "nervousness" from vision alone
- Do NOT make any identity-based inferences
- Do NOT store raw video on servers (only structured metrics)

## Future Files

```
services/vision/
├── README.md          ← This file
└── (Phase 1+ — browser-side TypeScript)
    apps/web/src/lib/vision/
    ├── mediapipe-client.ts
    ├── head-pose.ts
    ├── eye-contact.ts
    └── vision-metrics.ts
```
