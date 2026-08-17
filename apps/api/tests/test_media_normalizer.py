"""
APTLY API — Unit Tests for Media Normalizer & Audio Integrity Service
"""

from __future__ import annotations

import os
import tempfile

from app.services.media_normalizer import MediaNormalizerService


def test_sha256_computation() -> None:
    data = b"aptly-media-test-payload-12345"
    checksum = MediaNormalizerService.compute_sha256(data)
    assert len(checksum) == 64
    assert isinstance(checksum, str)
    # Idempotent
    assert checksum == MediaNormalizerService.compute_sha256(data)


def test_media_inspection_fallback() -> None:
    normalizer = MediaNormalizerService()
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        f.write(b"0" * 32000)
        temp_path = f.name

    try:
        inspection = normalizer.inspect_media(temp_path)
        assert inspection["size_bytes"] == 32000
        assert inspection["duration_seconds"] >= 1.0
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
