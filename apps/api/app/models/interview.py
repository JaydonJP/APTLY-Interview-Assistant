"""
APTLY API — Interview ORM Model (Phase 0 Stub)

This is a minimal scaffold. Full schema expansion happens in Phase 1+.

Future columns (documented here for migration planning):
- job_id: FK to Job table
- role_profile_id: FK to RoleProfile table
- status: enum (created|configured|active|processing|completed|failed)
- difficulty_level: int (1-5)
- question_count: int
- duration_seconds: int (actual recorded duration)
- metrics_schema_version: str (version of scoring used)
- evaluation_schema_version: str
- media_deleted_at: datetime (when raw media was purged)
- transcript_deleted_at: datetime
- report_generated_at: datetime
- interviewer_persona: str (for panel mode in future)
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin


class Interview(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    """
    Core interview entity.

    An Interview represents a single practice interview session.
    One user may have many interviews over time (progress tracking).

    Phase 0: Minimal columns only.
    Phase 1+: Will be expanded with FK relationships and full status tracking.
    """

    __tablename__ = "interviews"

    # Phase 0: Bare minimum for scaffold
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="created",
        index=True,
    )

    # Schema versioning — critical for analytics stability
    # When scoring algorithms change, old interviews retain their original version
    metrics_schema_version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="1.0",
    )
    evaluation_schema_version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="1.0",
    )

    def __repr__(self) -> str:
        return f"<Interview id={self.id} status={self.status}>"
