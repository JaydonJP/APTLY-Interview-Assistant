"""
APTLY API — Observable Computer Vision Behavior Endpoints

Endpoints for submitting client-side real-time behavior tracking events
and retrieving evidence-grounded visual delivery summaries.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.dependencies import get_db
from app.schemas.behavior import (
    BehaviorEventResponse,
    BehaviorSubmitRequest,
    VisualDeliverySummaryResponse,
)
from app.services.behavior_analysis_service import BehaviorAnalysisService

logger = get_logger(__name__)
router = APIRouter(prefix="/interviews/{interview_id}/behavior", tags=["behavior"])


@router.post("", response_model=list[BehaviorEventResponse])
async def submit_behavior_events(
    interview_id: UUID,
    payload: BehaviorSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> list[BehaviorEventResponse]:
    """
    Submits client-side detected observable visual behavior events and time-series snapshots.
    """
    service = BehaviorAnalysisService()
    events = await service.record_behavior_events(db, interview_id, payload)

    return [
        BehaviorEventResponse(
            id=str(e.id),
            interview_id=str(e.interview_id),
            answer_id=str(e.answer_id) if e.answer_id else None,
            question_id=str(e.question_id) if e.question_id else None,
            event_type=e.event_type,
            start_ms=e.start_ms,
            end_ms=e.end_ms,
            duration_ms=e.duration_ms,
            confidence=e.confidence,
            value=e.value,
            metadata_json=e.metadata_json or {},
            created_at=e.created_at,
        )
        for e in events
    ]


@router.get("", response_model=VisualDeliverySummaryResponse)
async def get_visual_delivery_summary(
    interview_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> VisualDeliverySummaryResponse:
    """
    Retrieves the complete On-Camera Presence scorecard, behavior heatmap timeline,
    and Top 3 observable visual delivery habits paired with concrete practice drills.
    """
    service = BehaviorAnalysisService()
    return await service.get_visual_delivery_summary(db, interview_id)
