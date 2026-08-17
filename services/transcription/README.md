# services/transcription — Transcription Service

## Purpose

Handles speech-to-text transcription of recorded candidate answers.

## Phase 0 Status

**Stub only.** Uses `MockTranscriptionProvider` which returns a deterministic
fixed transcript with word-level timing.

## Architecture Role

```
Worker (async job)
      ↓
Transcription Service (this)
      ↓
TranscriptionProvider (interface)
├── MockTranscriptionProvider      ← Phase 0
├── WhisperProvider (local)        ← Phase 1
└── WhisperXProvider (GPU worker)  ← Phase 1+
```

## Why Async?

Transcription is NEVER realtime in APTLY.
The interview continues in realtime; transcription runs post-answer.

Timeline:
```
T+0s   Candidate finishes speaking
T+0s   AnswerRecorded event fired
T+0s   Audio stored in object storage
T+0s   Transcription job queued (Redis/Celery)
T+10s  (async) Transcription complete → TranscriptReady event
T+20s  (async) Speech metrics computed
T+30s  (async) Content evaluation complete
```

## Output Format

Word-level timing is essential for:
- **Filler word detection** (exact timestamps of "um", "uh", "like")
- **WPM calculation** (words / total duration)
- **Pause detection** (gaps between word end → next word start)
- **Answer replay synchronisation** (show metrics at timestamp on playback)

## Future Files

```
services/transcription/
├── README.md          ← This file
└── (Phase 1+)
    ├── whisper_provider.py
    ├── whisperx_provider.py
    └── alignment.py   ← Forced alignment for word timestamps
```
