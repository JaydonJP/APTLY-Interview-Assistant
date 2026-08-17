# APTLY — Domain Entities & Data Model

## Core Philosophy: The Answer as Central Analytical Unit

In APTLY, the **Answer** is the atomic analytical entity connecting raw measurements to coaching feedback:

```
                  QUESTION
                     │
                     ▼
                  ANSWER  ◄── [CENTRAL ANALYTICAL UNIT]
                     │
     ┌───────────────┼────────────────────────┐
     │               │                        │
  RAW ASSETS    TRANSCRIPTION          METRICS (DETERMINISTIC)
  - Audio Asset - Word-aligned Text    - SpeechMetrics (WPM, fillers, pauses, vocal energy)
  - Video Asset - Timestamped Words    - VisionMetrics (MediaPipe landmarks, head pose, eye-contact)
                     │
                     ▼
             CONTENT & DELIVERY EVALUATION (AI + DETERMINISTIC)
             - STAR Structure Detection
             - Technical Depth Scoring
             - Claim Evidence Verification
             - Relevance & Delivery Scoring
                     │
                     ▼
             COACHING FEEDBACK & DRILLS
             - Evidence-backed Coaching Items
             - Timestamped Actionable Drills
```

---

## Entity Relationship Diagram

```
User (1)
  └── Job / RoleProfile (0..N)
        └── Interview (1..N)
              └── Question (1..N)
                    └── Answer (1..N)  [CENTRAL ENTITY]
                          ├── MediaAsset (audio/video storage keys & metadata)
                          ├── Transcript (word timestamps & confidence)
                          ├── SpeechMetrics (deterministic audio features)
                          ├── VisionMetrics (browser-side MediaPipe features)
                          ├── ContentEvaluation (STAR, claims, depth)
                          ├── DeliveryEvaluation (pace, gaze, fillers)
                          └── CoachingItem (traceable feedback referencing metrics)
```

---

## Detailed Entity Schemas

### 1. Interview (`interviews`)
Represents an entire practice session.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique identifier (v4) |
| `user_id` | `UUID` (FK) | Owner user (Phase 1+) |
| `role_profile_id` | `UUID` (FK) | Target job profile (Phase 1+) |
| `title` | `VARCHAR(255)` | Descriptive session title |
| `status` | `VARCHAR(50)` | `created`, `configured`, `active`, `processing`, `completed`, `failed` |
| `metrics_schema_version` | `VARCHAR(20)` | Schema version for derived metrics (e.g. `"1.0"`) |
| `evaluation_schema_version` | `VARCHAR(20)` | Schema version for evaluations (e.g. `"1.0"`) |
| `scoring_algorithm_version` | `VARCHAR(20)` | Algorithm version used for progress tracking |
| `created_at` | `TIMESTAMPTZ` | Timestamp of creation (UTC) |
| `updated_at` | `TIMESTAMPTZ` | Last update timestamp (UTC) |
| `deleted_at` | `TIMESTAMPTZ` | Soft deletion timestamp |

---

### 2. Question (`questions` — Phase 1+)
Questions generated for the candidate.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique identifier |
| `interview_id` | `UUID` (FK) | Parent interview |
| `question_index` | `INTEGER` | Order in session (0, 1, 2...) |
| `question_text` | `TEXT` | AI-generated prompt text |
| `category` | `VARCHAR(50)` | `behavioral`, `technical`, `situational` |
| `difficulty` | `INTEGER` | 1-5 difficulty level |
| `prompt_version` | `VARCHAR(100)` | Prompt version used to generate |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

---

### 3. Answer (`answers` — Phase 1+ Central Analytical Entity)
Represents a recorded response to a specific question.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique answer identifier |
| `interview_id` | `UUID` (FK) | Parent interview |
| `question_id` | `UUID` (FK) | Associated question |
| `status` | `VARCHAR(50)` | `recording`, `uploaded`, `transcribing`, `processing`, `evaluated`, `failed` |
| `audio_storage_key` | `VARCHAR(500)` | Object storage key (`raw_audio/{interview_id}/{uuid}.webm`) |
| `video_storage_key` | `VARCHAR(500)` | Optional video key (if video retained) |
| `duration_seconds` | `FLOAT` | Total answer duration |
| `created_at` | `TIMESTAMPTZ` | Recording start timestamp |
| `updated_at` | `TIMESTAMPTZ` | Status update timestamp |

---

### 4. Transcript (`transcripts` — Phase 1+)
Word-level aligned transcription.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique transcript identifier |
| `answer_id` | `UUID` (FK) | Parent answer |
| `storage_key` | `VARCHAR(500)` | Key to JSON transcript in object storage |
| `full_text` | `TEXT` | Cleaned full transcript text |
| `word_count` | `INTEGER` | Total word count |
| `model_provider` | `VARCHAR(50)` | `whisperx`, `deepgram`, `mock` |
| `model_version` | `VARCHAR(100)` | e.g. `"whisperx-large-v3"` |
| `schema_version` | `VARCHAR(20)` | `"1.0"` |
| `created_at` | `TIMESTAMPTZ` | Timestamp |

---

### 5. SpeechMetrics (`speech_metrics` — Phase 1+ Deterministic)

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique metric record ID |
| `answer_id` | `UUID` (FK) | Parent answer |
| `schema_version` | `VARCHAR(20)` | `"1.0"` (Immutable) |
| `wpm` | `FLOAT` | Words per minute |
| `filler_count` | `INTEGER` | Total filler words detected |
| `filler_rate` | `FLOAT` | Fillers per 100 words |
| `pause_count` | `INTEGER` | Number of pauses > 300ms |
| `total_silence_seconds` | `FLOAT` | Sum of pause durations |
| `vocal_energy_db` | `FLOAT` | Mean RMS audio energy in dBFS |
| `energy_variance` | `FLOAT` | Variance of vocal energy |
| `filler_words_json` | `JSONB` | `[{"word": "um", "timestamp": 4.2, "duration": 0.3}]` |
| `pauses_json` | `JSONB` | `[{"start": 12.1, "end": 13.4, "duration": 1.3}]` |
| `created_at` | `TIMESTAMPTZ` | Computation timestamp |

---

### 6. VisionMetrics (`vision_metrics` — Phase 1+ Browser-Side Deterministic)

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique metric record ID |
| `answer_id` | `UUID` (FK) | Parent answer |
| `schema_version` | `VARCHAR(20)` | `"1.0"` (Immutable) |
| `camera_facing_ratio` | `FLOAT` | Ratio of frames looking at camera (0.0 - 1.0) |
| `look_away_events_count`| `INTEGER` | Distinct look-away occurrences |
| `head_nod_count` | `INTEGER` | Nod gestures detected |
| `head_shake_count` | `INTEGER` | Shake gestures detected |
| `head_movement_variance`| `FLOAT` | Variance of pitch/yaw/roll |
| `face_detected_ratio` | `FLOAT` | Valid face tracking ratio |
| `created_at` | `TIMESTAMPTZ` | Computation timestamp |

---

### 7. Content & Delivery Evaluation (`content_evaluations` — Phase 2+)

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique evaluation ID |
| `answer_id` | `UUID` (FK) | Parent answer |
| `prompt_name` | `VARCHAR(100)` | e.g. `"content_evaluation"` |
| `prompt_version` | `VARCHAR(50)` | e.g. `"v1"` |
| `model_provider` | `VARCHAR(50)` | e.g. `"anthropic"`, `"openai"` |
| `model_name` | `VARCHAR(100)` | e.g. `"claude-3-7-sonnet"` |
| `model_version` | `VARCHAR(50)` | Model snapshot |
| `evaluation_schema_version`| `VARCHAR(20)` | `"1.0"` |
| `overall_score` | `FLOAT` | Normalized score (0.0 - 1.0) |
| `relevance_score` | `FLOAT` | Question relevance |
| `star_structure_score` | `FLOAT` | STAR adherence score |
| `technical_depth_score` | `FLOAT` | Technical accuracy & specificity |
| `evidence_quality_score` | `FLOAT` | Substantiation of claims |
| `unsupported_claims_json` | `JSONB` | Unsupported claims detected with transcript quotes |
| `strengths_json` | `JSONB` | Array of strength statements |
| `improvements_json` | `JSONB` | Array of improvement recommendations |
| `created_at` | `TIMESTAMPTZ` | Evaluation timestamp |

---

### 8. Coaching Feedback (`coaching_items` — Phase 3+)

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique coaching item ID |
| `interview_id` | `UUID` (FK) | Parent interview |
| `answer_id` | `UUID` (FK) | Target answer |
| `category` | `VARCHAR(50)` | `delivery`, `content` |
| `priority` | `VARCHAR(20)` | `high`, `medium`, `low` |
| `issue` | `TEXT` | Specific diagnosis |
| `evidence` | `TEXT` | Quote or metric value from answer |
| `metric_name` | `VARCHAR(100)` | e.g. `"filler_rate"`, `"wpm"` |
| `metric_value` | `FLOAT` | Measured value |
| `timestamp_seconds` | `FLOAT` | Exact point in answer audio |
| `suggestion` | `TEXT` | Actionable coaching advice |
| `drill_id` | `UUID` (FK) | Recommended drill |
| `created_at` | `TIMESTAMPTZ` | Timestamp |

---

## Scoring Versioning Rules

1. **Immutability of Historical Scores**: Evaluations are never recomputed using newer models/prompts unless explicitly requested by the user as a re-evaluation.
2. **Version Isolation in Progress Tracking**: Progress trends only compare interviews evaluated under the same `scoring_algorithm_version`.
