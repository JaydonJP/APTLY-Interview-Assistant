# services/vision — Vision Feature Extraction (Browser-Side)

## Purpose

Extracts delivery features from video using computer vision.

## Current Status

Implemented in the browser capture hook. The native `FaceDetector` API is the
safe fallback; when available, the hook attempts a MediaPipe Face Landmarker
runtime in the browser for face landmarks, multi-face counts, a camera-facing
proxy, and low-confidence observable-expression cues. If the model cannot
load, the answer remains valid and the report marks unsupported signals as
unavailable.

## Architecture Decision: Browser-Side Processing

Vision processing runs **IN THE BROWSER** using MediaPipe (WASM).

Reasons:
1. **Privacy**: Frames are not sent to a model API; the private recording may
   still be retained for the user's evidence replay
2. **Latency**: No upload round-trip for realtime feedback
3. **Cost**: No GPU inference cost for vision features
4. **Compliance**: Raw video can be retained locally, not on servers

```
Browser (MediaPipe WASM)
      ↓
Face Landmarks → Face Count / Framing → Camera-Facing Proxy / Expression Cue
      ↓
VisionMetrics (JSON) → sent to server per answer
      ↓
Server stores structured metrics (NOT raw video)
```

## Features (Phase 1+)

| Feature | Method | Unit |
|---|---|---|
| Camera-facing opportunity | Iris/head alignment when landmarks exist; face centering proxy otherwise | 0.0-1.0 |
| Multiple-person ratio | Sampled frames containing more than one face | 0.0-1.0 |
| Face detected ratio | Frames with face / total | ratio |
| Face centering score | Primary face box/landmarks near the camera center | 0.0-1.0 |
| Observable expression cue | Low-confidence blendshape cue: neutral/engaged/strained | label + confidence |

## VisionMetrics Schema (v1.0)

```json
{
  "schema_version": "1.0",
  "provider": "browser-face-landmarker",
  "capability_status": "ready",
  "frame_count": 150,
  "valid_frame_count": 143,
  "eye_contact_ratio": 0.87,
  "multiple_people_ratio": 0.01,
  "face_detected_ratio": 0.95,
  "face_centering_score": 0.91,
  "expression_signal": "neutral",
  "expression_confidence": 0.46,
  "face_presence_events": []
}
```

## Important: What We Do Not Do

- Do not diagnose emotion, nervousness, personality, or mental state.
- Do not make any identity-based inference or store face embeddings.
- Do not treat the expression label as a truth claim; it is a prompt to review
  the recording and is hidden when the capability is unavailable.
- Do not upload sampled frames for analysis; only bounded structured metrics are
  sent with the answer. The original video is stored only for private replay.

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
