"""
APTLY API — Security Utilities

Baseline security configuration:
- CORS origin parsing and validation
- Request body size limiting
- Rate limit abstraction (interface only — no real limiter in Phase 0)
- Input sanitisation helpers

Phase 0 does NOT implement authentication.
Auth will be added as a modular middleware in Phase 1.
"""

from __future__ import annotations

from app.core.logging import get_logger

logger = get_logger(__name__)

# Maximum upload size: 500 MB (enforced at media upload endpoint level)
# Videos and audio files can be large; this is deliberately generous for dev.
# In production, this should be enforced at the reverse proxy (nginx) as well.
MAX_UPLOAD_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB

# Maximum JSON body size: 1 MB
MAX_JSON_BODY_SIZE_BYTES: int = 1 * 1024 * 1024  # 1 MB

# Allowed media MIME types for future upload validation
ALLOWED_VIDEO_MIME_TYPES: frozenset[str] = frozenset(
    {
        "video/webm",
        "video/mp4",
        "video/ogg",
    }
)

ALLOWED_AUDIO_MIME_TYPES: frozenset[str] = frozenset(
    {
        "audio/webm",
        "audio/ogg",
        "audio/wav",
        "audio/mp4",
        "audio/mpeg",
    }
)

ALLOWED_MEDIA_MIME_TYPES: frozenset[str] = (
    ALLOWED_VIDEO_MIME_TYPES | ALLOWED_AUDIO_MIME_TYPES
)


def validate_media_mime_type(content_type: str) -> bool:
    """
    Return True if the content type is an allowed media type.

    Always validate MIME type server-side — never trust client-provided content type alone.
    Future: pair with magic-byte inspection for stronger guarantees.
    """
    base_type = content_type.split(";")[0].strip().lower()
    return base_type in ALLOWED_MEDIA_MIME_TYPES


def validate_media_size(size_bytes: int) -> bool:
    """Return True if the file size is within the allowed limit."""
    return size_bytes <= MAX_UPLOAD_SIZE_BYTES


class RateLimiter:
    """
    Rate limiter interface (Phase 0: no-op implementation).

    Phase 1+: Replace with a Redis-backed sliding window limiter.

    Usage (future):
        limiter = RateLimiter(redis_client=redis)
        await limiter.check(key=f"ip:{request.client.host}", limit=60, window=60)
    """

    async def check(self, key: str, limit: int, window_seconds: int) -> bool:
        """
        Check if the rate limit has been exceeded.

        Phase 0: Always returns True (no actual limiting).
        Phase 1: Implement Redis sliding window counter.

        Returns:
            True if the request is within limits (should proceed).
            False if the rate limit is exceeded (should reject).
        """
        # TODO Phase 1: implement Redis-backed rate limiting
        logger.debug(
            "rate_limit_check_noop", key=key, limit=limit, window=window_seconds
        )
        return True
