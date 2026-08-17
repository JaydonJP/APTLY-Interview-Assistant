"""Analysis verdicts, learner identity, and persistent knowledge graph.

Revision ID: 005_analysis_progress_knowledge_graph
Revises: 004_phase3_recording_and_gemini
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005_analysis_progress_knowledge_graph"
down_revision: Union[str, None] = "004_phase3_recording_and_gemini"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _json_column() -> sa.types.TypeEngine:
    return postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.add_column(
        "interviews",
        sa.Column("learner_id", sa.String(length=120), nullable=False, server_default="anonymous"),
    )
    op.create_index(op.f("ix_interviews_learner_id"), "interviews", ["learner_id"])

    op.add_column(
        "content_metrics",
        sa.Column("correctness_status", sa.String(length=40), nullable=False, server_default="not_enough_evidence"),
    )
    op.add_column(
        "content_metrics",
        sa.Column("correctness_score", sa.Float(), nullable=False, server_default="0.0"),
    )
    op.add_column(
        "content_metrics",
        sa.Column("correctness_summary", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "content_metrics",
        sa.Column("topic_coverage_json", _json_column(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "content_metrics",
        sa.Column("ideal_answer_outline_json", _json_column(), nullable=False, server_default="[]"),
    )

    op.create_table(
        "knowledge_topics",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("normalized_name", sa.String(length=180), nullable=False),
        sa.Column("display_name", sa.String(length=180), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False, server_default="general"),
        sa.Column("answer_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("mastery_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("normalized_name"),
    )
    op.create_index(op.f("ix_knowledge_topics_id"), "knowledge_topics", ["id"])
    op.create_index(op.f("ix_knowledge_topics_normalized_name"), "knowledge_topics", ["normalized_name"])

    op.create_table(
        "knowledge_edges",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("source_topic_id", sa.String(length=36), nullable=False),
        sa.Column("target_topic_id", sa.String(length=36), nullable=False),
        sa.Column("edge_type", sa.String(length=50), nullable=False, server_default="co_occurs"),
        sa.Column("weight", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["source_topic_id"], ["knowledge_topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_topic_id"], ["knowledge_topics.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_topic_id", "target_topic_id", "edge_type", name="uq_knowledge_edge_pair"),
    )
    op.create_index(op.f("ix_knowledge_edges_id"), "knowledge_edges", ["id"])
    op.create_index(op.f("ix_knowledge_edges_source_topic_id"), "knowledge_edges", ["source_topic_id"])
    op.create_index(op.f("ix_knowledge_edges_target_topic_id"), "knowledge_edges", ["target_topic_id"])

    op.create_table(
        "learner_topic_progress",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("learner_id", sa.String(length=120), nullable=False),
        sa.Column("topic_id", sa.String(length=36), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("mastery_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("last_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("last_interview_id", sa.String(length=36), nullable=True),
        sa.Column("last_answer_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["topic_id"], ["knowledge_topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["last_interview_id"], ["interviews.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["last_answer_id"], ["answers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("learner_id", "topic_id", name="uq_learner_topic_progress"),
    )
    op.create_index(op.f("ix_learner_topic_progress_id"), "learner_topic_progress", ["id"])
    op.create_index(op.f("ix_learner_topic_progress_learner_id"), "learner_topic_progress", ["learner_id"])
    op.create_index(op.f("ix_learner_topic_progress_topic_id"), "learner_topic_progress", ["topic_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_learner_topic_progress_topic_id"), table_name="learner_topic_progress")
    op.drop_index(op.f("ix_learner_topic_progress_learner_id"), table_name="learner_topic_progress")
    op.drop_index(op.f("ix_learner_topic_progress_id"), table_name="learner_topic_progress")
    op.drop_table("learner_topic_progress")
    op.drop_index(op.f("ix_knowledge_edges_target_topic_id"), table_name="knowledge_edges")
    op.drop_index(op.f("ix_knowledge_edges_source_topic_id"), table_name="knowledge_edges")
    op.drop_index(op.f("ix_knowledge_edges_id"), table_name="knowledge_edges")
    op.drop_table("knowledge_edges")
    op.drop_index(op.f("ix_knowledge_topics_normalized_name"), table_name="knowledge_topics")
    op.drop_index(op.f("ix_knowledge_topics_id"), table_name="knowledge_topics")
    op.drop_table("knowledge_topics")
    op.drop_column("content_metrics", "ideal_answer_outline_json")
    op.drop_column("content_metrics", "topic_coverage_json")
    op.drop_column("content_metrics", "correctness_summary")
    op.drop_column("content_metrics", "correctness_score")
    op.drop_column("content_metrics", "correctness_status")
    op.drop_index(op.f("ix_interviews_learner_id"), table_name="interviews")
    op.drop_column("interviews", "learner_id")
