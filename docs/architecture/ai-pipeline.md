# APTLY — AI Pipeline Architecture

## Core Principle: Measurement Before Interpretation

```
RAW MEDIA
    ↓  [DETERMINISTIC]
MEASUREMENT
    ↓  [DETERMINISTIC]
FEATURES (structured, measurable)
    ↓  [AI]
INTERPRETATION (language, coaching)
    ↓
COACHING
```

The LLM is an **interpreter**, not a **meter**.

## Provider Abstraction

### LLM Provider

```python
class LLMProvider(ABC):
    async def generate_text(request: LLMGenerateRequest) → LLMGenerateResponse
    async def generate_structured(request: LLMStructuredRequest) → dict
    async def generate_followup(question, transcript, speech_metrics, content_features) → LLMGenerateResponse
```

| Provider | Status | Notes |
|---|---|---|
| MockLLMProvider | ✅ Phase 0 | Canned responses, no API |
| OpenAIProvider | Phase 1 | GPT-4o |
| AnthropicProvider | Phase 1+ | Claude |

### TTS Provider

```python
class TTSProvider(ABC):
    async def synthesize(request: TTSSynthesisRequest) → TTSSynthesisResponse
```

| Provider | Status |
|---|---|
| MockTTSProvider | ✅ Phase 0 |
| ElevenLabsProvider | Phase 1 |
| OpenAITTSProvider | Phase 1+ |

### Transcription Provider

```python
class TranscriptionProvider(ABC):
    async def transcribe(request: TranscriptionRequest) → TranscriptionResponse
```

| Provider | Status | Output |
|---|---|---|
| MockTranscriptionProvider | ✅ Phase 0 | Fixed mock transcript |
| WhisperProvider | Phase 1 | Local Whisper |
| WhisperXProvider | Phase 1 | GPU + word alignment |
| DeepgramProvider | Phase 1+ | Cloud, fast |

## Prompt Versioning

Prompts live in `services/ai/prompts/`:

```
prompts/
├── role_analysis/
│   ├── v1.py     ← CURRENT
│   └── v2.py     ← future (create when prompt changes)
├── question_generation/v1.py
├── followup_generation/v1.py
├── content_evaluation/v1.py
└── coaching/v1.py
```

**Rules:**
1. Never edit a deployed prompt version file in-place
2. Create `v2.py` when changes are needed
3. Update service to use new version (configurable)
4. Record `prompt_version` in every evaluation output
5. Historical evaluations retain their original `prompt_version`

## Scoring Versioning

```json
{
  "scoring_algorithm_version": "1.0",
  "evaluation_schema_version": "1.0"
}
```

**Rule:** When scoring logic changes, increment version.
Historical interview scores are NEVER retroactively changed.
Progress tracking compares scores within the same version.

## Explainability Chain

Every coaching item must trace back to evidence:

```
Coaching: "Reduce filler words"
    ↓ references
Evidence: "7 'um' occurrences detected"
    ↓ measured by
SpeechMetrics.filler_words[*] (timestamps)
    ↓ at timestamps
[4.2s, 12.1s, 18.7s, ...]
    ↓ from
Answer ID: abc-123
    ↓ evaluated by
prompt_version: content_evaluation/v1
```

This chain must be preserved in the data model.

## What the LLM Must NOT Do

- Measure WPM (measure it deterministically)
- Count filler words (detect them with regex/pattern match)
- Detect pauses (gap analysis from transcript)
- Evaluate eye contact (MediaPipe produces a ratio)
- Classify "nervousness" (not a measurable, defensible metric)

## What the LLM MUST Do

- Interpret measured features in natural language
- Generate specific, evidence-grounded coaching
- Generate follow-up questions from answer gaps
- Explain STAR structure weaknesses
- Suggest specific practice drills
