# APTLY — Evidence-backed interview coaching

APTLY is a multimodal interview assistant that helps candidates practice realistic, role-specific interviews and improve through measurable feedback.

The product loop is:

**Prepare → answer → measure → replay → repair → repeat.**

APTLY does not only give a generic “good answer” score. It connects feedback to the candidate’s actual transcript, timestamps, speech patterns, claims, and question context. Each coaching item is intended to answer three questions:

1. What happened?
2. Where is the evidence?
3. What should I practice next?

This README explains the implementation in detail so that a new contributor can understand the product, architecture, backend, frontend, data flow, local setup, and current limitations.

---

## 1. What APTLY does

APTLY currently supports this end-to-end experience:

1. A candidate pastes a job description.
2. APTLY extracts a structured role profile.
3. A role-aware interview is generated from that profile.
4. The candidate answers questions using browser microphone/camera capture.
5. The recording is uploaded and normalized.
6. A transcript with word timestamps is produced.
7. Deterministic delivery metrics are calculated:
   - words per minute
   - filler words and timestamps
   - pauses and durations
   - total words and speaking duration
8. Structured content analysis evaluates:
   - relevance
   - technical depth
   - completeness
   - structure
   - evidence quality
   - STAR coverage for behavioral answers
   - claims and supporting evidence
9. The adaptive engine can add a grounded follow-up question when the answer has an important gap or unsupported claim.
10. The candidate receives an evidence-linked report.
11. Repair Mode sends the candidate back to the weakest question with a focused drill.

The implementation favors transparent measurement. A deterministic metric is calculated by code first; AI is used to interpret structured features and produce natural-language coaching.

---

## 2. Current implementation status

The current build is a working hackathon MVP with production-oriented boundaries.

Implemented:

- Next.js interview application with a polished dark assessment-lab interface.
- Job-description analysis and role-profile persistence.
- Dynamic initial question generation.
- Adaptive follow-up question graph.
- Browser camera and microphone consent flow.
- MediaRecorder-based WebM capture.
- Browser audio-level monitoring.
- Client-side SHA-256 recording checksum.
- FastAPI interview lifecycle APIs.
- Local filesystem storage provider.
- Supabase Storage provider.
- Safe private media playback endpoint.
- FFmpeg-based 16 kHz mono WAV normalization.
- Mock transcription provider with word timestamps.
- WhisperX/faster-whisper provider interface.
- Deterministic speech metrics.
- Structured content intelligence and STAR analysis.
- Mock LLM provider.
- Google Gemini provider using the official Google GenAI SDK.
- Evidence-backed report card.
- Top habits and practice drills.
- Evidence Replay with recording/transcript seeking.
- Repair Mode.
- PostgreSQL configuration, Docker Compose setup, Alembic migrations, and startup readiness retries.
- Backend unit/integration test coverage and frontend lint/type/build checks.

Intentionally not overclaimed:

- Camera attention is currently shown as unavailable. The browser records camera video and verifies track health, but a reliable privacy-safe face/attention telemetry pipeline is not yet attached.
- Voice-energy trend is currently shown as unavailable in the report. The live room has an audio level visualizer, but that live signal is not yet persisted as an answer-level metric.
- The current local processing path runs inline inside the API request after upload. Redis and worker-oriented architecture are configured/documented for the next step, but the current demo does not yet enqueue a background job.
- Authentication, multi-user authorization, account-level deletion workflows, and production rate limiting are not complete.
- Historical progress charts are currently a prepared product surface rather than a complete multi-session analytics system.

---

## 3. Product architecture

At a high level, APTLY has four areas:

- Browser application: interview setup, consent, capture, live question room, and report UI.
- FastAPI application: API contracts, interview orchestration, provider selection, processing pipeline, and persistence.
- PostgreSQL: durable interview, job, question, answer, transcript, speech metric, and content metric records.
- Object storage: raw recordings and future artifacts. Local development uses a safe local provider; production-style deployments can use Supabase Storage.

### High-level diagram

