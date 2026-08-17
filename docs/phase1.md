# APTLY — Phase 1: Complete Working Interview Engine

## 1. Executive Summary

Phase 1 elevates the verified Phase 0 foundation into a complete, working vertical slice of **APTLY** (Evidence-Grounded Multimodal AI Interview Coach).

Candidates can paste real Job Descriptions, receive structured `RoleProfile` extractions, configure dynamic interviews, enter a live interview room, record answers using browser microphone with live audio visualizer waveforms, submit answers for async background processing (transcription with word-level timestamps, deterministic speech metrics: WPM, filler word count/density/timestamps, pause gap detection), advance through questions, complete the interview, and inspect a full post-interview transcript & speech metrics review.

---

## 2. Implemented Milestones

| Milestone | Feature | Implementation | Status |
|---|---|---|---|
| **1.1** | Job Description → RoleProfile | `POST /api/v1/jobs/analyze` via `RoleAnalyzerService` | **IMPLEMENTED** |
| **1.2** | Dynamic Questions | `QuestionGeneratorService` generating category & competency questions | **IMPLEMENTED** |
| **1.3** | State Machine & Domain | `CREATED -> READY -> RUNNING -> QUESTION_ACTIVE -> ANSWERING -> ANSWER_SUBMITTED -> PROCESSING -> NEXT_QUESTION -> COMPLETING -> COMPLETED` | **IMPLEMENTED** |
| **1.4** | Realtime WebSocket | `WS /api/v1/interviews/{id}/realtime` with sequence tracking & reconnect recovery | **IMPLEMENTED** |
| **1.5** | Browser Microphone | `useAudioRecorder` with `MediaRecorder` & `AudioVisualizer` canvas | **IMPLEMENTED** |
| **1.6** | Direct-to-Storage Audio | `POST /api/v1/interviews/{id}/answers/{id}/upload` via `StorageProvider` | **IMPLEMENTED** |
| **1.7** | Async Audio Worker | Background processing pipeline updating `Answer`, `Transcript`, and `SpeechMetrics` | **IMPLEMENTED** |
| **1.8 & 1.9** | Transcription & Timestamps | `MockTranscriptionProvider` with word-level start/end timestamps | **IMPLEMENTED** |
| **1.10** | Deterministic Speech Metrics | `SpeechMetricsService` (WPM, filler word timestamps/density, silence pauses >2.0s) | **IMPLEMENTED** |
| **1.11 & 1.12** | Complete Interview Flow | `/interview/new` -> `/interview/[id]` -> `/interview/[id]/review` | **IMPLEMENTED** |
| **1.13** | Review Report | Post-interview speech breakdown with exact timestamps and transcripts | **IMPLEMENTED** |

---

## 3. Core Principle: Measurement Before Interpretation

Deterministic audio measurement precedes any language interpretation:

```
RAW AUDIO (.webm / .wav)
      │
      ▼  [Deterministic Audio & STT]
TIMESTAMPED WORD TOKENS ([{word: "basically", start: 0.6s, end: 1.1s}, ...])
      │
      ├─► WPM = Total Words / Speaking Minutes (146.2 WPM)
      ├─► Filler Words = Regex Token Boundary Matching ("basically" @ 0.6s, "um" @ 2.0s)
      ├─► Dead Air Gaps = Inter-word Silence > 2.0s (2.5s gap @ 4.5s)
      │
      ▼
SPEECH METRICS & DATABASE LINKAGE
(Answer -> Transcript -> SpeechMetrics)
```

---

## 4. API Endpoints

- `POST /api/v1/jobs/analyze`: Extract structured `RoleProfile` from raw JD text.
- `GET /api/v1/jobs/{job_id}`: Retrieve stored job and role profile.
- `POST /api/v1/interviews`: Create session and dynamically plan questions.
- `GET /api/v1/interviews/{interview_id}`: Retrieve session detail, questions, and answer states.
- `POST /api/v1/interviews/{interview_id}/start`: Activate session and Question 1.
- `POST /api/v1/interviews/{interview_id}/answers`: Create answer record for question.
- `POST /api/v1/interviews/{interview_id}/answers/{answer_id}/upload`: Binary audio upload and async processing.
- `POST /api/v1/interviews/{interview_id}/next-question`: Advance question index.
- `POST /api/v1/interviews/{interview_id}/finish`: Mark interview completed.
- `GET /api/v1/interviews/{interview_id}/review`: Post-interview review synthesis.
- `WS /api/v1/interviews/{interview_id}/realtime`: Realtime bidirectional session socket.

---

## 5. Development Modes & Environment

- **Mode 1 — Local Mock Development (Active)**:
  - `LLM_PROVIDER=mock`
  - `TRANSCRIPTION_PROVIDER=mock`
  - `STORAGE_PROVIDER=local`
  - Works 100% out of the box without Docker, OpenAI API keys, or GPU dependencies.
- **Mode 2 — Production Cloud AI**:
  - `LLM_PROVIDER=openai` (or `anthropic`/`google`)
  - `TRANSCRIPTION_PROVIDER=whisper` (or `deepgram`/`whisperx`)
  - `STORAGE_PROVIDER=s3` (or `supabase`/`r2`)
