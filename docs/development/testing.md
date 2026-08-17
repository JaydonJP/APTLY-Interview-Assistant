# Testing Strategy & Guidelines

## 1. Backend Testing (Pytest)

The backend suite runs fast in-memory tests with SQLite (`aiosqlite`) and mock providers.

### Running Tests

```bash
cd apps/api
.\.venv\Scripts\pytest tests/ -v
```

### Coverage

```bash
cd apps/api
.\.venv\Scripts\pytest --cov=app --cov-report=term-missing tests/
```

### Testing Rules

- **No Network in Unit Tests**: Unit tests MUST NOT make external HTTP calls or depend on real external APIs.
- **Provider Mocking**: All providers are injected and mocked via FastAPI dependency overrides in `conftest.py`.

## 2. Frontend Testing (Vitest & Playwright)

### Running Unit / Component Tests

```bash
cd apps/web
npm test
```

### Running E2E Tests

```bash
npm run test:e2e
```

## 3. Linting and Type Checking

- Backend Linting: `ruff check .`
- Backend Formatting: `ruff format --check .`
- Backend Type Check: `mypy app/`
- Frontend Linting: `npm run lint`
- Frontend Type Check: `npx tsc --noEmit`
