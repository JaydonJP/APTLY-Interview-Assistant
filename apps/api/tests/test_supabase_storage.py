import httpx
import pytest

from app.services.storage.base import UploadRequest
from app.services.storage.supabase import SupabaseStorageProvider


@pytest.fixture
def supabase_storage():
    return SupabaseStorageProvider(
        supabase_url="https://testproject.supabase.co",
        service_role_key="test-service-role-key-123",
        bucket_name="aptly-media",
    )


def test_supabase_storage_initialization(supabase_storage):
    assert supabase_storage.supabase_url == "https://testproject.supabase.co"
    assert supabase_storage.service_role_key == "test-service-role-key-123"
    assert supabase_storage.bucket_name == "aptly-media"
    assert supabase_storage.base_api_url == "https://testproject.supabase.co/storage/v1"


def test_supabase_storage_headers(supabase_storage):
    headers = supabase_storage._get_headers()
    assert headers["Authorization"] == "Bearer test-service-role-key-123"
    assert headers["apikey"] == "test-service-role-key-123"


def test_supabase_storage_generate_key(supabase_storage):
    key = supabase_storage._generate_storage_key(
        data_class="raw_audio",
        interview_id="int_123",
        extension="webm",
    )
    assert key.startswith("raw_audio/int_123/")
    assert key.endswith(".webm")


@pytest.mark.asyncio
async def test_supabase_storage_upload_mocked(monkeypatch, supabase_storage):
    sample_data = b"MOCK_AUDIO_DATA_FOR_TESTING"

    async def mock_post(self, url, content=None, headers=None, json=None):
        req = httpx.Request("POST", url)
        return httpx.Response(200, json={"Key": "aptly-media/raw_audio/test.webm"}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    upload_req = UploadRequest(
        data=sample_data,
        data_class="raw_audio",
        content_type="audio/webm",
        extension="webm",
        interview_id="int_abc",
        answer_id="ans_xyz",
    )

    result = await supabase_storage.upload(upload_req)
    assert result.storage_key.startswith("raw_audio/int_abc/")
    assert result.size_bytes == len(sample_data)
    assert result.metadata.checksum_sha256 is not None
    assert result.metadata.interview_id == "int_abc"
    assert result.metadata.answer_id == "ans_xyz"


@pytest.mark.asyncio
async def test_supabase_storage_download_mocked(monkeypatch, supabase_storage):
    sample_content = b"TEST_AUDIO_STREAM"

    async def mock_get(self, url, headers=None):
        req = httpx.Request("GET", url)
        return httpx.Response(200, content=sample_content, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    data = await supabase_storage.download("raw_audio/test.webm")
    assert data == sample_content


@pytest.mark.asyncio
async def test_supabase_storage_presigned_url_mocked(monkeypatch, supabase_storage):
    async def mock_post(self, url, json=None, headers=None):
        req = httpx.Request("POST", url)
        return httpx.Response(200, json={"signedURL": "/object/sign/aptly-media/raw_audio/test.webm?token=xyz"}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    presigned = await supabase_storage.generate_presigned_url("raw_audio/test.webm", expires_in_seconds=1800)
    assert "token=xyz" in presigned.url
    assert presigned.storage_key == "raw_audio/test.webm"


@pytest.mark.asyncio
async def test_supabase_storage_enforces_private_bucket(monkeypatch, supabase_storage):
    calls: list[str] = []

    async def mock_get(self, url, headers=None):
        req = httpx.Request("GET", url)
        return httpx.Response(200, json={"id": "aptly-media", "public": True}, request=req)

    async def mock_put(self, url, json=None, headers=None):
        calls.append(url)
        req = httpx.Request("PUT", url)
        return httpx.Response(200, json={"public": False}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)
    monkeypatch.setattr(httpx.AsyncClient, "put", mock_put)

    await supabase_storage.ensure_private_bucket()

    assert calls == [
        "https://testproject.supabase.co/storage/v1/bucket/aptly-media"
    ]
