# services/coaching — Evidence-Grounded Coaching

## Purpose

Generates actionable, evidence-backed coaching from multimodal evaluation results.

## Phase 0 Status

**Stub only.**

## Coaching Philosophy

Every coaching item must be traceable to evidence:

```
Coaching Feedback
      ↓ (references)
Evidence (e.g., "said 'um' 7 times")
      ↓ (measured by)
SpeechMetrics.filler_count
      ↓ (at timestamp)
00:02:14 in answer 3
      ↓ (from)
Answer ID: abc-123
```

This traceability chain is a first-class architectural requirement.

## Feature Fusion

The coaching service is the only place that combines all feature types:

```
ContentEvaluation + DeliveryEvaluation + HistoricalProgress
                          ↓
                 Feature Fusion
                          ↓
                   CoachingFeedback
                          ↓
                   PracticeDrills
```

## CoachingFeedback Schema (v1.0)

```json
{
  "schema_version": "1.0",
  "coaching_items": [
    {
      "category": "delivery",
      "priority": "high",
      "issue": "High filler word rate",
      "evidence": "7 filler words in 90 seconds (rate: 4.7/min)",
      "metric": "filler_rate",
      "metric_value": 0.047,
      "drill": "Practice the 'pause instead of filler' technique for 5 minutes",
      "answer_id": "abc-123",
      "timestamp_seconds": 134.2
    }
  ]
}
```

## Practice Drills (Phase 2+)

Coaching generates specific drills:
- Filler word → "Pause drill" (5 min exercise)
- Low WPM → "Pace variation exercise"
- Poor STAR → "STAR rewrite exercise with this answer"
- Weak evidence → "Claim substantiation worksheet"
