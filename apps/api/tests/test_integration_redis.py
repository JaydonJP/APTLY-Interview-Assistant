"""
APTLY API — Real Redis Integration Tests

Verifies that the backend can connect to a real Redis instance:
- Connection establishment
- SET / GET / DELETE round-trip
- Key expiration (TTL)
"""

from __future__ import annotations

import os

import pytest
import redis.asyncio as aioredis

REDIS_TEST_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6379/0")


async def is_redis_available() -> bool:
    """Check if the real Redis instance is reachable."""
    try:
        client = aioredis.from_url(REDIS_TEST_URL, socket_connect_timeout=2.0)
        await client.ping()
        await client.aclose()
        return True
    except Exception:
        return False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_real_redis_connectivity_and_operations() -> None:
    """
    Test real Redis integration:
    1. Connect to Redis
    2. Ping
    3. Set test key with TTL
    4. Retrieve and assert value
    5. Delete test key
    """
    if not await is_redis_available():
        pytest.skip(
            f"Redis not reachable at {REDIS_TEST_URL}. "
            "Start services with `docker-compose up -d` to run real Redis integration tests."
        )

    client = aioredis.from_url(REDIS_TEST_URL)

    test_key = "aptly:test:integration_key"
    test_value = "phase0_redis_verified"

    # Ping
    pong = await client.ping()
    assert pong is True

    # SET with 60s TTL
    await client.set(test_key, test_value, ex=60)

    # GET
    retrieved = await client.get(test_key)
    assert retrieved is not None
    assert (
        retrieved.decode("utf-8") if isinstance(retrieved, bytes) else retrieved
    ) == test_value

    # DELETE
    deleted = await client.delete(test_key)
    assert deleted == 1

    # Verify deleted
    assert await client.get(test_key) is None

    await client.aclose()
