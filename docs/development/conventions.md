# Engineering Conventions & Architectural Principles

## 1. Measurement Before Interpretation

- **Deterministic First**: Measurements (WPM, filler word count, silence durations, eye contact ratio, head pitch/yaw/roll) MUST be computed deterministically using standard libraries, algorithms, and models (e.g. MediaPipe, Whisper word timestamps, audio RMS analysis).
- **LLMs as Interpreters**: LLMs receive structured features and metrics, NOT raw video/audio. LLMs interpret evidence and formulate coaching guidance.

## 2. Schema and Prompt Versioning

- **Version All Artifacts**: Every structured output schema must have an explicit `schema_version` (e.g., `"1.0"`).
- **Prompt Immutability**: Never overwrite deployed prompts in-place. Create new versions (`v2.py`) and log `prompt_version` on every evaluation output.
- **Historical Stability**: Historical evaluations retain their original `scoring_algorithm_version`.

## 3. Provider Abstractions

- All AI/ML providers (LLM, TTS, Transcription, Storage) implement abstract base classes in `app/services/providers/base.py` and `app/services/storage/base.py`.
- Dependency injection in FastAPI handles provider selection via environment settings.
- The platform MUST run completely in mock mode (`MOCK_PROVIDERS=true` / `LLM_PROVIDER=mock`).

## 4. Privacy by Design

- **Browser-Side Vision**: Face mesh landmark detection and head pose estimation run client-side in WebAssembly/MediaPipe. Raw video does not need to be streamed to backend servers.
- **UUID-based Storage Keys**: Client filenames are NEVER used directly. Storage keys follow `{data_class}/{interview_id}/{uuid}.{ext}`.
- **Scoped Retention**: Media retention policies are recorded in object metadata and cleaned up on expiration or user request.