~~~mermaid
flowchart LR
    Browser["Next.js browser app"]
    API["FastAPI REST API"]
    DB[("PostgreSQL")]
    Redis[("Redis")]
    Storage[("Local or Supabase Storage")]
    Normalize["FFmpeg normalization"]
    Transcribe["WhisperX or mock transcription"]
    Speech["Deterministic speech metrics"]
    Content["Content intelligence"]
    Adaptive["Adaptive follow-up engine"]
    Report["Evidence-backed report"]

    Browser -->|"HTTPS JSON and multipart upload"| API
    API --> DB
    API --> Storage
    API -. "Configured for queue/cache evolution" .-> Redis

    API --> Normalize
    Normalize --> Transcribe
    Transcribe --> Speech
    Transcribe --> Content
    Content --> Adaptive
    Speech --> Report
    Content --> Report
    Adaptive --> Browser
    Report --> Browser
~~~

### Current processing path versus target architecture

The architecture documentation in docs/architecture describes the long-term worker-oriented design:

~~~text
Browser recording
    ↓
API upload
    ↓
Storage
    ↓
Background transcription worker
    ↓
Speech and content measurement workers
    ↓
LLM interpretation worker
    ↓
Adaptive follow-up/report worker
~~~

For the current hackathon build, the same stages are executed inline by InterviewService.upload_and_process_answer() after the file is stored. This keeps the demo simple and deterministic:

~~~text
POST answer upload
    ↓
Store raw recording
    ↓
Normalize to WAV
    ↓
Transcribe
    ↓
Compute speech metrics
    ↓
Evaluate content
    ↓
Possibly create follow-up question
    ↓
Return processed answer
~~~

The interfaces are separated so the inline path can later be moved behind Redis jobs without redesigning the domain contracts.

---

## 4. Technology stack

| Area | Technology | Why it is used |
|---|---|---|
| Frontend framework | Next.js 16 App Router | File-based routing, client/server component model, production build |
| UI runtime | React 19 | Interactive interview and report experience |
| Frontend language | TypeScript | Typed API models and safer UI state |
| Styling | Tailwind CSS 4 and custom CSS tokens | Responsive, consistent dark visual system |
| Icons | Lucide React | Lightweight consistent iconography |
| Browser capture | MediaDevices and MediaRecorder APIs | Camera/microphone permissions and recording |
| Browser audio | Web Audio API | Live microphone level visualization |
| Frontend tests | Vitest, Testing Library, JSDOM | Component and utility verification |
| Backend framework | FastAPI | Typed async REST API and OpenAPI generation |
| Backend language | Python 3.11+ | Async services, provider integrations, data processing |
| Validation | Pydantic 2 and pydantic-settings | Request/response contracts and environment configuration |
| ORM | SQLAlchemy 2 async | Database models and async sessions |
| PostgreSQL driver | asyncpg | Async PostgreSQL connectivity |
| Migrations | Alembic | Versioned database schema changes |
| Database | PostgreSQL 16 | Durable relational interview data |
| Cache/queue foundation | Redis 7 | Configured for future jobs, cache, and session state |
| Media conversion | FFmpeg | Normalizes WebM/video audio to 16 kHz mono WAV |
| LLM interface | Provider abstraction | Allows mock mode and real providers without coupling services |
| Real LLM | Google Gemini through google-genai | Structured semantic analysis and grounded follow-ups |
| Transcription interface | Mock or WhisperX/faster-whisper | Word-level transcript and timestamps |
| Object storage | Local provider or Supabase Storage | Opaque recording keys and provider portability |
| Quality checks | Ruff, MyPy configuration, ESLint, TypeScript | Static correctness and maintainability |
| Local orchestration | Docker Compose | PostgreSQL and Redis development services |

Some packages and provider implementations exist as extension points but are not active in the default demo configuration. The default path uses mock AI providers so the product can be demonstrated without external API keys.

---

## 5. How the user flow works

### 5.1 Landing page and dashboard

The frontend starts at /.

The landing page explains the evidence-first product and routes the candidate to /dashboard. The dashboard provides:

- a new interview action
- progress entry point
- system health card
- measurement categories
- privacy and capture expectations

The main interview path is deliberately short:

~~~text
/ → /dashboard → /interview/new → /interview/{id} → /interview/{id}/review
~~~

### 5.2 Job-description analysis

The candidate enters a job description on /interview/new.

The frontend calls:

~~~http
POST /api/v1/jobs/analyze
Content-Type: application/json
~~~

Example request:

~~~json
{
  "job_description": "We are hiring a Senior Backend Engineer...",
  "title": "Senior Backend Engineer",
  "company": "Example Labs"
}
~~~

The backend:

