"""
APTLY API — Job & Role Analysis Endpoint Tests
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analyze_job_description_success(client: AsyncClient) -> None:
    payload = {
        "job_description": (
            "We are seeking a Senior Python Backend Engineer to join our core infrastructure team. "
            "You must have 5+ years of experience with Python, FastAPI, PostgreSQL, Docker, and Redis. "
            "Responsibilities include building high-throughput microservices, designing zero-downtime database schemas, "
            "and leading sprint code reviews."
        ),
        "title": "Senior Python Backend Engineer",
        "company": "Tech Corp",
    }

    response = await client.post("/api/v1/jobs/analyze", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "Senior Python Backend Engineer"
    assert data["company"] == "Tech Corp"

    role_profile = data["role_profile"]
    assert role_profile is not None
    assert role_profile["role_title"] == "Senior Python Backend Engineer"
    assert role_profile["seniority"] in ("Senior", "Mid-Level", "Staff / Principal")
    assert "Python" in role_profile["technical_skills"]
    assert len(role_profile["interview_topics"]) > 0


@pytest.mark.asyncio
async def test_analyze_job_description_too_short_validation(
    client: AsyncClient,
) -> None:
    payload = {"job_description": "Short"}
    response = await client.post("/api/v1/jobs/analyze", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_job_by_id(client: AsyncClient) -> None:
    # 1. Create a job first
    payload = {
        "job_description": (
            "Looking for a Full-Stack React & Node.js Developer with experience building modern web apps."
        ),
    }
    create_res = await client.post("/api/v1/jobs/analyze", json=payload)
    assert create_res.status_code == 201
    job_id = create_res.json()["id"]

    # 2. Fetch by ID
    get_res = await client.get(f"/api/v1/jobs/{job_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == job_id
    assert get_res.json()["role_profile"] is not None
