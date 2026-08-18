"""Phase 2: Content Metrics Table

Revision ID: 003_phase2_content_metrics
Revises: 002_phase1_engine
Create Date: 2026-08-17 20:45:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003_phase2_content_metrics"
down_revision: Union[str, None] = "002_phase1_engine"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content_metrics",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("answer_id", sa.Uuid(), nullable=False),
        sa.Column("question_type", sa.String(length=50), nullable=False, server_default="technical"),
        sa.Column("relevance_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("technical_depth_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("completeness_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("structure_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("evidence_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("overall_content_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("strengths_json", postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"), nullable=False),
        sa.Column("weaknesses_json", postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"), nullable=False),
        sa.Column("star_analysis_json", postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"), nullable=True),
        sa.Column("claims_json", postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"), nullable=False),
        sa.Column("evidence_json", postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"), nullable=False),
        sa.Column("feedback_json", postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"), nullable=False),
        sa.Column("practice_drills_json", postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"), nullable=False),
        sa.Column("reasoning_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="mock"),
        sa.Column("model", sa.String(length=100), nullable=False, server_default="gpt-4o-mini"),
        sa.Column("prompt_version", sa.String(length=50), nullable=False, server_default="content-v1.0"),
        sa.Column("schema_version", sa.String(length=20), nullable=False, server_default="1.0"),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("answer_id"),
    )
    op.create_index(op.f("ix_content_metrics_answer_id"), "content_metrics", ["answer_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_content_metrics_answer_id"), table_name="content_metrics")
    op.drop_table("content_metrics")
