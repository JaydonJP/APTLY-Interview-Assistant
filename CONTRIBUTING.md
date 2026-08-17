# CONTRIBUTING.md

# Contributing to APTLY

Thank you for contributing to APTLY. This document defines the conventions that keep the codebase consistent and maintainable across all phases of development.

---

## Git Conventions

### Branch Naming

```
<type>/<phase>/<short-description>
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code restructure (no behaviour change)
- `docs` — documentation only
- `test` — adding or fixing tests
- `chore` — dependency updates, tooling, CI

**Examples:**
```
feat/phase1/whisper-transcription-provider
fix/phase0/health-endpoint-cors
docs/phase0/realtime-architecture
chore/phase0/update-fastapi-version
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

```
<type>(scope): <short summary>

[optional body]

[optional footer]
```

**Examples:**
```
feat(api): add interview creation endpoint
fix(storage): validate file type before upload
docs(architecture): document async processing pipeline
test(providers): add mock LLM provider tests
chore(deps): upgrade FastAPI to 0.115
```

**Rules:**
- Subject line: max 72 characters, imperative mood, no period
- Body: explain *what* and *why*, not *how*
- Reference issues: `Closes #42`

### Pull Requests

- PRs must target `main` via a feature branch — never commit directly to `main`
- PR title follows the same commit message format
- PR description must include:
  - What changed and why
  - How to test the change
  - Any breaking changes
  - Screenshots for UI changes
- All CI checks must pass before merging
- Require at least one reviewer approval

---

## Code Style

### Backend (Python)

- Formatter: **Ruff** (configured in `pyproject.toml`)
- Linter: **Ruff** with full rule set
- Type checking: **MyPy**
- Line length: 88 characters
- All public functions must have type annotations
- All public modules must have docstrings

Run before committing:
```bash
cd apps/api
ruff check . --fix
ruff format .
mypy app/
```

### Frontend (TypeScript)

- Formatter: **Prettier** (`.prettierrc`)
- Linter: **ESLint** (`eslint.config.mjs`)
- TypeScript: **strict mode** (`tsconfig.json`)
- No `any` types — use `unknown` and narrow properly
- All React components must be typed (no implicit `props: any`)

Run before committing:
```bash
cd apps/web
npm run lint
npm run typecheck
```

---

## File Organization Rules

### Backend

- Route handlers must be **thin** — delegate to services
- No business logic in route handlers
- No database queries in route handlers — use repositories
- One model/schema per domain concept
- Services must not import from `api/` layer
- Repositories must not import from `api/` or `services/` layers

### Frontend

- One component per file
- Component files match their export name: `LoadingState.tsx` exports `LoadingState`
- Pages live in `src/app/` (Next.js App Router convention)
- Shared components live in `src/components/`
- API types live in `src/types/`
- API client logic lives in `src/lib/`

---

## Versioning Conventions

### API Versioning
All routes are prefixed: `/api/v1/`. When breaking changes are needed, create `/api/v2/` — never modify existing versioned contracts.

### Schema Versioning
All structured AI/metric outputs include `schema_version: "1.0"`. When the shape changes, increment the version. Never silently change schema without a version bump.

### Prompt Versioning
Prompts live in `services/ai/prompts/<category>/v<N>.py`. Never edit a deployed prompt version in-place — always create a new version file.

---

## Sensitive Data Rules

**Never commit:**
- `.env` files
- API keys or secrets in any form
- Real user data (video, audio, transcripts)
- Database credentials
- Private keys or certificates

**Always use:**
- Environment variables via `.env` (locally) and secrets management (production)
- `SECRET_KEY` from env, never hardcoded

---

## Testing Requirements

- All new backend endpoints must have at least one passing test
- All new services must have unit tests covering the happy path and at least one error case
- Mock all external providers in tests — never call real AI services in CI
- Frontend components must have at minimum a render test

---

## Phase-Gated Development

Features that belong to a future phase must be:
1. Documented in the relevant `README.md` of the service directory
2. Noted in `docs/architecture/` with the target phase
3. NOT implemented until that phase is approved

Do not implement Phase 1+ features in Phase 0 branches.
