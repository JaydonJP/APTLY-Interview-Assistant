"""
APTLY API — Storage Abstraction Tests
"""

from __future__ import annotations

import pytest

from app.core.errors import MediaValidationError, StorageError
from app.services.storage.base import UploadRequest
from app.services.storage.local import LocalStorageProvider


@pytest.mark.asyncio
async def test_local_storage_upload_and_download(
    local_storage: LocalStorageProvider,
) -> None:
    """Upload bytes then download them back — round trip must be lossless."""
    data = b"hello aptly storage test"
    req = UploadRequest(
        data=data,
        content_type="application/json",
        data_class="reports",
        extension="json",
    )
    upload = await local_storage.upload(req)

    assert upload.storage_key
    assert upload.size_bytes == len(data)

    downloaded = await local_storage.download(upload.storage_key)
    assert downloaded == data


@pytest.mark.asyncio
async def test_local_storage_exists_true_after_upload(
    local_storage: LocalStorageProvider,
) -> None:
    """exists() returns True after a successful upload."""
    req = UploadRequest(
        data=b"test data",
        content_type="application/json",
        data_class="reports",
        extension="json",
    )
    upload = await local_storage.upload(req)
    assert await local_storage.exists(upload.storage_key) is True


@pytest.mark.asyncio
async def test_local_storage_exists_false_for_unknown(
    local_storage: LocalStorageProvider,
) -> None:
    """exists() returns False for an unknown key."""
    result = await local_storage.exists("reports/nonexistent-file.json")
    assert result is False


@pytest.mark.asyncio
async def test_local_storage_delete_removes_file(
    local_storage: LocalStorageProvider,
) -> None:
    """delete() removes the file so exists() returns False."""
    req = UploadRequest(
        data=b"to be deleted",
        content_type="application/json",
        data_class="reports",
        extension="json",
    )
    upload = await local_storage.upload(req)
    assert await local_storage.exists(upload.storage_key) is True

    await local_storage.delete(upload.storage_key)
    assert await local_storage.exists(upload.storage_key) is False


@pytest.mark.asyncio
async def test_local_storage_delete_nonexistent_raises(
    local_storage: LocalStorageProvider,
) -> None:
    """delete() on a non-existent key raises StorageError."""
    with pytest.raises(StorageError):
        await local_storage.delete("reports/does-not-exist.json")


@pytest.mark.asyncio
async def test_local_storage_rejects_invalid_mime_type(
    local_storage: LocalStorageProvider,
) -> None:
    """Upload with disallowed MIME type raises MediaValidationError."""
    req = UploadRequest(
        data=b"fake binary",
        content_type="application/x-executable",  # Not allowed
        data_class="raw_video",
        extension="exe",
    )
    with pytest.raises(MediaValidationError):
        await local_storage.upload(req)


@pytest.mark.asyncio
async def test_local_storage_uuid_based_keys(
    local_storage: LocalStorageProvider,
) -> None:
    """Storage keys are UUID-based — no client filename is ever used."""
    req = UploadRequest(
        data=b"test",
        content_type="application/json",
        data_class="reports",
        extension="json",
    )
    r1 = await local_storage.upload(req)
    r2 = await local_storage.upload(req)
    # Both uploads of identical data get different keys
    assert r1.storage_key != r2.storage_key


@pytest.mark.asyncio
async def test_local_storage_key_contains_data_class(
    local_storage: LocalStorageProvider,
) -> None:
    """Storage key prefix matches the data class."""
    req = UploadRequest(
        data=b"test",
        content_type="application/json",
        data_class="transcripts",
        extension="json",
    )
    upload = await local_storage.upload(req)
    assert upload.storage_key.startswith("transcripts/")


@pytest.mark.asyncio
async def test_local_storage_get_metadata(
    local_storage: LocalStorageProvider,
) -> None:
    """get_metadata() returns the stored metadata for an object."""
    req = UploadRequest(
        data=b"test metadata",
        content_type="application/json",
        data_class="content_evaluation",
        extension="json",
        owner_id="user-456",
        interview_id="test-interview-123",
        answer_id="ans-789",
        processing_status="processed",
        retention_policy="2_years",
    )
    upload = await local_storage.upload(req)
    meta = await local_storage.get_metadata(upload.storage_key)

    assert meta is not None
    assert meta.data_class == "content_evaluation"
    assert meta.owner_id == "user-456"
    assert meta.interview_id == "test-interview-123"
    assert meta.answer_id == "ans-789"
    assert meta.processing_status == "processed"
    assert meta.retention_policy == "2_years"
    assert meta.checksum_sha256 is not None
    assert len(meta.checksum_sha256) == 64
    assert meta.size_bytes == len(b"test metadata")
