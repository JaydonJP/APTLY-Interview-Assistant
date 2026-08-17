"""
APTLY API — Job & Role Analysis Endpoints
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_llm_provider
from app.models.job import Job
from app.schemas.jobs import JobAnalyzeRequest, JobResponse, RoleProfileResponse
from app.services.providers.base import LLMProvider
from app.services.role_analyzer import RoleAnalyzerService

router = APIRouter(prefix="/jobs", tags=["Jobs & Roles"])


@router.post(
    "/analyze",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze a Job Description",
    description="Parses a raw job description and extracts a structured RoleProfile.",
)
async def analyze_job_description(
    payload: JobAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    llm_provider: LLMProvider = Depends(get_llm_provider),
) -> JobResponse:
    """Analyze a Job Description and persist Job & RoleProfile."""
    analyzer = RoleAnalyzerService(llm_provider)
    job, role_profile = await analyzer.analyze(
        job_description=payload.job_description,
        title_override=payload.title,
        company=payload.company,
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)
    await db.refresh(role_profile)

    return JobResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        raw_text=job.raw_text,
        role_profile=RoleProfileResponse(
            id=role_profile.id,
            job_id=role_profile.job_id,
            role_title=role_profile.role_title,
            seniority=role_profile.seniority,
            domain=role_profile.domain,
            technical_skills=role_profile.technical_skills,
            tools=role_profile.tools,
            responsibilities=role_profile.responsibilities,
            behavioral_competencies=role_profile.behavioral_competencies,
            interview_topics=role_profile.interview_topics,
            preferred_experience=role_profile.preferred_experience,
            prompt_version=role_profile.prompt_version,
            created_at=role_profile.created_at,
        ),
        created_at=job.created_at,
    )


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get Job & Role Profile",
    description="Fetches an existing job and its structured role profile.",
)
async def get_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    """Retrieve job details by ID."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": f"Job '{job_id}' not found."},
        )

    # Fetch role profile
    role_profile_res: RoleProfileResponse | None = None
    if job.role_profile:
        rp = job.role_profile
        role_profile_res = RoleProfileResponse(
            id=rp.id,
            job_id=rp.job_id,
            role_title=rp.role_title,
            seniority=rp.seniority,
            domain=rp.domain,
            technical_skills=rp.technical_skills,
            tools=rp.tools,
            responsibilities=rp.responsibilities,
            behavioral_competencies=rp.behavioral_competencies,
            interview_topics=rp.interview_topics,
            preferred_experience=rp.preferred_experience,
            prompt_version=rp.prompt_version,
            created_at=rp.created_at,
        )

    return JobResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        raw_text=job.raw_text,
        role_profile=role_profile_res,
        created_at=job.created_at,
    )
