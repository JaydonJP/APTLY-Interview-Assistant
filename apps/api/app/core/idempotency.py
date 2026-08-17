"""
APTLY API — Idempotency Middleware & Dependency

Provides support for idempotent mutations via the `Idempotency-Key` HTTP header.

Protocol:
1. Client generates UUID for mutating operations:
   - POST /api/v1/interviews
   - POST /api/v1/interviews/{id}/answers
   - POST /api/v1/interviews/{id}/finish
2. Header: `Idempotency-Key: <uuid>`
3. Phase 0: Validates UUID format and logs context.
4. Phase 1+: Caches response in Redis under key `idempotency:<user_id>:<key>` with 24h TTL.
   Repeated requests return cached response without duplicate domain mutations.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Header, HTTPException, status

from app.core.logging import get_logger

logger = get_logger(__name__)

IDEMPOTENCY_HEADER = "Idempotency-Key"


async def get_idempotency_key(
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> UUID | None:
    """
    FastAPI dependency that extracts and validates the Idempotency-Key header.

    If present, validates that it is a valid UUIDv4 string.
    """
    if idempotency_key is None:
        return None

    try:
        validated_uuid = UUID(idempotency_key)
        logger.debug("idempotency_key_received", idempotency_key=str(validated_uuid))
        return validated_uuid
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_IDEMPOTENCY_KEY",
                "message": "Idempotency-Key header must be a valid UUID",
            },
        ) from exc
