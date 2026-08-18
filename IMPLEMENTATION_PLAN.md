# APTLY implementation plan

This plan translates `Probelm-Statement.txt` and the reference blueprint into a demo-ready product while preserving the existing provider interfaces and database model.

## 1. Audit the inherited build

- Map the existing FastAPI, Next.js, provider, storage, and question-graph layers.
- Run the baseline tests and identify missing imports, incomplete routes, stale UI, and mismatched API contracts.
- Preserve existing work that already covers role parsing, content rubrics, adaptive follow-ups, media normalization, and mock providers.

Status: complete.

## 2. Close the backend gaps

- Restore the provider-neutral storage package with safe local disk and Supabase implementations.
- Add a private media playback route for Evidence Replay.
- Expose role-profile and question-graph fields in interview detail responses.
- Add a report-card contract containing overall/content/delivery scores, habits, drills, evidence events, and measurement notes.
- Compile report evidence from persisted transcript, speech, and content metrics without inventing unavailable camera or voice signals.
- Make Gemini a declared runtime dependency and keep mock providers as the offline path.
- Protect storage paths from traversal and metadata-sidecar access.

Status: complete.

## 3. Finish the candidate experience

- Deliver a clear path from landing page → dashboard → role setup → live room → completion → report.
- Preserve stable E2E hooks for the start interview, progress, and health-card flows.
- Use a premium dark assessment-lab visual system with accessible contrast, clear hierarchy, responsive layouts, and reduced-motion support.
- Add Repair Mode links back to the weakest question and answer-level evidence replay with synchronized video/transcript seeking.
- Replace hardcoded upload URLs with a typed API client and browser-safe multipart uploads.
- Make camera/microphone consent and capture integrity explicit, with transparent privacy language.

Status: complete.

## 4. Verify the end-to-end demo

- Run backend unit/integration tests with mock providers.
- Run frontend TypeScript, ESLint, Vitest, and production build checks.
- Run Ruff on application and test code.
- Remove generated package-manager and clone artifacts from the working tree.
- Commit the finished build and push it to the requested GitHub repository.

Status: in progress until push succeeds.

## 5. Add the real interview intelligence layer

- Make Supabase Storage the only runtime media provider and fail fast when the project URL or server-side key is missing.
- Use Gemini Flash for role/question generation, answer correctness, topic coverage, ideal-answer outlines, adaptive follow-ups, and grounded doubt explanations.
- Add a persistent learner ID, per-answer topic mastery, a knowledge graph of related concepts, and difficulty recommendations that move from easy to medium to hard as mastery improves.
- Add post-interview answer review alongside WPM, filler, and pause metrics.
- Add server-side Gemini Flash TTS narration with a browser speech fallback for resilience.

Status: complete in code; live Supabase activation requires the project URL, service-role key, and Supabase PostgreSQL connection string in `apps/api/.env`.

## 6. Final validation and delivery

- Run Ruff and the complete backend test suite.
- Run frontend TypeScript validation and inspect the generated API contracts.
- Check that secrets remain ignored and that the diff has no whitespace errors.
- Commit and push the finished implementation to the requested repository.

Status: in progress until push succeeds.

## Deliberate measurement boundary

The report labels camera attention and voice energy as unavailable until a reliable, privacy-safe telemetry pipeline is attached. APTLY does not fabricate eye contact, emotion, identity, or personality scores; it only presents signals that can be measured and replayed.

## PostgreSQL reliability follow-up

- Aligned local Compose credentials, API defaults, integration-test defaults, and environment examples.
- Added `pgcrypto` initialization for migration UUID defaults.
- Added PostgreSQL readiness retries and replaced the misleading SQLite startup fallback with a clear failure message.
- Added regression coverage proving the runtime does not silently fall back to a local database; documented remote Supabase connection troubleshooting and kept Docker only as an optional sandbox.

## 7. Durable implementation plan: multimodal interview evaluation

This is the continuation-safe plan for the remaining work requested by the product owner. The recorded browser artifact is a WebM container that may contain both video and audio. The server will always extract a normalized WAV for transcription, retain the original video for replay, and persist structured visual signals beside the answer. A new session can resume from the checklist below without depending on chat history.

### Product outcomes

1. Transcription accuracy: use the configured production transcription provider for uploaded media, retain live browser speech as a fallback/cross-check, expose an accuracy/quality score and a clear “verify this transcript” state when confidence is weak.
2. Multimodal answer review: combine correctness/content, speech delivery, and observable visual communication signals into useful strengths and improvement actions.
3. Multiple-person detection: detect whether zero, one, or more than one face appears in sampled frames. Never identify a person or perform identity recognition.
4. Facial mapping and eye tracking: track face landmarks/face placement and estimate camera-facing eye-contact opportunity only when the selected vision capability is available. Report unavailable signals honestly.
5. Expression/emotion signal: provide an optional, low-confidence observable-expression cue (for example, neutral/engaged/strained/unavailable), never a diagnosis, personality judgment, or inferred mental state. Require consent and show the limitation in the report.
6. Better start pipeline: gate the first question on consent, camera/microphone readiness, a short device self-check, and a user gesture; play the interviewer prompt before opening the candidate turn; show capture and processing state transitions.

