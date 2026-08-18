"""Persist privacy-safe browser framing telemetry."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "006_vision_metrics"
down_revision: str | None = "005_analysis_progress_knowledge_graph"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _json_column() -> sa.types.TypeEngine:
    return postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "vision_metrics",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("answer_id", sa.String(length=36), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="browser"),
        sa.Column("model_version", sa.String(length=100), nullable=False, server_default="unavailable"),
        sa.Column("capability_status", sa.String(length=50), nullable=False, server_default="unavailable"),
        sa.Column("frame_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("valid_frame_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("analysis_duration_seconds", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("face_detected_ratio", sa.Float(), nullable=True),
        sa.Column("multiple_people_ratio", sa.Float(), nullable=True),
        sa.Column("eye_contact_ratio", sa.Float(), nullable=True),
        sa.Column("face_centering_score", sa.Float(), nullable=True),
        sa.Column("tracking_confidence", sa.Float(), nullable=True),
        sa.Column("visual_communication_score", sa.Float(), nullable=True),
        sa.Column("expression_signal", sa.String(length=50), nullable=False, server_default="unavailable"),
        sa.Column("expression_confidence", sa.Float(), nullable=True),
        sa.Column("face_presence_events_json", _json_column(), nullable=False, server_default="[]"),
        sa.Column("strengths_json", _json_column(), nullable=False, server_default="[]"),
        sa.Column("improvements_json", _json_column(), nullable=False, server_default="[]"),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("answer_id"),
    )
    op.create_index(op.f("ix_vision_metrics_id"), "vision_metrics", ["id"])
    op.create_index(op.f("ix_vision_metrics_answer_id"), "vision_metrics", ["answer_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_vision_metrics_answer_id"), table_name="vision_metrics")
    op.drop_index(op.f("ix_vision_metrics_id"), table_name="vision_metrics")
    op.drop_table("vision_metrics")
