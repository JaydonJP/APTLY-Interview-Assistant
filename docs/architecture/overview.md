# APTLY — Architecture Overview

## System Positioning

**"Evidence-Grounded Multimodal AI Interview Coach"**

Core loop: `INTERVIEW → MEASURE → DIAGNOSE → PRACTICE → REPEAT → VERIFY`

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER                                         [BROWSER-SIDE] │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js (App Router)                                │   │
│  │  ├── Interview UI (camera, question, timer)          │   │
│  │  ├── MediaPipe (WASM) → VisionMetrics [DETERMINISTIC]│   │
│  │  ├── WebSocket client ──────────────────────────────►│   │
│  │  └── API Client (TanStack Query)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTPS / WSS
┌───────────────────────────────▼─────────────────────────────┐
│  FastAPI                                         [SERVER-SIDE]  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REST API (/api/v1/)          WebSocket (/realtime)  │   │
│  │  ├── Health endpoints         [REALTIME]             │   │
│  │  ├── Interview endpoints                             │   │
│  │  └── Upload (presigned URL)                         │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
│  ┌──────────────────▼──────────────┐                        │
│  │  Domain / Services              │                        │
│  │  ├── Provider DI (LLM/TTS/etc.) │  [SERVER-SIDE]        │
│  │  ├── Storage abstraction        │                        │
│  │  └── Repository layer           │                        │
│  └──────────────────┬──────────────┘                        │
│                     │                                         │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  PostgreSQL (SQLAlchemy 2.x + Alembic)              │   │
│  └────────────────────────────────────────────────────-─┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Redis (queue, cache, session state)                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Object Storage (S3/R2/Supabase)                    │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────┘
                                │ (async — Redis job queue)
┌───────────────────────────────▼─────────────────────────────┐
│  ASYNC WORKERS                                   [SERVER-SIDE]  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Transcription Worker  [ASYNC] [DETERMINISTIC]       │   │
│  │  → WhisperX → Word-aligned transcript                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Audio Features Worker  [ASYNC] [DETERMINISTIC]      │   │
│  │  → WPM, filler words, pauses, vocal energy           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Content Analysis Worker  [ASYNC] [DETERMINISTIC]    │   │
│  │  → STAR detection, claim extraction, depth scoring   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LLM Evaluation Worker  [ASYNC] [AI]                 │   │
│  │  → Receives structured features (NOT raw media)      │   │
│  │  → Produces explanation + coaching                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Report Worker  [ASYNC]                              │   │
│  │  → Feature fusion → Final report                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Classification

| Component | Type | Phase |
|---|---|---|
| Next.js App Router | BROWSER-SIDE | 0 |
| MediaPipe (WASM) | BROWSER-SIDE, DETERMINISTIC | 1+ |
| WebSocket Client | BROWSER-SIDE, REALTIME | 1+ |
| FastAPI REST API | SERVER-SIDE | 0 |
| WebSocket Server | SERVER-SIDE, REALTIME | 1+ |
| SQLAlchemy + Postgres | SERVER-SIDE | 0 |
| Redis | SERVER-SIDE | 0 (config), 1 (use) |
| Object Storage | SERVER-SIDE | 0 (local), 1+ (S3) |
| Transcription (WhisperX) | SERVER-SIDE, ASYNC, DETERMINISTIC | 1+ |
| Audio Feature Extractor | SERVER-SIDE, ASYNC, DETERMINISTIC | 1+ |
| Content Analyzer | SERVER-SIDE, ASYNC, DETERMINISTIC | 1+ |
| LLM Evaluator | SERVER-SIDE, ASYNC, AI | 1+ |
| TTS (AI Interviewer) | SERVER-SIDE, REALTIME, AI | 1+ |
| Report Generator | SERVER-SIDE, ASYNC | 1+ |

---

## Measurement Before Interpretation

**NEVER:**
```
Raw Video → LLM → "candidate seems nervous"
```

**ALWAYS:**
```
Raw Audio → WhisperX → SpeechMetrics → LLM → "candidate used 7 filler words (rate: 4.7/min)"
Browser   → MediaPipe → VisionMetrics → LLM → "camera-facing ratio was 0.72 (below target 0.85)"
```

---

## Provider Abstraction

All AI/ML providers are behind interfaces, injectable via FastAPI DI:

```
LLMProvider         TTS Provider        TranscriptionProvider    StorageProvider
├── MockLLM         ├── MockTTS         ├── MockTranscription    ├── LocalStorage
├── OpenAI (P1)     ├── ElevenLabs (P1) ├── WhisperX (P1)       └── S3Compat (P1)
└── Anthropic (P1)  └── OpenAI TTS (P1) └── Deepgram (P1+)
```

---

## Phase Roadmap

| Phase | Focus |
|---|---|
| **0 (current)** | Foundation scaffold — no AI, no media |
| **1** | Core interview loop — WebSocket, TTS, Whisper, basic LLM |
| **2** | Full analysis — MediaPipe, audio features, STAR detection |
| **3** | Coaching — evidence-grounded feedback, practice drills |
| **4** | Progress tracking, adaptive difficulty, panel mode |
| **5** | Replay, export, privacy workflows |
