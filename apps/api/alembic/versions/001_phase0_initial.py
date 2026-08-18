"""Create interviews table

Revision ID: 001_phase0_initial
Revises:
Create Date: 2026-08-17
"""

from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001_phase0_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "interviews",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="created",
        ),
        sa.Column(
            "metrics_schema_version",
            sa.String(20),
            nullable=False,
            server_default="1.0",
        ),
        sa.Column(
            "evaluation_schema_version",
            sa.String(20),
            nullable=False,
            server_default="1.0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index("ix_interviews_status", "interviews", ["status"])
    op.create_index("ix_interviews_deleted_at", "interviews", ["deleted_at"])


def downgrade() -> None:
    op.drop_table("interviews")