### Architecture and privacy boundary

```text
device preflight
  -> consent + mic/camera check
  -> user starts session
  -> interviewer narration
  -> candidate records video/audio
       |-- browser vision sampler: face count, landmarks, gaze opportunity, expression cue
       |-- browser speech recognition: provisional transcript only
       `-- WebM upload: original audio/video evidence
  -> server FFmpeg: normalized 16 kHz mono WAV
  -> transcription provider: authoritative transcript + word confidence/timing
  -> transcript quality service: provider confidence + live/provider agreement
  -> content intelligence: correctness, coverage, ideal outline, follow-up decision
  -> vision persistence: structured signals + coaching strengths/actions
  -> report compiler: content + speech + visual communication summary
  -> answer replay: original media + transcript + timestamped evidence
```

- Raw video remains private application media and is never sent to the language model.
- Face processing is limited to coarse communication telemetry. No face embeddings, identity labels, biometric templates, or identity matching are stored.
- Visual metrics include capability/provider/model metadata and a sample count so the report can distinguish measured data from unavailable data.
- Emotion is renamed in user-facing copy to “observable expression cues” and is explicitly optional, low-confidence, and non-clinical.
- The consent dialog will state that video is used for replay and communication-signal analysis, while the user can disable video and still complete an audio-only interview.

### Data model and migration work

- Extend `answers` with `video_storage_key`, `video_size_bytes`, `video_checksum_sha256`, `media_content_type`, and `media_has_video` while keeping existing audio columns for compatibility.
- Extend `transcripts` with `quality_score`, `provider_confidence`, `source_agreement_score`, `quality_label`, and `quality_notes`.
- Add a one-to-one `vision_metrics` table keyed by `answer_id` containing:
  - `provider`, `model_version`, `schema_version`, `frame_count`, `valid_frame_count`, `analysis_duration_seconds`;
  - `face_detected_ratio`, `multiple_people_ratio`, `eye_contact_ratio`, `face_centering_score`, `tracking_confidence`;
  - `expression_signal`, `expression_confidence`, `capability_status`;
  - JSON arrays for `face_presence_events`, `strengths`, and `improvements`.
- Add nullable/defaulted columns only so existing answers and old databases remain readable during migration.
- Add an Alembic migration after the current head, update model exports, and add SQLite/PostgreSQL model-creation coverage.

### API contract work

- Keep `POST /interviews/{id}/answers/{answer_id}/upload` and its `audio_file` field for compatibility; accept audio and video content types.
- Add optional multipart field `vision_metrics_json` containing the browser sampler result.
- Return media availability, transcript quality, and `vision_metrics` from answer/review responses.
- Add a private media playback endpoint that resolves either `video_storage_key` or the legacy audio key.
- Return `multimodal_score`, `delivery_score`, `visual_communication_score`, `visual_strengths`, and `visual_improvements` in the compiled review when measurements exist.
- Add schema validation that clamps numeric telemetry to `[0, 1]`, rejects impossible frame counts, and marks malformed/unsupported telemetry unavailable rather than trusting it.

### Transcription accuracy implementation

- For real providers (`whisperx`, `deepgram`, or another configured provider), transcribe the normalized WAV even when a browser transcript is supplied. The live transcript is a provisional candidate, not the authoritative result.
- For the mock provider, preserve the current live-transcript behavior so offline tests and demos remain deterministic.
- Calculate:
  - mean word confidence from provider word timestamps;
  - normalized token agreement between live and provider transcripts when both exist;
  - a quality score with a provider-specific confidence component and an agreement component;
  - labels `high`, `review`, or `low` with an explanation.
- Fall back to live speech only if the production provider fails or returns no speech, and mark the source/fallback explicitly.
- Use the authoritative word timings for WPM, filler, pauses, and evidence replay.

### Browser vision implementation

- Add a `useVisionSignals` hook (or an equivalent isolated service) that samples the live camera at a bounded rate, for example 2 FPS, only while an answer is recording.
- Prefer the browser/installed face-landmark capability when available. The adapter must expose a common result independent of the underlying model.
- Per sample, record only coarse values: face count, normalized face box, landmark-derived gaze opportunity, tracking confidence, and optional expression cue.
- Aggregate samples at stop time and upload the JSON summary with the WebM. Never upload frame images for this feature.
- If the capability is unavailable, send `capability_status: unavailable` and show setup guidance; do not fabricate eye contact or emotion values.
- Multiple people is `face_count > 1` across sampled frames. The report should recommend a private, well-framed setup when this occurs.

### Server multimodal scoring

- Add a `VisionAnalysisService` that validates/normalizes client telemetry and derives communication coaching only from measured fields.
- Use a conservative weighting when all modalities exist: content/correctness 55%, speech delivery 25%, visual communication 20%. If visual data is unavailable, renormalize rather than penalizing the user.
- Strength examples: stable single-person framing, consistent face visibility, strong camera-facing opportunity, clear pace, correct topic coverage.
- Improvement examples: frequent off-camera gaze opportunity, face leaving frame, multiple people, low tracking confidence, weak transcript quality, missing expected topics.
- Keep the overall score and each component separately visible so users understand why a score changed.

### Start-pipeline implementation

- Add explicit `preflight` state: requesting devices, checking camera, checking microphone, ready, blocked.
- Update the consent modal with separate camera/microphone status and a retry action.
- Prevent narration and recording from starting until the user has accepted consent and the required tracks are live.
- On a user gesture, start the interviewer narration, wait for narration completion, then start recording and vision sampling.
- Show the active phase (`Preparing`, `Interviewer speaking`, `Your answer`, `Processing`) and recover cleanly from permission denial, recorder failure, or a missing camera.
- Allow an intentional audio-only mode with an explicit explanation of which visual feedback will be unavailable.

### Review and progress UI

- Add a transcription-quality card with provider/source, confidence, agreement, and a “check the audio” cue for low quality.
- Add a visual communication card with face presence, multi-person warning, framing, camera-facing opportunity, and observable-expression caveat.
- Add separate “What you did well” and “What to improve next” lists grounded in measured signals.
- Link every answer-level recommendation to the relevant timestamp/evidence replay where possible.
- Include multimodal trends in progress without treating unavailable data as a failed attempt.

### Text timeline / answer replay implementation

- Add a Monkeytype-inspired, horizontally scrollable answer timeline to the review page. The visual language may borrow the compact dark chart treatment, but the content is an interview transcript rather than a typing test.
- Render the actual timestamped words from `transcript.words` in chronological order. A ten-minute answer must remain navigable through virtualization/segmented windows rather than collapsing into an unreadable paragraph.
- Add synchronized markers for:
  - long pauses and dead-air intervals;
  - filler words and filler density;
  - transcript-confidence dips or low-quality spans when word confidence is available;
  - answer start/end and speaking-vs-silence regions;
  - topic coverage/correctness evidence where the content analyzer can anchor it to a transcript span.
- Use color and shape together, with a legend and accessible labels: words remain readable, pauses are gaps/blocks, fillers are underlined, and confidence is an unobtrusive tint. Do not rely on color alone.
- Clicking a word, pause, or filler marker seeks the replay video/audio to that timestamp. A moving playhead follows playback and auto-scrolls the active segment.
- Add a compact summary strip inspired by Monkeytype: WPM, consistency/pace variability, transcript quality, pause count and total pause time, filler count/density, answer duration, and correctness/topic coverage. Avoid irrelevant typing metrics such as raw characters or keystroke accuracy.
- Provide a “focus view” that filters to pauses, fillers, low-confidence spans, or content evidence, plus a plain-text transcript fallback for screen readers and unsupported media.
- Keep timeline data derived from persisted transcript words and speech metrics so it remains available after reload and is deterministic in tests.

### Verification gates

- Unit tests for telemetry schema clamping, unavailable capability, multiple-person aggregation, quality scoring, fallback behavior, and multimodal weighting.
- API tests for audio-only uploads, video uploads, malformed vision JSON, legacy answer playback, and review serialization.
- Frontend tests for preflight gating, audio-only mode, upload payload, and graceful no-FaceDetector/no-landmark behavior.
- Run the existing full backend suite, frontend typecheck, Vitest, production build, and targeted lint checks.
- Manual smoke test: consent -> device check -> narrated question -> video answer -> upload -> transcript quality -> answer correctness -> visual coaching -> replay.
- Manual timeline smoke test: play a long answer, click a filler/pause, confirm synchronized seek, follow the playhead, switch focus filters, and verify the plain-text fallback.

### Current checkpoint

- Gemini Flash configuration, answer correctness analysis, adaptive follow-ups, doubt explanations, difficulty recommendations, learner topic graph, progress tracking, Gemini TTS, and post-interview answer review are implemented.
- Existing media capture already records WebM video with audio and the server already extracts normalized audio with FFmpeg.
- Multimodal persistence/API contracts, transcript quality scoring, browser vision sampling, consent/start readiness gating, visual coaching, and multimodal score fusion are implemented.
- The review now includes a replay-linked text timeline with ten-minute-safe time buckets, word seeking, playhead tracking, pause/filler/low-confidence/evidence filters, and relevant interview metrics.
- FaceLandmarker loading is optional and client-side; the native FaceDetector API is the fallback. Unsupported browsers report unavailable signals instead of fabricated eye/emotion scores.
- Verification checkpoint: API `143 passed, 2 skipped`; web TypeScript, Vitest, and Webpack production build pass. The Next build still reports the known invalid native SWC binary warning on this Windows runtime, but completes successfully through the WASM/webpack path.
- Remaining operational work is environment activation/manual smoke testing: configure the existing local Gemini/Supabase secrets, ensure FFmpeg is installed, serve the model assets under a production CSP or self-host them, then validate a real camera answer end-to-end.
