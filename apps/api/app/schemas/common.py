"""
APTLY API — Common Pydantic Schemas

Base models and shared response types used across all API endpoints.

All structured objects include `schema_version` to support:
- Forward compatibility when schema shapes change
- Historical interview data remaining interpretable
- Audit trails for AI-generated outputs

Convention:
    schema_version = "1.0"  (MAJOR.MINOR)
    Increment MAJOR on breaking changes.
    Increment MINOR on additive changes.
    Never silently change a schema — always bump version.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ── Base Configuration ────────────────────────────────────────────────────────


class AptlyBaseModel(BaseModel):
    """
    Base model for all APTLY Pydantic schemas.

    - Forbids extra fields (strict mode for API contracts)
    - Uses camelCase aliases for JSON (frontend compatibility)
    - Immutable by default
    """

    model_config = ConfigDict(
        populate_by_name=True,  # Allow both snake_case and alias
        use_enum_values=True,
        str_strip_whitespace=True,
    )


# ── Versioned Base ────────────────────────────────────────────────────────────


class VersionedSchema(AptlyBaseModel):
    """
    Base for schemas that must be explicitly versioned.

    Used for:
    - AI evaluation outputs
    - Speech metrics
    - Vision metrics
    - Coaching feedback
    - Any output that will evolve over time

    Historical records must ALWAYS retain the version under which
    they were produced. Never overwrite old data when scoring changes.
    """

    schema_version: str = Field(
        default="1.0",
        description="Schema version. Increment when structure changes.",
        examples=["1.0", "1.1", "2.0"],
    )


# ── Health ────────────────────────────────────────────────────────────────────


class ServiceStatus(AptlyBaseModel):
    """Status of an individual downstream service."""

    name: str
    status: str  # "ok" | "degraded" | "unavailable"
    latency_ms: float | None = None
    message: str | None = None


class HealthResponse(AptlyBaseModel):
    """Response schema for health check endpoints."""

    status: str  # "ok" | "degraded" | "unavailable"
    app_name: str
    app_version: str
    environment: str
    timestamp: datetime
    services: list[ServiceStatus] = Field(default_factory=list)
    using_mock_providers: bool = False


# ── Error ─────────────────────────────────────────────────────────────────────


class ErrorDetail(AptlyBaseModel):
    """Standard error detail included in all error responses."""

    code: str = Field(description="Machine-readable error code")
    message: str = Field(description="Human-readable error message")
    request_id: str = Field(default="", description="Request trace ID")
    details: dict[str, Any] | None = Field(
        default=None,
        description="Optional structured error details (e.g., field validation errors)",
    )


class ErrorResponse(AptlyBaseModel):
    """Standard error envelope for all APTLY API errors."""

    error: ErrorDetail


# ── Pagination ────────────────────────────────────────────────────────────────

T = TypeVar("T")


class PaginatedResponse(AptlyBaseModel, Generic[T]):
    """Generic paginated list response."""

    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool

    @classmethod
    def from_items(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[T]:
        """Construct a PaginatedResponse from a list of items."""
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
            has_prev=page > 1,
        )


# ── Common Fields ─────────────────────────────────────────────────────────────


class TimestampedMixin(AptlyBaseModel):
    """Mixin for resources with created/updated timestamps."""

    created_at: datetime
    updated_at: datetime


class AuditedResource(TimestampedMixin):
    """Base for any domain resource with an ID and timestamps."""

    id: UUID
