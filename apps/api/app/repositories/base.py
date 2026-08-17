"""
APTLY API — Generic Repository Base

Provides a typed, reusable base for all SQLAlchemy 2.x repository classes.

Design:
- Repositories are the ONLY layer that interacts with the database
- Business logic lives in services, not repositories
- Route handlers call services, not repositories directly
- All IDs are UUIDs generated server-side

Usage (Phase 1+):
    class InterviewRepository(BaseRepository[Interview]):
        def __init__(self, db: AsyncSession) -> None:
            super().__init__(db, Interview)

        async def get_active_by_user(self, user_id: UUID) -> list[Interview]:
            stmt = select(Interview).where(
                Interview.user_id == user_id,
                Interview.status == "active",
                Interview.deleted_at.is_(None),
            )
            result = await self._db.execute(stmt)
            return list(result.scalars().all())
"""

from __future__ import annotations

from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """
    Generic async repository for SQLAlchemy 2.x ORM models.

    Provides standard CRUD operations.
    Subclass and add domain-specific query methods.
    """

    def __init__(self, db: AsyncSession, model: type[ModelT]) -> None:
        self._db = db
        self._model = model

    async def get(self, id: UUID) -> ModelT | None:
        """Return a record by primary key, or None if not found."""
        return await self._db.get(self._model, id)

    async def list(
        self,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ModelT]:
        """Return a paginated list of records."""
        stmt = select(self._model).limit(limit).offset(offset)
        result = await self._db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, instance: ModelT) -> ModelT:
        """Persist a new record and return it."""
        self._db.add(instance)
        await self._db.flush()  # Get ID without committing
        await self._db.refresh(instance)
        return instance

    async def update(self, instance: ModelT) -> ModelT:
        """Merge changes and return the updated record."""
        merged = await self._db.merge(instance)
        await self._db.flush()
        await self._db.refresh(merged)
        return merged

    async def delete(self, instance: ModelT) -> None:
        """Hard-delete a record. Prefer soft-delete for domain entities."""
        await self._db.delete(instance)
        await self._db.flush()

    async def count(self) -> int:
        """Return the total count of records."""
        from sqlalchemy import func

        stmt = select(func.count()).select_from(self._model)
        result = await self._db.execute(stmt)
        return result.scalar_one()
