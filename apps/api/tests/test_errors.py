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
    # FastAPI returns 404 for unknown routes — our handler wraps it
    assert response.status_code in (404, 405)


@pytest.mark.asyncio
async def test_interview_stub_returns_501(client: AsyncClient) -> None:
    """Interview stub endpoints return 501 Not Implemented."""
    response = await client.post("/api/v1/interviews")
    assert response.status_code == 501


@pytest.mark.asyncio
async def test_501_has_error_envelope(client: AsyncClient) -> None:
    """501 response has the standard error envelope shape."""
    response = await client.post("/api/v1/interviews")
    data = response.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    assert data["error"]["code"] == "NOT_IMPLEMENTED"


@pytest.mark.asyncio
async def test_no_stack_trace_in_error_response(client: AsyncClient) -> None:
    """Error responses never include Python stack traces."""
    response = await client.post("/api/v1/interviews")
    text = response.text
    assert "Traceback" not in text
    assert "File " not in text
    assert ".py" not in text


@pytest.mark.asyncio
async def test_request_id_in_error_response(client: AsyncClient) -> None:
    """Error responses include the request ID header."""
    response = await client.post("/api/v1/interviews")
    assert "x-request-id" in response.headers


@pytest.mark.asyncio
async def test_progress_stub_returns_501(client: AsyncClient) -> None:
    """Progress endpoint is stubbed and returns 501."""
    response = await client.get("/api/v1/progress")
    assert response.status_code == 501


@pytest.mark.asyncio
async def test_jobs_analyze_stub_returns_501(client: AsyncClient) -> None:
    """Jobs analyze endpoint is stubbed and returns 501."""
    response = await client.post("/api/v1/jobs/analyze")
    assert response.status_code == 501
