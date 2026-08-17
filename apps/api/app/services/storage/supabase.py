"""Supabase Storage provider with the same contract as local storage."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx

from app.core.errors import MediaValidationError, StorageError
from app.core.security import validate_media_mime_type, validate_media_size
from app.services.storage.base import (
    PresignedUrl,
    StorageMetadata,
    StorageProvider,
    UploadRequest,
    UploadResult,
)


class SupabaseStorageProvider(StorageProvider):
    """Upload media to a Supabase Storage bucket using its HTTP API."""

    def __init__(
        self,
        supabase_url: str,
        service_role_key: str,
        bucket_name: str = "aptly-media",
    ) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.bucket_name = bucket_name
        self.base_api_url = f"{self.supabase_url}/storage/v1"

    def _get_headers(self, content_type: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    @staticmethod
    def _generate_storage_key(
        data_class: str,
        interview_id: str | None,
        extension: str,
    ) -> str:
        scope = interview_id or str(uuid4())
        return f"{data_class}/{scope}/{uuid4()}.{extension.lstrip('.')}"

    @staticmethod
    def _validate_upload(request: UploadRequest) -> None:
        content_type = request.content_type.split(";", 1)[0].strip().lower()
        if not request.data or not validate_media_size(len(request.data)):
            raise MediaValidationError("Uploaded object is empty or too large.")
        if not (
            validate_media_mime_type(content_type)
            or content_type in {"application/json", "text/plain"}
        ):
            raise MediaValidationError(f"Content type '{content_type}' is not allowed.")

    def _object_url(self, storage_key: str) -> str:
        return f"{self.base_api_url}/object/{self.bucket_name}/{storage_key}"

    async def upload(self, request: UploadRequest) -> UploadResult:
        self._validate_upload(request)
        content_type = request.content_type.split(";", 1)[0].strip().lower()
        storage_key = self._generate_storage_key(
            request.data_class,
            request.interview_id,
            request.extension,
        )
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self._object_url(storage_key),
                    content=request.data,
                    headers={
                        **self._get_headers(content_type),
                        "x-upsert": "false",
                    },
                )
            response.raise_for_status()
        except (httpx.HTTPError, ValueError) as exc:
            raise StorageError("Supabase Storage upload failed.") from exc

        metadata = StorageMetadata(
            storage_key=storage_key,
            data_class=request.data_class,
            content_type=content_type,
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
        return UploadResult(storage_key, len(request.data), content_type, metadata)

    async def download(self, storage_key: str) -> bytes:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(
                    self._object_url(storage_key),
                    headers=self._get_headers(),
                )
            response.raise_for_status()
            return response.content
        except (httpx.HTTPError, ValueError) as exc:
            raise StorageError("Supabase Storage download failed.") from exc

    async def delete(self, storage_key: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.delete(
                    f"{self.base_api_url}/object/{self.bucket_name}",
                    json={"prefixes": [storage_key]},
                    headers=self._get_headers(),
                )
            response.raise_for_status()
        except (httpx.HTTPError, ValueError) as exc:
            raise StorageError("Supabase Storage delete failed.") from exc

    async def exists(self, storage_key: str) -> bool:
        try:
            await self.download(storage_key)
            return True
        except StorageError:
            return False

    async def get_metadata(self, storage_key: str) -> StorageMetadata | None:
        return None

    async def generate_presigned_url(
        self,
        storage_key: str,
        expires_in_seconds: int = 900,
    ) -> PresignedUrl:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_api_url}/object/sign/{self.bucket_name}",
                    json={"paths": [storage_key], "expiresIn": expires_in_seconds},
                    headers=self._get_headers("application/json"),
                )
            response.raise_for_status()
            payload = response.json()
            signed_url = payload.get("signedURL") or payload.get("signedUrl")
            if not signed_url:
                raise StorageError("Supabase did not return a signed URL.")
            if signed_url.startswith("/"):
                signed_url = f"{self.supabase_url}/storage/v1{signed_url}"
            expires_at = (
                datetime.now(UTC) + timedelta(seconds=expires_in_seconds)
            ).isoformat()
            return PresignedUrl(signed_url, storage_key, expires_at)
        except StorageError:
            raise
        except (httpx.HTTPError, ValueError) as exc:
            raise StorageError("Could not create a Supabase signed URL.") from exc
