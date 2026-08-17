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

## Deliberate measurement boundary

The report labels camera attention and voice energy as unavailable until a reliable, privacy-safe telemetry pipeline is attached. APTLY does not fabricate eye contact, emotion, identity, or personality scores; it only presents signals that can be measured and replayed.
