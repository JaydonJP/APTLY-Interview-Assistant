# APTLY — Evidence-backed interview coaching

APTLY is a multimodal interview assistant for practicing role-specific answers, measuring delivery, and turning every weakness into a focused next rep. The product loop is:

**Prepare → answer → measure → replay → repair → repeat.**

The current build includes role-aware interview setup, adaptive follow-up questions, browser camera/microphone capture, deterministic speech metrics, semantic answer analysis, local/Supabase media storage, an evidence-linked report card, and Repair Mode.

## Run locally

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop (optional; only needed for PostgreSQL/Redis-backed development)

### Backend

```bash
cd apps/api
python -m venv .venv
.venv\\Scripts\\python -m pip install -e ".[dev]"   # Windows
# .venv/bin/python -m pip install -e ".[dev]"        # macOS/Linux

# The default configuration uses SQLite-compatible test settings, local storage,
# and mock AI providers, so no API keys are required for a demo.
.venv\\Scripts\\uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose **Start a new interview**, paste a job description, and follow the capture flow. The browser will request camera/microphone permission before the live room.

For a real Gemini/WhisperX run, configure the provider variables in `apps/api/.env` and install the corresponding runtime model dependencies. The mock providers remain the reliable offline/demo path.

## Product flow

1. **Role intelligence** extracts role, seniority, skills, responsibilities, and competencies from a job description.
2. **Adaptive interview** creates a question graph and can add a grounded follow-up when an answer has an unsupported claim or an important gap.
3. **Capture integrity** checks browser tracks, records WebM, computes a client checksum, and uploads through a typed API client.
4. **Evidence pipeline** normalizes media to 16 kHz mono WAV, transcribes words with timestamps, calculates WPM/fillers/pauses, and evaluates content.
5. **Evidence Replay** links report events to the answer, transcript, and recording timeline.
6. **Repair Mode** sends the candidate back to the weakest question with a concrete drill and transparent measurement notes.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness check |
| `GET /api/v1/health` | Provider and dependency status |
| `POST /api/v1/jobs/analyze` | Parse a job description into a role profile |
| `POST /api/v1/interviews` | Create a role-aware interview |
| `POST /api/v1/interviews/{id}/start` | Start the session |
| `POST /api/v1/interviews/{id}/answers` | Create an answer record |
| `POST /api/v1/interviews/{id}/answers/{answer_id}/upload` | Upload and process a recording |
| `POST /api/v1/interviews/{id}/next-question` | Advance the question graph |
| `POST /api/v1/interviews/{id}/finish` | Complete the session |
| `GET /api/v1/interviews/{id}/review` | Load the evidence-backed report |
| `GET /api/v1/storage/media/{storage_key}` | Private API playback for local media |

## Privacy and measurement boundaries

- Raw recordings stay in the configured storage provider; local development writes to the ignored `storage/` directory.
- Storage keys are opaque UUID-based paths rather than client filenames.
- The report separates deterministic speech measurements from semantic interpretation.
- Camera attention is explicitly labeled as unavailable until a reliable browser telemetry pipeline is attached; APTLY does not infer identity, emotion, or personality.
- Report feedback always includes an observation, its impact, and a practice action.

## Verification

```bash
# Backend
cd apps/api
.venv\\Scripts\\python -m pytest --tb=short -v
.venv\\Scripts\\ruff check app tests

# Frontend
cd apps/web
npm run lint
npm test
npm run build
```

The PostgreSQL and Redis integration tests are skipped automatically when those services are not running.

## Repository map

```text
apps/api/          FastAPI service, providers, storage, database models, tests
apps/web/          Next.js App Router application and capture experience
packages/          Shared contracts
docs/              Architecture, API, data model, and privacy notes
infrastructure/    Docker and database support
services/          Provider and processing design notes
```
