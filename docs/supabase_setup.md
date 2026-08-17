# APTLY — Supabase Integration & Setup Guide

This guide walks you through connecting your Supabase project (PostgreSQL database & Object Storage) to APTLY.

APTLY is configured for Supabase-backed runtime storage. Audio uploads, recordings, and generated media are kept in the private `aptly-media` bucket; the local filesystem provider is retained only for automated tests. The API also stores interviews, answer analysis, learner progress, and the knowledge graph in Supabase PostgreSQL.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Fill in:
   - **Name**: `aptly-interview` (or your preferred name)
   - **Database Password**: Set a strong password (save this securely)
   - **Region**: Choose the region closest to you
4. Click **Create new project** and wait ~1–2 minutes for provisioning to finish.

---

## 2. Obtain Credentials from Supabase Dashboard

### A. PostgreSQL Connection String
1. In your Supabase Dashboard, go to **Project Settings** (gear icon in sidebar) $\rightarrow$ **Database**.
2. Under **Connection string**, select the **URI** tab.
3. Select **Transaction Pooler** (recommended, port `6543`) or **Session Pooler** (port `5432`):
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your real database password.

### B. Supabase URL & Service Role Key
1. Go to **Project Settings** $\rightarrow$ **API**.
2. Copy the **Project URL**: e.g., `https://abcdefghijklm.supabase.co`.
3. Under **Project API keys**, copy the **`service_role`** secret key (for backend server-side operations).
4. Copy the **`anon` `public`** key (for optional frontend public use).

---

## 3. Create the Private Storage Bucket (`aptly-media`)

1. In your Supabase Dashboard sidebar, click **Storage**.
2. Click **New bucket**.
3. Enter bucket name: `aptly-media`.
4. Leave **Public bucket** **UNCHECKED** (private bucket for privacy and candidate data security).
5. Click **Create bucket**.

---

## 4. Configure Environment Variables

Edit your `.env` (or `apps/api/.env`):

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]

# Storage Provider
STORAGE_PROVIDER=supabase
STORAGE_BUCKET=aptly-media
```

---

## 5. Run Database Migrations

From the `apps/api` directory, apply the complete Phase 0 and Phase 1 schema to Supabase:

```powershell
cd apps/api
.\.venv\Scripts\alembic upgrade head
```

This will automatically create all tables in your Supabase PostgreSQL database:
- `jobs`
- `role_profiles`
- `interviews`
- `questions`
- `answers`
- `transcripts`
- `speech_metrics`
- `content_metrics` (delivery, correctness, topic coverage, and ideal-answer outline)
- `knowledge_topics` (normalized concepts encountered in answers)
- `knowledge_edges` (co-occurrence relationships between concepts)
- `learner_topic_progress` (per-learner attempts, correctness, mastery, and recency)
- `alembic_version`

Migration `005_analysis_progress_knowledge_graph` adds the learner identity and analysis fields. The default UI uses an anonymous browser-generated learner ID until authentication is added, so progress is separated per browser without storing identity data in the frontend filesystem.

---

## 6. Start the Application

### Backend (FastAPI):
```powershell
cd apps/api
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js):
```powershell
cd apps/web
npm run dev
```

Open [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) to verify:
- `postgresql`: `ok` (Connected to Supabase PostgreSQL)
- `storage_provider (supabase)`: `ok`

On startup the API also verifies that `aptly-media` exists and is private. If it does not exist, the backend creates it through the Supabase Storage API using the service-role key.

## 7. Runtime behavior

During an interview, Gemini Flash generates and evaluates questions, detects when a short answer needs a follow-up, and can explain a learner's doubt using the current question as context. After each answer, APTLY records:

- correctness (`correct`, `partially_correct`, `incorrect`, or `not_enough_evidence`)
- a correctness score and explanation
- which expected topics were covered or missed
- an ideal answer outline for review
- topic mastery updates and graph connections

The review page exposes those details rather than only WPM and pause metrics. The Progress page uses the stored mastery history to recommend easy, medium, or hard interviews. Narration is generated server-side with Gemini Flash TTS, so the browser never receives the Gemini API key; browser speech synthesis remains only as a graceful fallback if the TTS request fails.
