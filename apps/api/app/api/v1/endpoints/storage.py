"""Read-only media playback endpoint for evidence replay."""

from __future__ import annotations

import mimetypes
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from app.core.errors import StorageError
from app.dependencies import get_storage
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
) -> Response:
    """Stream a stored object through the configured provider."""
    decoded_key = unquote(storage_key)
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
