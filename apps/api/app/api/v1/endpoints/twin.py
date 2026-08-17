"""
APTLY API — Interview Twin Endpoints

Provides longitudinal coaching history, recurring evidence debt, and session progress trends.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.interview_twin import InterviewTwinProfile
from app.services.interview_twin_service import InterviewTwinService

router = APIRouter(prefix="/twin", tags=["Interview Twin"])


@router.get(
    "",
    response_model=InterviewTwinProfile,
    summary="Get Interview Twin coaching profile and longitudinal trends",
)
async def get_interview_twin(
    db: AsyncSession = Depends(get_db),
) -> InterviewTwinProfile:
    """
    Returns the persistent Interview Twin coaching history synthesized from all completed sessions.
    Strictly uses real session history (Session 1, 2, 3...) and flags insufficient data when < 2 sessions.
    """
    service = InterviewTwinService()
    return await service.get_twin_profile(db)
