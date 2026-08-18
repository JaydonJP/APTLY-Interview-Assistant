"""Read-only media playback endpoint for evidence replay."""

from __future__ import annotations

import mimetypes
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import StorageError
from app.core.security import AuthenticatedUser
from app.dependencies import get_db, get_optional_current_user, get_storage
from app.models.interview import Interview
from app.services.storage.base import StorageProvider

router = APIRouter(prefix="/storage", tags=["Storage"])


@router.get(
    "/media/{storage_key:path}",
    summary="Stream a stored recording",
    responses={404: {"description": "Stored media was not found."}},
)
async def stream_media(
    storage_key: str,
    storage: StorageProvider = Depends(get_storage),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> Response:
    """Stream a stored object through the configured provider."""
    decoded_key = unquote(storage_key)
    key_parts = decoded_key.split("/")
    if len(key_parts) < 2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored media was not found.")
    try:
        interview = await db.get(Interview, UUID(key_parts[1]))
    except ValueError:
        interview = None
    if not interview or interview.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored media was not found.")
    if interview.user_id:
        if not user or user.id != interview.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Stored media is private.")
    elif interview.learner_id != "anonymous" and (not user or user.id != interview.learner_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Stored media is private.")
    try:
        data = await storage.download(decoded_key)
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored media was not found.",
        ) from exc

    metadata = await storage.get_metadata(decoded_key)
    content_type = metadata.content_type if metadata else (
        mimetypes.guess_type(decoded_key)[0] or "application/octet-stream"
    )
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )
