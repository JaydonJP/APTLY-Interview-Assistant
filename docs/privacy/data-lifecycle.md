# APTLY — Privacy & Data Classification

## Data Classification Matrix

APTLY categorizes all user and session data into distinct sensitivity tiers with specific retention and privacy controls.

| Data Class | Sensitivity | Description | Storage Tier | Default Retention | User Deletable |
|---|---|---|---|---|---|
| `RAW_VIDEO` | Highest | Client camera capture | Client-side only (never persisted to server unless user explicitly opts in) | 0 days (ephemeral) | N/A |
| `RAW_AUDIO` | High | Candidate microphone recording | Object storage (`raw_audio/`) | 30 days (transcription retention window) | Yes (Immediate) |
| `TRANSCRIPT` | Medium | Word-aligned text with timestamps | Object storage + Database (`transcripts/`) | 90 days | Yes (Grace period) |
| `SPEECH_METRICS` | Low | Deterministic metrics (WPM, pauses, fillers, RMS) | Database (`speech_metrics`) | 2 years | Yes |
| `VISION_METRICS` | Low | Browser-computed metrics (head pose, eye gaze proxy) | Database (`vision_metrics`) | 2 years | Yes |
| `CONTENT_EVALUATION` | Low | Structured evaluation (STAR, claims, technical depth) | Database (`content_evaluations`) | 2 years | Yes |
| `DELIVERY_EVALUATION` | Low | Delivery evaluation scores | Database (`delivery_evaluations`) | 2 years | Yes |
| `COACHING_FEEDBACK` | Low | Evidence-grounded coaching suggestions & drills | Database (`coaching_items`) | 2 years | Yes |
| `PROGRESS_DATA` | Low | Historical aggregate trend scores | Database (`progress_snapshots`) | Indefinite (or until account deletion) | Yes |

---

## Retention & Deletion Architecture

### Explicit Deletion (No Silent Background Deletion Claims)
- Retention cleanup is managed by a scheduled cron worker (`RetentionCleanupWorker`) querying `StorageObjectMetadata.retention_until < NOW()`.
- Deletion logs record `storage_key`, `data_class`, `deleted_at`, and `reason` (policy expiry vs user GDPR request).

### Privacy Principles
1. **Zero Raw Video Transmitted**: Computer vision face mesh tracking runs in-browser via MediaPipe WASM. Server receives only scalar metrics.
2. **Deterministic Processing Transparency**: Features are calculated deterministically so candidates can inspect why feedback was generated.
3. **No Biometric Identification**: APTLY does not compute facial recognition embeddings or voiceprints.
