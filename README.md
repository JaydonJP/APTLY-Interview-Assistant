# APTLY — Evidence-Grounded Multimodal AI Interview Coach

> **Phase 0: Foundation Scaffold** — No AI interview logic yet. This is the production-grade architectural foundation.

## Core Philosophy

**"Interview → Measure → Diagnose → Practice → Repeat → Verify"**

**Measurement Before Interpretation:** Deterministic processors (audio/vision) produce structured features. LLMs interpret those features — they never measure.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)

### Backend

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\pip install -e ".[dev]"   # Windows
# OR
.venv/bin/pip install -e ".[dev]"       # macOS/Linux

# Start services
docker-compose up -d

# Run server
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd apps/web
npm install
npm run dev   # http://localhost:3000
```

### Tests

```bash
# Backend — 39 tests, no external services required
cd apps/api
.venv\Scripts\pytest --tb=short -v

# Frontend
cd apps/web
npm run lint
```

---

## Repository Structure

```
Parallax/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/v1/        # Route handlers
│   │   │   ├── core/          # Logging, errors, middleware, security
│   │   │   ├── domain/        # Domain events, WebSocket events
│   │   │   ├── models/        # SQLAlchemy ORM models
│   │   │   ├── repositories/  # Database access layer
│   │   │   ├── schemas/       # Pydantic request/response schemas
│   │   │   ├── services/      # Business logic + AI providers
│   │   │   │   ├── providers/ # LLM, TTS, Transcription interfaces + mocks
│   │   │   │   └── storage/   # Storage interface + local implementation
│   │   │   ├── config.py      # Typed settings
│   │   │   ├── dependencies.py # FastAPI DI
│   │   │   └── main.py        # App factory
│   │   ├── alembic/           # Database migrations
│   │   └── tests/             # 39 passing tests
│   └── web/                   # Next.js 15 frontend
│       └── src/
│           ├── app/           # App Router pages
│           ├── components/    # UI components
│           ├── hooks/         # React Query hooks
│           ├── lib/           # API client, utilities
│           └── types/         # TypeScript types
├── packages/
│   └── shared-types/          # Shared TypeScript contracts
├── services/                  # Service documentation (Phase 1+)
│   ├── ai/                    # LLM prompts (versioned)
│   ├── audio/                 # Audio feature extraction
│   ├── coaching/              # Evidence-grounded coaching
│   ├── evaluation/            # Answer evaluation
│   ├── transcription/         # Speech-to-text
│   └── vision/                # Browser-side MediaPipe
├── workers/                   # Async job workers
├── infrastructure/            # Docker, PostgreSQL init
├── docs/                      # Architecture, API, privacy docs
│   ├── architecture/          # System design docs
│   ├── api/                   # API contracts
│   ├── data-model/            # Entity definitions
│   └── privacy/               # Data lifecycle + privacy
└── .github/workflows/ci.yml   # GitHub Actions CI
```

---

## API

| Endpoint | Status | Description |
|---|---|---|
| `GET /health` | ✅ Phase 0 | Liveness probe |
| `GET /api/v1/health` | ✅ Phase 0 | Detailed health + service status |
| `POST /api/v1/interviews` | 🚧 Phase 1 | Create interview |
| `POST /api/v1/interviews/{id}/start` | 🚧 Phase 1 | Begin session |
| `POST /api/v1/interviews/{id}/answers` | 🚧 Phase 1 | Submit answer |
| `GET /api/v1/interviews/{id}/report` | 🚧 Phase 1 | Get evaluation report |
| `GET /api/v1/progress` | 🚧 Phase 3 | Progress tracking |
| `WS /api/v1/interviews/{id}/realtime` | 🚧 Phase 1 | Realtime interview |

---

## Provider Configuration

All AI/ML providers are injectable. Default to mock in development.

| Provider | Env Var | Default | Real Provider |
|---|---|---|---|
| LLM | `LLM_PROVIDER` | `mock` | `openai`, `anthropic` |
| TTS | `TTS_PROVIDER` | `mock` | `elevenlabs`, `openai` |
| Transcription | `TRANSCRIPTION_PROVIDER` | `mock` | `whisper`, `deepgram` |
| Storage | `STORAGE_PROVIDER` | `local` | `s3`, `r2` |

---

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Async Processing Pipeline](docs/architecture/async-processing.md)
- [AI Pipeline](docs/architecture/ai-pipeline.md)
- [Realtime Architecture](docs/architecture/realtime.md)
- [API Contracts](docs/api/contracts.md)
- [Data Model](docs/data-model/entities.md)
- [Privacy & Data Lifecycle](docs/privacy/data-lifecycle.md)

---

## Phase Roadmap

| Phase | Focus |
|---|---|
| **0** (current) | Foundation scaffold |
| **1** | Core interview loop (WebSocket, TTS, Whisper) |
| **2** | Full analysis (MediaPipe, audio metrics, STAR detection) |
| **3** | Coaching (evidence-grounded feedback, practice drills) |
| **4** | Progress tracking, adaptive difficulty |
| **5** | Replay, export, privacy workflows |
