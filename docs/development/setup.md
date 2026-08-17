# Local Development Setup Guide

## System Requirements

- **Python**: 3.11 or higher (3.13 recommended)
- **Node.js**: 20.0 or higher
- **Docker**: Docker Desktop (for Postgres 16 and Redis 7)

## 1. Clone & Configure

```bash
git clone <repo-url> Parallax
cd Parallax

# Backend configuration
cp .env.example apps/api/.env

# Frontend configuration
cp apps/web/.env.example apps/web/.env.local
```

## 2. Start Infrastructure (Postgres + Redis)

```bash
docker-compose up -d
```

Verify services:
```bash
docker-compose ps
```

## 3. Backend Setup

```bash
cd apps/api
python -m venv .venv

# On Windows:
.\.venv\Scripts\pip install -e ".[dev]"
# On Linux/macOS:
source .venv/bin/activate && pip install -e ".[dev]"

# Run database migrations
alembic upgrade head

# Start FastAPI server
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

FastAPI OpenAPI documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

## 4. Frontend Setup

```bash
cd apps/web
npm install
npm run dev
```

Next.js will be running at: [http://localhost:3000](http://localhost:3000)

## 5. Running in Mock Mode

By default in development, `LLM_PROVIDER=mock`, `TTS_PROVIDER=mock`, `TRANSCRIPTION_PROVIDER=mock`, and `STORAGE_PROVIDER=local`.
No paid API keys (OpenAI, Anthropic, ElevenLabs, Deepgram) are required for development or running tests.
