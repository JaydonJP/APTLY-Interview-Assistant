"""
APTLY API — Security & Authentication Utilities

Provides:
- Supabase Auth JWT token extraction & verification
- User context resolution
- CORS and media payload validations
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from jose import JWTError, jwt

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class AuthenticatedUser:
    """Authenticated user context resolved from Supabase JWT."""

    id: str
    email: str | None = None
    role: str = "authenticated"
    metadata: dict[str, Any] | None = None


def decode_supabase_token(
    token: str,
    secret: str = "",
    issuer: str = "",
    audience: str = "authenticated",
) -> AuthenticatedUser | None:
    """
    Decode and validate a Supabase JWT access token.
    Extracts the user ID ('sub'), email, and metadata.
    """
    if not token or not token.strip():
        return None

    try:
        if not secret:
            logger.warning(
                "invalid_auth_token",
                error="Supabase JWT secret is not configured",
            )
            return None

        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if algorithm not in {"HS256", "HS384", "HS512"}:
            logger.warning("invalid_auth_token", error="Unsupported JWT signing algorithm")
            return None

        claims = jwt.decode(
            token,
            secret,
            algorithms=[algorithm],
            audience=audience if audience else None,
            issuer=issuer if issuer else None,
            options={
                "verify_aud": bool(audience),
                "verify_iss": bool(issuer),
            },
        )
        user_id = claims.get("sub") or claims.get("user_id") or claims.get("id")
        if not user_id:
            return None

        email = claims.get("email")
        role = claims.get("role", "authenticated")
        metadata = claims.get("user_metadata", {})

        return AuthenticatedUser(
            id=str(user_id),
            email=str(email) if email else None,
            role=str(role),
            metadata=metadata if isinstance(metadata, dict) else {},
        )
    except JWTError as exc:
        logger.warning("invalid_auth_token", error=str(exc))
        return None
    except Exception as exc:
        logger.warning("auth_token_decode_error", error=str(exc))
        return None


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
    Small dependency-free sliding-window limiter.

    Production deployments should provide a shared Redis implementation around
    the same interface so limits apply across API replicas.

    Usage (future):
        limiter = RateLimiter(redis_client=redis)
        await limiter.check(key=f"ip:{request.client.host}", limit=60, window=60)
    """

    async def check(self, key: str, limit: int, window_seconds: int) -> bool:
        """
        Check if the rate limit has been exceeded.

        Returns:
            True if the request is within limits (should proceed).
            False if the rate limit is exceeded (should reject).
        """
        import time

        now = time.monotonic()
        bucket = getattr(self, "_buckets", None)
        if bucket is None:
            bucket = self._buckets = {}
        timestamps = [
            stamp for stamp in bucket.get(key, []) if now - stamp < window_seconds
        ]
        if len(timestamps) >= limit:
            bucket[key] = timestamps
            logger.warning(
                "rate_limit_exceeded",
                key=key,
                limit=limit,
                window=window_seconds,
            )
            return False
        timestamps.append(now)
        bucket[key] = timestamps
        return True
