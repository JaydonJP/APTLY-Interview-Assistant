"""
APTLY API — Job & RoleProfile Models
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.interview import Interview


class Job(UUIDMixin, TimestampMixin, Base):
    """
    Represents an ingested job posting / raw job description.
    """

    __tablename__ = "jobs"

    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    role_profile: Mapped[RoleProfile | None] = relationship(
        "RoleProfile",
        back_populates="job",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    interviews: Mapped[list[Interview]] = relationship(
        "Interview",
        back_populates="job",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title}>"


class RoleProfile(UUIDMixin, TimestampMixin, Base):
    """
    Structured extraction from a Job Description.
    """

    __tablename__ = "role_profiles"

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    role_title: Mapped[str] = mapped_column(String(255), nullable=False)
    seniority: Mapped[str] = mapped_column(String(50), nullable=False, default="Mid-Level")
    domain: Mapped[str] = mapped_column(String(100), nullable=False, default="Software Engineering")

    # Structured JSON arrays
    technical_skills: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    tools: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    responsibilities: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    behavioral_competencies: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    interview_topics: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    preferred_experience: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    # Metadata & versioning
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1")
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")

    # Relationships
    job: Mapped[Job] = relationship("Job", back_populates="role_profile", lazy="selectin")

    def __repr__(self) -> str:
        return f"<RoleProfile id={self.id} role={self.role_title} seniority={self.seniority}>"
