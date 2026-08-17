"""
APTLY API — Job & RoleProfile Schemas
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import AptlyBaseModel, VersionedSchema


class JobAnalyzeRequest(AptlyBaseModel):
    """Input payload for job description analysis."""

    job_description: str = Field(
        ...,
        min_length=20,
        max_length=50000,
        description="The raw text of the job description or posting.",
        examples=[
            "Senior Backend Engineer with 5+ years of Python, FastAPI, PostgreSQL, and distributed systems experience."
        ],
    )
    title: str | None = Field(
        default=None, max_length=255, description="Optional job title override."
    )
    company: str | None = Field(
        default=None, max_length=255, description="Optional hiring company name."
    )


class RoleProfileResponse(VersionedSchema):
    """Structured role profile extracted from a job description."""

    id: UUID
    job_id: UUID
    role_title: str
    seniority: str
    domain: str
    technical_skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    behavioral_competencies: list[str] = Field(default_factory=list)
    interview_topics: list[str] = Field(default_factory=list)
    preferred_experience: list[str] = Field(default_factory=list)
    prompt_version: str = "v1"
    created_at: datetime


class JobResponse(AptlyBaseModel):
    """Full Job entity with its associated RoleProfile."""

    id: UUID
    title: str | None
    company: str | None
    raw_text: str
    role_profile: RoleProfileResponse | None = None
    created_at: datetime
