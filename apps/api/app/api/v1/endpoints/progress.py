"""Persistent learner progress and knowledge graph endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
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
    learner_id: str = Query(default="anonymous", min_length=1, max_length=120),
    db: AsyncSession = Depends(get_db),
) -> ProgressResponse:
    service = KnowledgeGraphService()
    return ProgressResponse(**await service.get_progress(db, learner_id))
