-- ============================================================
-- APTLY PostgreSQL Initialization Script
-- Runs once when the container first starts
-- ============================================================

-- Enable UUID generation (needed for UUID primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_stat_statements for query monitoring (future observability)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Set timezone to UTC for all sessions
SET timezone = 'UTC';

-- ── Future Schema Notes ────────────────────────────────────────────────────
-- Full schema is managed by Alembic migrations.
-- This init.sql only handles extensions and database-level settings.
--
-- Tables will be created by running:
--   alembic upgrade head
--
-- See infrastructure/database/README.md for migration instructions.
-- ──────────────────────────────────────────────────────────────────────────
