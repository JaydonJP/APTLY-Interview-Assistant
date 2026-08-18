# APTLY — Gemini Live Realtime Conversational Engine Guide

This document details the production architecture, configuration settings, ephemeral token security model, AudioWorklet PCM streaming, and fallback options for APTLY's real-time Gemini Live interview mode.

---

## Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                       Browser Client                        │
 │  ┌──────────────────────┐      ┌─────────────────────────┐  │
 │  │  AudioWorklet (16kHz)│      │  useGeminiLiveSession   │  │
 │  └──────────┬───────────┘      └────────────┬────────────┘  │
 └─────────────│───────────────────────────────│───────────────┘
               │ 20-40ms 16kHz PCM             │ Ephemeral Token
               ▼                               ▼
 ┌──────────────────────────┐    ┌─────────────────────────────┐
 │ Gemini Live WebSocket API│    │ APTLY FastAPI (/live-token) │
 └──────────────────────────┘    └─────────────────────────────┘
```

---

## Prerequisites & Required Environment Variables

### Backend Configuration (`apps/api/.env`)
```bash
# Enable Gemini Live Interview Mode
FEATURE_GEMINI_LIVE_INTERVIEW=true
GEMINI_API_KEY=your_google_gemini_api_key_here
LLM_PROVIDER=gemini

# Gemini Live Session Settings
GEMINI_LIVE_MODEL=gemini-2.0-flash-exp
GEMINI_LIVE_LANGUAGE_CODE=en-US
GEMINI_LIVE_TOKEN_TTL_SECONDS=600
```

---

## Ephemeral Token Security Model

1. The client browser calls `POST /api/v1/interviews/{id}/live-token`.
2. The server verifies session eligibility and candidate authorization.
3. The backend mints a short-lived ephemeral token bound to `TTL_SECONDS=600`.
4. **Crucial Security Requirement**: The master `GEMINI_API_KEY` is **never** sent to the client browser.

---

## AudioWorklet & Audio Streaming

- **Format**: 16-bit signed little-endian PCM audio at 16,000 Hz.
- **AudioWorklet**: Implemented in `apps/web/public/audio-processor.js`. Downmixes stereo to mono and resamples frames to 16 kHz.
- **Interruption Handling**: When the candidate speaks or Gemini outputs an interruption event, `flushPlaybackQueue()` immediately halts and purges any queued interviewer audio buffers.

---

## Fallback Behavior

If `FEATURE_GEMINI_LIVE_INTERVIEW=false`, `GEMINI_API_KEY` is omitted, browser HTTPS / AudioWorklet permissions are denied, or WebSocket token acquisition fails:
1. The UI displays **Offline fallback** status.
2. The system seamlessly degrades to the standard `speechSynthesis` / `MediaRecorder` recording loop.
3. Turn finalization, deterministic WPM/filler metrics, Whisper transcripts, STAR Answer DNA, and report cards continue to function without data loss or duplicate entries.