1. Sends the description to the configured LLMProvider.
2. In mock mode, uses deterministic extraction and fallback heuristics.
3. Normalizes the output into role title, seniority, domain, technical skills, tools, responsibilities, behavioral competencies, interview topics, and preferred experience.
4. Creates a Job and RoleProfile record.
5. Returns the structured role profile to the frontend.

The fallback logic means the demo can still produce a useful role profile when no real LLM credentials are configured.

### 5.3 Interview creation

The frontend uses the role profile to create an interview:

~~~http
POST /api/v1/interviews
Content-Type: application/json
~~~

Example request:

~~~json
{
  "job_id": "job-uuid",
  "role_profile_id": "role-profile-uuid",
  "title": "Senior Backend Engineer Practice",
  "interview_type": "mixed",
  "difficulty_level": "medium",
  "target_duration_minutes": 10,
  "question_count": 5
}
~~~

The service:

1. Creates the Interview.
2. Generates initial questions using the role profile and interview settings.
3. Stores each Question with category, competency, difficulty, expected topics, and prompt version.
4. Returns the interview detail payload.

Questions can later be linked as a graph using parent question ID, root question ID, source, follow-up depth, and target competency.

### 5.4 Starting the live room

The frontend calls:

~~~http
POST /api/v1/interviews/{id}/start
~~~

The backend moves the interview into an active question state. The live page loads the current question, role context, current interview index, submitted answers, and question graph metadata.

### 5.5 Recording consent and capture

Before recording, the browser displays a consent modal explaining:

- microphone and camera access
- transcript and speech metrics
- AI content analysis
- recording replay
- storage behavior
- text-only fallback

The useMediaCapture hook then:

1. Calls navigator.mediaDevices.getUserMedia().
2. Requests the configured camera and microphone tracks.
3. Detects the first supported MediaRecorder MIME type.
4. Starts a MediaRecorder.
5. Captures chunks in memory.
6. Monitors microphone level with the Web Audio API.
7. Tracks recording duration and track state.
8. Computes a SHA-256 checksum when recording stops.
9. Produces a browser object URL for local preview.

The capture diagnostics panel exposes microphone/camera track state, recording state, MIME type, codec, captured size, duration, checksum, microphone level, normalized format, transcription status, and semantic evaluation status.

### 5.6 Answer upload

The frontend first creates an answer record:

~~~http
POST /api/v1/interviews/{id}/answers
Content-Type: application/json
~~~

~~~json
{
  "question_id": "question-uuid"
}
~~~

It then uploads the recording:

~~~http
POST /api/v1/interviews/{id}/answers/{answer_id}/upload
Content-Type: multipart/form-data
~~~

Form fields:

- audio_file
- duration_seconds

The API client deliberately does not manually set the multipart Content-Type header. The browser must add the correct boundary.

### 5.7 Server-side media processing

After receiving the recording, the backend:

1. Validates that the payload is non-empty.
2. Computes the server-side SHA-256 checksum.
3. Stores the original recording through StorageProvider.
4. Attempts FFmpeg normalization to 16 kHz mono PCM WAV.
5. Stores the normalized artifact.
6. Updates answer storage keys, size, checksum, duration, and processing status.
7. Transcribes the normalized bytes.
8. Persists the word-level transcript.
9. Computes deterministic speech metrics.
10. Persists SpeechMetrics.
11. Runs semantic content analysis.
12. Persists ContentMetrics.
13. Invokes the adaptive follow-up engine.
14. Persists a follow-up Question when the decision rules trigger.
15. Marks the Answer as processed.

The original recording and normalized WAV are separate storage objects. The database keeps opaque storage keys rather than local filesystem paths.

### 5.8 Advancing and finishing

The frontend calls:

~~~http
POST /api/v1/interviews/{id}/next-question
~~~

The service advances the current question index. When the final question has been reached, the interview can be completed with:

~~~http
POST /api/v1/interviews/{id}/finish
~~~

The completed session is available for review.

### 5.9 Report generation

The frontend loads:

~~~http
GET /api/v1/interviews/{id}/review
~~~

The report is assembled from persisted answer data. It includes the interview summary, role profile, duration, answer count, WPM, fillers, pauses, per-question transcript and metrics, report card, evidence events, habits, drills, next session focus, and recommended Repair Mode question.

The report card is computed at review time; it is not currently stored as a separate report table.

