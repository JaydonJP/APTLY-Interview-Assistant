"""
APTLY API — Interview Twin Endpoints

Provides longitudinal coaching history, recurring evidence debt, and session progress trends.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthenticatedUser
from app.dependencies import get_db, get_optional_current_user
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
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> InterviewTwinProfile:
    """
    Returns the persistent Interview Twin coaching history synthesized from completed sessions.
    Strictly scoped to the authenticated user's private session data.
    """
    user_id = user.id if user else None
    service = InterviewTwinService()
    return await service.get_twin_profile(db, user_id=user_id)
