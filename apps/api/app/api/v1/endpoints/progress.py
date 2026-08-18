"""Persistent learner progress and knowledge graph endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthenticatedUser
from app.dependencies import get_db, get_optional_current_user
from app.schemas.progress import ProgressResponse
from app.services.knowledge_graph import KnowledgeGraphService

router = APIRouter(prefix="/progress", tags=["Progress & Knowledge Graph"])


@router.get(
    "",
    response_model=ProgressResponse,
    summary="Get learner progress",
    description="Returns topic mastery, connected knowledge graph edges, and next difficulty recommendation.",
)
async def get_progress(
    learner_id: str | None = Query(default=None, min_length=1, max_length=120),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> ProgressResponse:
    resolved_learner_id = user.id if user else "anonymous"
    if learner_id and learner_id != resolved_learner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCESS_DENIED", "message": "Progress is scoped to the current learner."},
        )
    service = KnowledgeGraphService()
    return ProgressResponse(**await service.get_progress(db, resolved_learner_id))
