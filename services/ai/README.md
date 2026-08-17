# services/ai — LLM Orchestration Service

## Purpose

This service is responsible for all interactions with LLM providers.
It acts as the orchestration layer between domain logic and AI providers.

## Phase 0 Status

**Stub only.** No real LLM calls in Phase 0.
All operations use `MockLLMProvider`.

## Architecture Role

```
Domain / Business Logic
         ↓
    AI Service (this)
         ↓
    LLMProvider (interface)
    ├── MockLLMProvider        ← Phase 0
    ├── OpenAIProvider         ← Phase 1+
    └── AnthropicProvider      ← Phase 1+
```

## Key Responsibilities (Phase 1+)

1. **Question Generation** — Generate interview questions from a role profile
2. **Follow-up Generation** — Generate evidence-grounded follow-up questions
3. **Content Evaluation** — Interpret structured content features (not raw video)
4. **Coaching Generation** — Generate actionable coaching from multimodal features
5. **Role Profile Extraction** — Parse job description into structured role profile

## Critical Principle: Measurement Before Interpretation

The AI service NEVER receives raw media as input.
It always receives structured, measured features:

```
RAW AUDIO → WhisperX → Transcript → SpeechMetrics
                                          ↓
                                   AI Service (LLM)
                                          ↓
                                   Coaching / Explanation
```

This ensures coaching is evidence-grounded and reproducible.

## Prompt Versioning

Prompts live in `prompts/` subdirectories:

```
prompts/
├── role_analysis/
│   └── v1.py       ← Current
├── question_generation/
│   └── v1.py
├── followup_generation/
│   └── v1.py
├── content_evaluation/
│   └── v1.py
└── coaching/
    └── v1.py
```

**Rule:** Never edit a deployed prompt version in-place.
Create a new version file (`v2.py`) and update the service to use it.
The version that produced an evaluation is stored in the evaluation record.

## Provider Switching

To switch from OpenAI to Anthropic:
1. Implement `AnthropicProvider` in `apps/api/app/services/providers/`
2. Set `LLM_PROVIDER=anthropic` in `.env`
3. No domain code changes required

## Future Files

```
services/ai/
├── README.md                  ← This file
├── prompts/
│   ├── role_analysis/v1.py
│   ├── question_generation/v1.py
│   ├── followup_generation/v1.py
│   ├── content_evaluation/v1.py
│   └── coaching/v1.py
└── (Phase 1+)
    ├── question_service.py
    ├── evaluation_service.py
    └── coaching_service.py
```
