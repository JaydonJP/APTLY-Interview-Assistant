"""
APTLY API — Health Endpoint Tests
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_health_returns_200(client: AsyncClient) -> None:
    """Root health endpoint always returns 200."""
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_root_health_response_shape(client: AsyncClient) -> None:
    """Root health response matches HealthResponse schema."""
    response = await client.get("/health")
    data = response.json()
    assert "status" in data
    assert "app_name" in data
    assert "app_version" in data
    assert "environment" in data
    assert "timestamp" in data
    assert "using_mock_providers" in data


@pytest.mark.asyncio
async def test_root_health_app_name(client: AsyncClient) -> None:
    """App name is present in health response."""
    response = await client.get("/health")
    data = response.json()
    assert data["app_name"] == "APTLY-Test"


@pytest.mark.asyncio
async def test_root_health_mock_providers_flag(client: AsyncClient) -> None:
    """Mock providers flag is True when all providers are mocked."""
    response = await client.get("/health")
    data = response.json()
    assert data["using_mock_providers"] is True


@pytest.mark.asyncio
async def test_v1_health_returns_200(client: AsyncClient) -> None:
    """V1 health endpoint returns 200."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_v1_health_includes_services(client: AsyncClient) -> None:
    """V1 health endpoint includes a services list."""
    response = await client.get("/api/v1/health")
    data = response.json()
    assert "services" in data
    assert isinstance(data["services"], list)
    assert len(data["services"]) > 0


@pytest.mark.asyncio
async def test_v1_health_has_request_id_header(client: AsyncClient) -> None:
    """Every response includes an X-Request-ID header."""
    response = await client.get("/api/v1/health")
    assert "x-request-id" in response.headers


@pytest.mark.asyncio
async def test_v1_health_services_have_name_and_status(client: AsyncClient) -> None:
    """All services in the health check have name and status fields."""
    response = await client.get("/api/v1/health")
    data = response.json()
    for service in data["services"]:
        assert "name" in service
        assert "status" in service
