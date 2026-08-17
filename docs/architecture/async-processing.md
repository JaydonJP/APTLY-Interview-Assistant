# APTLY — Async Processing Pipeline

## Overview

All compute-intensive work runs asynchronously after answers are recorded.
The realtime interview is NEVER blocked by processing.

## Pipeline

```
[REALTIME — interview in progress]
Candidate answers question
         ↓
Browser stops recording → uploads audio to storage
         ↓
API: POST /api/v1/interviews/{id}/answers
  → stores answer metadata (storage_key, duration)
  → fires AnswerRecorded event
  → enqueues processing job in Redis
         ↓
[ASYNC — background workers]

Stage 1: TRANSCRIPTION
  TranscriptionWorker
  ↓ reads audio from storage
  ↓ calls WhisperX (GPU)
  ↓ produces word-aligned transcript
  ↓ stores transcript in storage
  ↓ fires TranscriptReady event

Stage 2: MEASUREMENT (runs in parallel after Stage 1)
  ├── AudioFeaturesWorker
  │   ↓ reads transcript words
  │   ↓ detects filler words (pattern match)
  │   ↓ computes WPM (word_count / duration)
  │   ↓ detects pauses (gaps > 300ms between words)
  │   ↓ produces SpeechMetrics{schema_version: "1.0"}
  │
  └── ContentAnalysisWorker
      ↓ reads transcript
      ↓ runs STAR structure detector
      ↓ runs technical term extractor
      ↓ runs claim detector
      ↓ produces ContentFeatures{schema_version: "1.0"}

[VisionMetrics arrive from browser during answer — already done]

Stage 3: INTERPRETATION (requires Stage 2 complete)
  LLMEvaluationWorker
  ↓ receives: transcript + SpeechMetrics + VisionMetrics + ContentFeatures
  ↓ calls LLM with structured prompt
  ↓ prompt records: prompt_version, evaluation_schema_version
  ↓ produces ContentEvaluation + DeliveryEvaluation
  ↓ fires AnswerEvaluated event

Stage 4: FOLLOW-UP (optional — requires Stage 3)
  FollowupWorker
  ↓ generates follow-up question grounded in evaluation evidence
  ↓ fires FollowupGenerated event
  ↓ WebSocket sends question.started to browser

Stage 5: REPORT (after all answers evaluated)
  ReportWorker
  ↓ aggregates all evaluations
  ↓ runs feature fusion
  ↓ generates coaching items (each with evidence reference)
  ↓ generates practice drills
  ↓ stores report
  ↓ fires ReportGenerated event
  ↓ WebSocket sends processing.completed to browser
```

## Idempotency

All processing jobs are idempotent:
- If a job runs twice, the second run produces the same result
- Jobs check if output already exists before processing
- This enables safe retries

## Schema Version Tracking

Every processing stage records versions:

```json
{
  "transcription_model_version": "whisperx-v3",
  "speech_metrics_schema_version": "1.0",
  "vision_metrics_schema_version": "1.0",
  "content_features_schema_version": "1.0",
  "evaluation_schema_version": "1.0",
  "prompt_version": "content_evaluation/v1",
  "scoring_algorithm_version": "1.0"
}
```

Historical records retain their original versions. Progress tracking compares
scores within the same `scoring_algorithm_version` to avoid false trends.
