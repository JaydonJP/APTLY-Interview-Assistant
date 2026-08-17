# services/evaluation — Answer Evaluation

## Purpose

Combines content analysis and delivery metrics into a structured answer evaluation.

## Phase 0 Status

**Stub only.**

## Evaluation Architecture

```
Transcript + SpeechMetrics + VisionMetrics
                  ↓
         Evaluation Service (this)
         ├── Content Analyzer (deterministic)
         │   ├── STAR structure detector
         │   ├── Technical depth scorer
         │   ├── Claim evidence checker
         │   └── Relevance scorer
         └── LLM Interpreter (AI)
             ├── Receives structured features
             └── Produces natural-language feedback
```

## Scoring Versioning

**Rule:** Historical evaluations are never overwritten.

Each evaluation record stores:
```json
{
  "evaluation_schema_version": "1.0",
  "prompt_version": "content_evaluation/v1",
  "scoring_algorithm_version": "1.0"
}
```

When scoring changes:
1. New evaluations use the new version
2. Old evaluations retain their original version
3. Progress tracking compares scores within the same version

## ContentEvaluation Schema (v1.0)

```json
{
  "schema_version": "1.0",
  "evaluation_schema_version": "1.0",
  "prompt_version": "content_evaluation/v1",
  "overall_score": 0.75,
  "content_scores": {
    "relevance": 0.9,
    "technical_depth": 0.7,
    "star_structure": 0.6,
    "evidence_quality": 0.8,
    "claim_support": 0.65
  },
  "strengths": ["..."],
  "improvements": [
    {"issue": "...", "evidence": "...", "suggestion": "..."}
  ]
}
```

## DeliveryEvaluation Schema (v1.0)

```json
{
  "schema_version": "1.0",
  "delivery_scores": {
    "pace": 0.8,
    "filler_word_rate": 0.7,
    "pause_management": 0.75,
    "vocal_energy": 0.85,
    "eye_contact": 0.9
  }
}
```
