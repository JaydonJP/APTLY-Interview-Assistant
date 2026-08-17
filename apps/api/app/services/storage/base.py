"""Provider-neutral storage contracts.

The application stores opaque keys, never client filenames or filesystem paths.
That keeps local development, Supabase Storage, and a future S3 provider
interchangeable.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass(slots=True)
class UploadRequest:
    """Binary object and traceability metadata for an upload."""

    data: bytes
    content_type: str
    data_class: str
    extension: str
    owner_id: str | None = None
    interview_id: str | None = None
    answer_id: str | None = None
    processing_status: str = "created"
    retention_policy: str = "session"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class StorageMetadata:
    """Auditable metadata retained alongside an object."""

    storage_key: str
    data_class: str
    content_type: str
    extension: str
    size_bytes: int
    checksum_sha256: str
    owner_id: str | None = None
    interview_id: str | None = None
    answer_id: str | None = None
    processing_status: str = "created"
    retention_policy: str = "session"
    created_at: str = field(
        default_factory=lambda: datetime.now(UTC).isoformat()
    )
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class UploadResult:
    """Result returned after a successful upload."""

    storage_key: str
    size_bytes: int
    content_type: str
    metadata: StorageMetadata


@dataclass(slots=True)
class PresignedUrl:
    """A short-lived URL for browser playback or download."""

    url: str
    storage_key: str
    expires_at: str | None = None


class StorageProvider(ABC):
    """Minimal async contract implemented by every storage backend."""

    @abstractmethod
    async def upload(self, request: UploadRequest) -> UploadResult:
        """Persist an object and return its opaque storage key."""

    @abstractmethod
    async def download(self, storage_key: str) -> bytes:
        """Read an object by opaque storage key."""

    @abstractmethod
    async def delete(self, storage_key: str) -> None:
        """Delete an object by opaque storage key."""

    @abstractmethod
    async def exists(self, storage_key: str) -> bool:
        """Return whether an object exists."""

    @abstractmethod
    async def get_metadata(self, storage_key: str) -> StorageMetadata | None:
        """Return object metadata, if present."""

    @abstractmethod
    async def generate_presigned_url(
        self,
        storage_key: str,
        expires_in_seconds: int = 900,
    ) -> PresignedUrl:
        """Create a short-lived playback/download URL."""
