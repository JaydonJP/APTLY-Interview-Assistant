"""Safe local-disk storage for zero-dependency development and demos."""

from __future__ import annotations

import asyncio
import hashlib
import json
import mimetypes
import re
from dataclasses import asdict
from pathlib import Path
from uuid import uuid4

from app.core.errors import MediaValidationError, StorageError
from app.core.security import validate_media_mime_type, validate_media_size
from app.services.storage.base import (
    PresignedUrl,
    StorageMetadata,
    StorageProvider,
    UploadRequest,
    UploadResult,
)


class LocalStorageProvider(StorageProvider):
    """Store objects under a configured root with JSON sidecar metadata."""

    def __init__(self, root_dir: str = "./storage") -> None:
        self.root_dir = Path(root_dir).resolve()
        self.root_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_dir = self.root_dir / ".metadata"
        self.metadata_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _safe_segment(value: str, fallback: str) -> str:
        safe = re.sub(r"[^a-zA-Z0-9_-]", "", value.strip())
        return safe[:80] or fallback

    def _generate_storage_key(self, request: UploadRequest) -> str:
        data_class = self._safe_segment(request.data_class, "media")
        extension = self._safe_segment(request.extension.lstrip("."), "bin")
        object_id = str(uuid4())
        if request.interview_id:
            interview_id = self._safe_segment(request.interview_id, "session")
            return f"{data_class}/{interview_id}/{object_id}.{extension}"
        return f"{data_class}/{object_id}.{extension}"

    def _resolve_key(self, storage_key: str) -> Path:
        candidate = (self.root_dir / storage_key).resolve()
        if self.root_dir not in candidate.parents:
            raise StorageError("Invalid storage key.")
        if self.metadata_dir == candidate or self.metadata_dir in candidate.parents:
            raise StorageError("Invalid storage key.")
        return candidate

    def _metadata_path(self, storage_key: str) -> Path:
        digest = hashlib.sha256(storage_key.encode("utf-8")).hexdigest()
        return self.metadata_dir / f"{digest}.json"

    @staticmethod
    def _validate_upload(request: UploadRequest) -> None:
        if not request.data:
            raise MediaValidationError("Uploaded object is empty.")
        if not validate_media_size(len(request.data)):
            raise MediaValidationError("Uploaded object exceeds the size limit.")
        content_type = request.content_type.split(";", 1)[0].strip().lower()
        # Reports and metadata are legitimate non-media objects. Binary media
        # is restricted to the allow-list from the security module.
        if not (
            validate_media_mime_type(content_type)
            or content_type in {"application/json", "text/plain"}
        ):
            raise MediaValidationError(
                f"Content type '{content_type}' is not allowed for upload."
            )

    async def upload(self, request: UploadRequest) -> UploadResult:
        self._validate_upload(request)
        storage_key = self._generate_storage_key(request)
        object_path = self._resolve_key(storage_key)
        metadata = StorageMetadata(
            storage_key=storage_key,
            data_class=request.data_class,
            content_type=request.content_type,
            extension=request.extension.lstrip("."),
            size_bytes=len(request.data),
            checksum_sha256=hashlib.sha256(request.data).hexdigest(),
            owner_id=request.owner_id,
            interview_id=request.interview_id,
            answer_id=request.answer_id,
            processing_status=request.processing_status,
            retention_policy=request.retention_policy,
            extra=request.metadata,
        )

        def write() -> None:
            object_path.parent.mkdir(parents=True, exist_ok=True)
            object_path.write_bytes(request.data)
            self._metadata_path(storage_key).write_text(
                json.dumps(asdict(metadata), ensure_ascii=True),
                encoding="utf-8",
            )

        try:
            await asyncio.to_thread(write)
        except OSError as exc:
            raise StorageError("Could not persist uploaded object.") from exc

        return UploadResult(
            storage_key=storage_key,
            size_bytes=len(request.data),
            content_type=request.content_type,
            metadata=metadata,
        )

    async def download(self, storage_key: str) -> bytes:
        path = self._resolve_key(storage_key)
        try:
            return await asyncio.to_thread(path.read_bytes)
        except FileNotFoundError as exc:
            raise StorageError("Stored object was not found.") from exc
        except OSError as exc:
            raise StorageError("Could not read stored object.") from exc

    async def delete(self, storage_key: str) -> None:
        path = self._resolve_key(storage_key)
        metadata_path = self._metadata_path(storage_key)

        def remove() -> None:
            if not path.exists():
                raise FileNotFoundError(storage_key)
            path.unlink()
            metadata_path.unlink(missing_ok=True)

        try:
            await asyncio.to_thread(remove)
        except FileNotFoundError as exc:
            raise StorageError("Stored object was not found.") from exc
        except OSError as exc:
            raise StorageError("Could not delete stored object.") from exc

    async def exists(self, storage_key: str) -> bool:
        return await asyncio.to_thread(self._resolve_key(storage_key).is_file)

    async def get_metadata(self, storage_key: str) -> StorageMetadata | None:
        path = self._metadata_path(storage_key)
        if not await asyncio.to_thread(path.is_file):
            return None
        try:
            payload = json.loads(await asyncio.to_thread(path.read_text, encoding="utf-8"))
            return StorageMetadata(**payload)
        except (OSError, ValueError, TypeError) as exc:
            raise StorageError("Stored object metadata is unreadable.") from exc

    async def generate_presigned_url(
        self,
        storage_key: str,
        expires_in_seconds: int = 900,
    ) -> PresignedUrl:
        if not await self.exists(storage_key):
            raise StorageError("Stored object was not found.")
        # Local playback is intentionally served by the API, not a file:// URL.
        return PresignedUrl(
            url=f"/api/v1/storage/media/{storage_key}",
            storage_key=storage_key,
        )

    async def get_content_type(self, storage_key: str) -> str:
        metadata = await self.get_metadata(storage_key)
        if metadata:
            return metadata.content_type
        return mimetypes.guess_type(storage_key)[0] or "application/octet-stream"