---

## 6. Backend architecture

The backend lives in apps/api.

~~~text
apps/api/
├── app/
│   ├── api/v1/endpoints/       HTTP route handlers
│   ├── core/                   errors, logging, middleware, security
│   ├── domain/                 domain/realtime event definitions
│   ├── models/                 SQLAlchemy ORM models
│   ├── repositories/           repository abstractions
│   ├── schemas/                Pydantic API contracts
│   ├── services/               business logic and analysis pipeline
│   │   ├── adaptive_interview/
│   │   ├── content_intelligence/
│   │   ├── providers/
│   │   └── storage/
│   ├── config.py               typed environment settings
│   ├── dependencies.py         FastAPI dependency injection
│   └── main.py                 app factory and startup lifecycle
├── alembic/                    migrations
├── tests/                      backend tests
└── pyproject.toml              dependencies and tooling
~~~

### 6.1 Route layer

Route handlers are intentionally thin. They parse HTTP input, resolve dependencies, call the application service, map results into response schemas, and return HTTP errors.

Main route modules:

| File | Responsibility |
|---|---|
| app/api/v1/endpoints/health.py | Liveness and dependency health |
| app/api/v1/endpoints/jobs.py | Job description and role analysis |
| app/api/v1/endpoints/interviews.py | Interview lifecycle, answers, uploads, review |
| app/api/v1/endpoints/storage.py | Private recording playback |
| app/api/v1/endpoints/realtime.py | WebSocket/realtime foundation |

All business routes are mounted under /api/v1.

### 6.2 Dependency injection

app/dependencies.py selects runtime services based on settings.

Injected services include:

- SQLAlchemy async database session
- LLM provider
- transcription provider
- TTS provider
- storage provider
- content analysis service

This means the interview service does not need to know whether it is using mock Gemini, real Gemini, mock transcription, WhisperX, local storage, or Supabase Storage.

### 6.3 Interview service

app/services/interview_service.py is the main orchestration service.

It handles:

- interview creation
- question generation
- state transitions
- answer creation
- media upload
- normalization
- transcription
- speech metric computation
- content evaluation
- adaptive follow-up decisions
- report compilation

The service uses explicit states such as:

~~~text
created → ready → running → question_active
question_active → answering → answer_submitted
answer_submitted → processing → next_question
next_question → completed
~~~

Invalid transitions are rejected by the service state machine.

### 6.4 Provider contracts

Provider interfaces are defined in app/services/providers/base.py.

The main contracts are:

~~~text
LLMProvider
├── generate_text()
├── generate_structured()
└── generate_followup()

TranscriptionProvider
└── transcribe()

TTSProvider
└── synthesize()

StorageProvider
├── upload()
├── download()
├── delete()
├── exists()
├── get_metadata()
└── generate_presigned_url()
~~~

Current implementations include MockLLMProvider, GeminiLLMProvider, MockTranscriptionProvider, WhisperXTranscriptionProvider, MockTTSProvider, LocalStorageProvider, and SupabaseStorageProvider.

The mock providers are important for a hackathon demo because they make the application runnable without external services or API keys.

### 6.5 Error handling

app/core/errors.py defines application exceptions such as validation errors, provider errors, storage errors, media validation errors, and invalid state transitions.

The API returns standardized error envelopes instead of leaking stack traces. Request IDs are added by middleware to make debugging easier.

### 6.6 Database startup

The API reads DATABASE_URL from apps/api/.env.

For a PostgreSQL URL, startup:

1. Creates the async SQLAlchemy engine.
2. Retries connection/schema initialization while PostgreSQL is becoming ready.
3. Creates missing tables from SQLAlchemy metadata for local development.
4. Fails with an actionable error if PostgreSQL is still unavailable.

Alembic migrations are also included for controlled schema evolution:

~~~bash
cd apps/api
alembic upgrade head
~~~

The current local startup path uses metadata creation for convenience. Production deployments should use reviewed Alembic migrations as the schema authority.

---

## 7. Data model

The central relationship is:

~~~mermaid
erDiagram
    JOB ||--|| ROLE_PROFILE : produces
    ROLE_PROFILE ||--o{ INTERVIEW : configures
    INTERVIEW ||--o{ QUESTION : contains
    INTERVIEW ||--o{ ANSWER : receives
    QUESTION ||--o{ ANSWER : answered_by
    ANSWER ||--o| TRANSCRIPT : produces
    ANSWER ||--o| SPEECH_METRICS : produces
    ANSWER ||--o| CONTENT_METRICS : produces
    QUESTION ||--o{ QUESTION : follow_up_graph
~~~

### Job

Stores the original job-description text and optional title/company metadata.

### RoleProfile

Stores role title, seniority, domain, technical skills, tools, responsibilities, behavioral competencies, interview topics, preferred experience, and prompt/schema version.

### Interview

Stores session configuration and state:

- title
- interview type
- difficulty
- target duration
- current question index
- status
- start/completion timestamps
- schema versions

### Question

Stores a generated question:

- sequence number
- category
- question type
- competency
- difficulty
- question text
- expected topics
- prompt version
- parent/root question IDs
- source: initial or follow-up
- follow-up depth
- target competency

### Answer

Stores:

- interview/question relationship
- sequence number
- status
- duration
- start/end timestamps
- raw recording storage key
- normalized recording storage key
- file size
- checksum
- processing status
- transcription status

### Transcript

Stores full text, word count, word-level timestamps, language, model provider/version, and schema version.

Each transcript word can include:

~~~json
{
  "word": "PostgreSQL",
  "start_seconds": 4.2,
  "end_seconds": 4.8,
  "confidence": 0.96
}
~~~

### SpeechMetrics

Stores WPM, speaking duration, total words, filler count/density, filler occurrences, pause count, total pause duration, and pause occurrences.

### ContentMetrics

Stores relevance, technical depth, completeness, structure, evidence, overall content score, strengths, weaknesses, STAR analysis, claims, evidence anchors, feedback, practice drills, reasoning summary, provider/model/prompt metadata.

### Report card

The report card is computed from persisted metrics during compile_review().

The current delivery score combines:

- pace score
- filler score
- pause score

The current overall score combines:

- 65% average content score
- 35% delivery score

The report ranks habits by severity and limits the visible list to the top three.

---

## 8. Analysis pipeline in detail

APTLY separates measurement from interpretation.

### 8.1 Deterministic layer

These signals are calculated by code:

- word count
- WPM
- filler detection
- filler timestamps
- pause gaps
- pause durations
- audio duration
- checksums
- recording MIME/track state

This layer should be explainable from the source media or transcript.

### 8.2 Semantic layer

The content analyzer interprets the transcript against question text, question type, expected topics, role title, seniority, domain, and technical skills.

It produces structured fields rather than an unstructured paragraph.

### 8.3 Claims and evidence

A claim may be supported, partially supported, unsupported, or not assessable.

Unsupported or partially supported claims can trigger:

- a report evidence event
- a habit
- a measurable-claim drill
- an adaptive follow-up question

### 8.4 STAR analysis

Behavioral answers are checked for Situation, Task, Action, and Result.

Missing components become coaching opportunities. The candidate is not simply told “use STAR”; the report explains what was missing and links it to a repair drill.

### 8.5 Adaptive follow-ups

The follow-up decision engine checks whether:

- the answer is sufficiently grounded
- the answer contains unsupported claims
- the question has reached the maximum follow-up depth
- a follow-up would probe a meaningful competency gap

When a follow-up is created, it is stored as a question connected to its parent.

### 8.6 Evidence events

Evidence events are replayable timeline objects.

Example:

~~~json
{
  "id": "filler-1-0",
  "type": "filler",
  "title": "Filler word: basically",
  "description": "A filler word appeared in the answer.",
  "start_seconds": 8.4,
  "end_seconds": 8.6,
  "severity": 3,
  "reliability": 0.99,
  "question_number": 1,
  "quote": "basically"
}
~~~

The review page uses events to select the relevant question, seek the recording, highlight the matching transcript area, and show the observation/action.

---

## 9. Frontend architecture

The frontend lives in apps/web.

### Routes

| Route | Purpose |
|---|---|
| / | Landing page and product explanation |
| /dashboard | Session entry point, health, measurement overview |
| /interview/new | Job description and interview configuration |
| /interview/[id] | Live interview room and recording |
| /interview/[id]/review | Evidence-backed report and replay |
| /progress | Progress/product surface for future multi-session trends |

### Important frontend modules

| Module | Purpose |
|---|---|
| src/hooks/useMediaCapture.ts | Browser permissions, recording, checksum, audio level |
| src/hooks/useInterviewWebSocket.ts | Realtime foundation |
| src/lib/api-client.ts | Typed HTTP requests, uploads, media URLs |
| src/types/interview.ts | Frontend interview/report contracts |
| src/components/camera/VideoPreview.tsx | Camera preview and capture HUD |
| src/components/camera/RecordingQualityPanel.tsx | Capture integrity diagnostics |
| src/components/interview/RecordingConsentModal.tsx | Privacy and permission consent |
| src/app/interview/[id]/review/page.tsx | Evidence Replay and report UI |
| src/app/globals.css | Dark design tokens, glass panels, motion |

The frontend is designed around explicit loading, permission, recording, processing, report, error, and no-evidence states.

---

## 10. Storage and media handling

APTLY stores media using an abstraction rather than writing application code directly against a filesystem or vendor SDK.

### Local storage

LocalStorageProvider:

- writes under a configured root such as ./storage
- creates opaque UUID-based keys
- stores metadata JSON sidecars
- validates MIME type and size
- blocks traversal attempts
- blocks access to metadata sidecars through the media route
- returns API playback paths instead of file URLs

Example key:

~~~text
raw_audio/4bf3.../a1b2....webm
~~~

Raw media directories are ignored by Git.

### Supabase Storage

SupabaseStorageProvider uses the Supabase Storage HTTP API and supports upload, download, delete, existence checks, and signed URL generation.

The service-role key is server-side only and must never be exposed to the frontend.

### Media normalization

The upload pipeline attempts to convert the browser recording into:

~~~text
PCM signed 16-bit WAV
16,000 Hz
mono
~~~

This gives the transcription layer consistent input regardless of browser codec.

---

## 11. PostgreSQL and Redis

### PostgreSQL

Docker Compose starts PostgreSQL 16 with:

- database: aptly_dev
- user: aptly
- password: aptly_dev_password
- port: 5432
- named volume: aptly_postgres_data

The initialization script enables uuid-ossp and pgcrypto. pgcrypto is needed by migration defaults that use gen_random_uuid().

### Redis

Docker Compose starts Redis 7 on port 6379.

Redis is configured as the future foundation for processing jobs, cache entries, session/realtime state, and idempotency keys.

The current hackathon upload path is inline, so Redis is not required for the mock-provider test suite.

### Existing Docker volume warning

PostgreSQL environment variables are only applied when a database volume is initialized. If an old aptly_postgres_data volume contains different credentials, changing .env will not rewrite the existing database user/password.

For disposable local data:

~~~bash
docker compose down -v
docker compose up -d postgres redis
~~~

This deletes local PostgreSQL and Redis data. For existing data, update the role/password manually instead.

---

## 12. API reference

FastAPI exposes interactive documentation at:

- http://localhost:8000/docs
- http://localhost:8000/redoc

| Endpoint | Purpose |
|---|---|
| GET /health | Liveness without dependency checks |
| GET /api/v1/health | Database and provider status |
| POST /api/v1/jobs/analyze | Create Job and RoleProfile |
| GET /api/v1/jobs/{job_id} | Read a job and role profile |
| POST /api/v1/interviews | Create interview and initial questions |
| GET /api/v1/interviews/{id} | Read interview detail |
| POST /api/v1/interviews/{id}/start | Start the live session |
| POST /api/v1/interviews/{id}/answers | Create answer record |
| POST /api/v1/interviews/{id}/answers/{answer_id}/upload | Store/process recording |
| POST /api/v1/interviews/{id}/next-question | Advance question index |
| POST /api/v1/interviews/{id}/finish | Complete interview |
| GET /api/v1/interviews/{id}/review | Load report card and evidence |
| GET /api/v1/storage/media/{storage_key} | Stream stored media |

The implemented report endpoint is /review. Some older planning documents refer to /report.

---

## 13. Local setup

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- Docker Desktop if using local PostgreSQL and Redis
- FFmpeg if using real media normalization/transcription locally
- A browser that supports getUserMedia() and MediaRecorder for the full interview flow

### 13.1 Start infrastructure

From the repository root:

~~~powershell
docker compose up -d postgres redis
docker compose ps
~~~

Expected services:

~~~text
aptly_postgres   healthy
aptly_redis      healthy
~~~

### 13.2 Configure the backend

~~~powershell
cd C:\OblivionX\Projects\Hackathon\APTLY\apps\api
Copy-Item .env.example .env
~~~

The local backend defaults to:

~~~text
DATABASE_URL=postgresql+asyncpg://aptly:aptly_dev_password@localhost:5432/aptly_dev
STORAGE_PROVIDER=local
LLM_PROVIDER=mock
TTS_PROVIDER=mock
TRANSCRIPTION_PROVIDER=mock
~~~

### 13.3 Install and run the backend

~~~powershell
cd C:\OblivionX\Projects\Hackathon\APTLY\apps\api
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
~~~

The API should be available at:

~~~text
http://localhost:8000
http://localhost:8000/docs
http://localhost:8000/api/v1/health
~~~

### 13.4 Install and run the frontend

~~~powershell
cd C:\OblivionX\Projects\Hackathon\APTLY\apps\web
npm install
npm run dev
~~~

Open http://localhost:3000.

### 13.5 Demo path

1. Open the landing page.
2. Select Start a new interview.
3. Paste a job description of at least a few sentences.
4. Confirm the extracted role profile.
5. Choose interview type, difficulty, duration, and question count.
6. Start the interview.
7. Grant camera/microphone access.
8. Record and submit an answer.
9. Continue or finish the interview.
10. Open the report.
11. Click an evidence event to replay the recording at its timestamp.
12. Use Repair Mode to retry the weakest question.

---

## 14. Provider configuration

### Mock mode

Mock mode is the default:

~~~text
LLM_PROVIDER=mock
TTS_PROVIDER=mock
TRANSCRIPTION_PROVIDER=mock
~~~

Advantages:

- no external API key
- fast repeatable results
- deterministic tests
- no model downloads
- works offline apart from the configured database

### Gemini

To use the real Gemini provider:

~~~text
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key
LLM_MODEL=gemini-2.5-flash
~~~

The provider uses the official google-genai package, structured JSON output, bounded retries, and separate text/structured generation methods.

The service still treats the LLM as an interpreter. Deterministic speech metrics are not delegated to Gemini.

### WhisperX/faster-whisper

To use real transcription:

~~~text
TRANSCRIPTION_PROVIDER=whisperx
WHISPERX_MODEL=base.en
WHISPERX_DEVICE=auto
WHISPERX_COMPUTE_TYPE=auto
~~~

Real transcription also requires optional model/runtime dependencies and an available FFmpeg executable. The first model load can be slow and may require GPU memory.

### Supabase Storage

To use Supabase Storage:

~~~text
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-side-secret
STORAGE_BUCKET=aptly-media
~~~

Never expose SUPABASE_SERVICE_ROLE_KEY in apps/web or any NEXT_PUBLIC_ variable.

---

## 15. Testing and verification

### Backend tests

~~~powershell
cd C:\OblivionX\Projects\Hackathon\APTLY\apps\api
.venv\Scripts\python -m pytest --tb=short -v
~~~

The suite covers configuration, error envelopes, health endpoints, role/job analysis, the interview state machine, the full mock interview flow, content intelligence, adaptive follow-up decisions, Gemini behavior with mocks, speech metrics, media normalization, local storage, Supabase storage with mocked HTTP, and WhisperX behavior with mocked model output.

The PostgreSQL and Redis integration tests are marked separately and skip when those services are not reachable.

### Backend lint

~~~powershell
.venv\Scripts\ruff check app tests
~~~

### Frontend checks

~~~powershell
cd C:\OblivionX\Projects\Hackathon\APTLY\apps\web
npm run lint
npm test
npm run build
~~~

The production build verifies route compilation, TypeScript, static page generation, dynamic interview/review routes, and bundling.

---

## 16. Troubleshooting

### PostgreSQL connection refused

Check:

~~~powershell
docker compose ps
Test-NetConnection localhost -Port 5432
~~~

If PostgreSQL is not running:

~~~powershell
docker compose up -d postgres
docker compose logs postgres
~~~

If Docker is not installed or not running, install/start Docker Desktop or set DATABASE_URL to a reachable PostgreSQL instance.

### PostgreSQL password/database mismatch

This usually means an old Docker volume was initialized with different credentials.

For disposable data:

~~~powershell
docker compose down -v
docker compose up -d postgres redis
~~~

For important data, do not use down -v. Inspect the existing role/database and update credentials safely.

### pgcrypto or gen_random_uuid migration error

Run:

~~~powershell
docker exec aptly_postgres psql -U aptly -d aptly_dev -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
~~~

### API starts but requests fail

Check the API startup logs and call:

~~~text
http://localhost:8000/api/v1/health
~~~

The API fails fast during startup when PostgreSQL is unreachable instead of silently switching to an unrelated SQLite file.

### Camera/microphone permission errors

- Use localhost or HTTPS; browsers restrict media permissions on insecure origins.
- Check browser site permissions.
- Close other applications using the camera.
- Use a supported browser.
- Use Continue Without Recording for text-only fallback behavior.

### FFmpeg errors

Check:

~~~powershell
ffmpeg -version
~~~

If it is not found, install FFmpeg and make sure it is on the system PATH.

### Real model is slow or unavailable

Return to mock mode:

~~~text
LLM_PROVIDER=mock
TRANSCRIPTION_PROVIDER=mock
TTS_PROVIDER=mock
~~~

Restart the API after changing .env.

---

## 17. Privacy and measurement boundaries

APTLY treats recordings and transcripts as sensitive interview data.

Current safeguards:

- camera/microphone consent is explicit
- recordings are stored under opaque keys
- local media directories are ignored by Git
- the media endpoint does not expose arbitrary filesystem paths
- metadata sidecars cannot be requested through the media playback route
- provider credentials remain server-side
- speech metrics are deterministic and inspectable
- report events contain evidence timestamps
- identity, emotion, personality, and biometric inference are not performed
- camera attention is not fabricated when telemetry is unavailable

The current report deliberately says when a metric is unavailable. This is preferable to showing a precise-looking number without a reliable measurement pipeline.

For the intended data lifecycle and future retention/deletion design, see:

- docs/privacy/data-lifecycle.md
- docs/data-model/entities.md
- docs/architecture/overview.md

---

## 18. Repository map

~~~text
APTLY/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── api/v1/endpoints/     REST and realtime routes
│   │   │   ├── core/                 errors, logging, middleware, security
│   │   │   ├── domain/               domain event definitions
│   │   │   ├── models/               SQLAlchemy models
│   │   │   ├── repositories/         persistence abstractions
│   │   │   ├── schemas/              Pydantic contracts
│   │   │   ├── services/             interview and AI orchestration
│   │   │   ├── config.py             environment settings
│   │   │   ├── dependencies.py       dependency injection
│   │   │   └── main.py               FastAPI app and startup
│   │   ├── alembic/                  database migrations
│   │   ├── tests/                    backend test suite
│   │   └── pyproject.toml            Python dependencies/tooling
│   └── web/
│       ├── src/app/                  App Router pages
│       ├── src/components/           UI and capture components
│       ├── src/hooks/                browser and realtime hooks
│       ├── src/lib/                  API/query utilities
│       └── src/types/                TypeScript domain contracts
├── docs/
│   ├── architecture/                 system and pipeline design
│   ├── api/                          API contract notes
│   ├── data-model/                   entity definitions
│   └── privacy/                      data lifecycle principles
├── infrastructure/
│   ├── docker/postgres/              PostgreSQL init script
│   └── database/                     migration notes
├── packages/shared-types/             shared TypeScript types
├── services/                          provider and processing notes
├── docker-compose.yml                 local PostgreSQL and Redis
├── IMPLEMENTATION_PLAN.md             build plan and completed scope
├── Probelm-Statement.txt              original hackathon problem statement
└── Aptly_Hackathon_Winning_Build_Blueprint.md
                                       reference product blueprint
~~~

---

## 19. Extension points

The cleanest next improvements are:

1. Move inline answer processing into Redis-backed background jobs.
2. Add persistent browser-derived vision telemetry with explicit consent.
3. Persist voice-energy metrics from the audio analysis layer.
4. Add authentication and owner-based access checks to interviews/media.
5. Add report persistence and multi-session progress trends.
6. Add a real TTS interviewer voice.
7. Add export/delete workflows for recordings and reports.
8. Add end-to-end Playwright coverage for the complete browser flow.
9. Add a production deployment profile with managed PostgreSQL, Redis, and object storage.
10. Replace metadata table creation during startup with migration-only production startup.

The current provider contracts and service boundaries are designed to support these extensions without rewriting the frontend interview flow.

