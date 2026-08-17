# Integration Tests

Integration tests verify multi-component flows against live backing services (Postgres, Redis, real/local storage).

## Running Integration Tests

Ensure docker-compose services are running:

```bash
docker-compose up -d
```

Execute integration tests in backend:

```bash
cd apps/api
.\.venv\Scripts\pytest -m integration tests/
```
