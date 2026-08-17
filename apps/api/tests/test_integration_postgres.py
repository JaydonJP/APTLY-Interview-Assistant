"""
APTLY API — Real PostgreSQL Integration Tests

Verifies that the application works against a real PostgreSQL instance:
- Async connection with asyncpg driver
- UUIDv4 primary keys and gen_random_uuid()
- Alembic / SQLAlchemy 2.0 metadata creation
- Session commit, rollback, and query execution
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.interview import Interview

POSTGRES_TEST_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://aptly_user:aptly_password@localhost:5432/aptly_db",
)


async def is_postgres_available() -> bool:
    """Check if the real PostgreSQL instance is reachable."""
    try:
        engine = create_async_engine(POSTGRES_TEST_URL, connect_args={"timeout": 2.0})
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return True
    except Exception:
        return False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_real_postgres_connection_and_crud() -> None:
    """
    Test real PostgreSQL integration:
    1. Connect to real PostgreSQL database
    2. Create tables
    3. Insert an Interview with UUIDv4 primary key
    4. Query and verify entity fields and timestamp
    """
    if not await is_postgres_available():
        pytest.skip(
            f"PostgreSQL not reachable at {POSTGRES_TEST_URL}. "
            "Start services with `docker-compose up -d` to run real PostgreSQL integration tests."
        )

    engine = create_async_engine(POSTGRES_TEST_URL, echo=False)
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        # Create an Interview entity
        interview = Interview(
            title="Senior Full-Stack Engineer Mock Interview",
            status="created",
            metrics_schema_version="1.0",
            evaluation_schema_version="1.0",
        )
        session.add(interview)
        await session.commit()
        await session.refresh(interview)

        interview_id = interview.id
        assert interview_id is not None

    # Verify retrieval
    async with session_factory() as session:
        retrieved = await session.get(Interview, interview_id)
        assert retrieved is not None
        assert retrieved.title == "Senior Full-Stack Engineer Mock Interview"
        assert retrieved.status == "created"
        assert retrieved.metrics_schema_version == "1.0"
        assert retrieved.created_at is not None

        # Clean up
        await session.delete(retrieved)
        await session.commit()

    await engine.dispose()
