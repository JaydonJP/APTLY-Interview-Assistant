# services/audio — Audio Feature Extraction

## Purpose

Extracts measurable delivery features from speech audio.

## Phase 0 Status

**Stub only.** No audio processing implementation yet.

## Features (Phase 1+)

This service produces structured `SpeechMetrics` from a word-aligned transcript:

| Feature | Method | Unit |
|---|---|---|
| Words per minute | word_count / duration | WPM |
| Filler words | Pattern match on word list | count, timestamps |
| Filler rate | filler_count / word_count | ratio |
| Pause count | Gap detection between words | count |
| Pause durations | Gap sizes in transcript | seconds |
| Total silent time | Sum of all gaps > 0.3s | seconds |
| Vocal energy | RMS amplitude analysis | dBFS |
| Energy variance | Monotone detection | variance |

## Architecture Principle

Audio features are **DETERMINISTIC**. They produce numbers.
The LLM never computes WPM. The LLM interprets WPM.

```
Transcript (word-aligned)
         ↓
Audio Feature Extractor (this)
         ↓
SpeechMetrics {wpm, filler_count, pauses, ...}
         ↓
LLM (interpretation + coaching)
```

## SpeechMetrics Schema (v1.0)

```json
{
  "schema_version": "1.0",
  "wpm": 142.5,
  "filler_words": [
    {"word": "um", "timestamp": 4.2, "duration": 0.3}
  ],
  "filler_count": 3,
  "filler_rate": 0.021,
  "pauses": [
    {"start": 12.1, "end": 13.4, "duration": 1.3}
  ],
  "pause_count": 2,
  "total_silence_seconds": 2.1,
  "vocal_energy_db": -18.5,
  "energy_variance": 4.2
}
```

## Future Files

```
services/audio/
├── README.md               ← This file
└── (Phase 1+)
    ├── filler_detection.py
    ├── pace_analysis.py
    ├── pause_analysis.py
    └── energy_analysis.py
```
