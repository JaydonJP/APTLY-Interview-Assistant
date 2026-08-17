# APTLY — Supabase Integration & Setup Guide

This guide walks you through connecting your Supabase project (PostgreSQL database & Object Storage) to APTLY.

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
- `alembic_version`

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
