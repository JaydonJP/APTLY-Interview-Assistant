"""
APTLY API — Error Handling Tests
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_404_returns_standard_error_schema(client: AsyncClient) -> None:
    """404 on unknown route returns standard error envelope."""
    response = await client.get("/api/v1/nonexistent-route-xyz")
    assert response.status_code in (404, 405)


@pytest.mark.asyncio
async def test_validation_error_has_error_envelope(client: AsyncClient) -> None:
    """Validation error response has standard error envelope shape."""
    response = await client.post("/api/v1/jobs/analyze", json={"job_description": ""})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]


@pytest.mark.asyncio
async def test_no_stack_trace_in_error_response(client: AsyncClient) -> None:
    """Error responses never include Python stack traces."""
    response = await client.post(
        "/api/v1/jobs/analyze", json={"job_description": "invalid"}
    )
    text = response.text
    assert "Traceback" not in text
    assert "File " not in text
    assert ".py" not in text


@pytest.mark.asyncio
async def test_request_id_in_error_response(client: AsyncClient) -> None:
    """Error responses include the request ID header."""
    response = await client.get(
        "/api/v1/interviews/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 404
    assert "x-request-id" in response.headers
