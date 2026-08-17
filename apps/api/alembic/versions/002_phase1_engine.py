"""Phase 1: Job, RoleProfile, Question, Answer, Transcript, SpeechMetrics tables

Revision ID: 002_phase1_engine
Revises: 001_phase0_initial
Create Date: 2026-08-17 18:10:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_phase1_engine"
down_revision: Union[str, None] = "001_phase0_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create jobs table
    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("company", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2. Create role_profiles table
    op.create_table(
        "role_profiles",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("role_title", sa.String(255), nullable=False),
        sa.Column("seniority", sa.String(50), nullable=False, server_default="Mid-Level"),
        sa.Column("domain", sa.String(100), nullable=False, server_default="Software Engineering"),
        sa.Column("technical_skills", sa.JSON(), nullable=False),
        sa.Column("tools", sa.JSON(), nullable=False),
        sa.Column("responsibilities", sa.JSON(), nullable=False),
        sa.Column("behavioral_competencies", sa.JSON(), nullable=False),
        sa.Column("interview_topics", sa.JSON(), nullable=False),
        sa.Column("preferred_experience", sa.JSON(), nullable=False),
        sa.Column("prompt_version", sa.String(50), nullable=False, server_default="v1"),
        sa.Column("schema_version", sa.String(20), nullable=False, server_default="1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
    )
    op.create_index(op.f("ix_role_profiles_job_id"), "role_profiles", ["job_id"], unique=True)

    # 3. Add columns to interviews table
    op.add_column("interviews", sa.Column("job_id", sa.Uuid(), nullable=True))
    op.add_column("interviews", sa.Column("role_profile_id", sa.Uuid(), nullable=True))
    op.add_column("interviews", sa.Column("interview_type", sa.String(50), server_default="mixed", nullable=False))
    op.add_column("interviews", sa.Column("difficulty_level", sa.String(20), server_default="medium", nullable=False))
    op.add_column("interviews", sa.Column("target_duration_minutes", sa.Integer(), server_default="10", nullable=False))
    op.add_column("interviews", sa.Column("current_question_index", sa.Integer(), server_default="0", nullable=False))
    op.add_column("interviews", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("interviews", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("interviews", sa.Column("scoring_algorithm_version", sa.String(20), server_default="1.0", nullable=False))
    op.create_foreign_key("fk_interviews_job_id", "interviews", "jobs", ["job_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_interviews_role_profile_id", "interviews", "role_profiles", ["role_profile_id"], ["id"], ondelete="SET NULL")

    # 4. Create questions table
    op.create_table(
        "questions",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("interview_id", sa.Uuid(), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("category", sa.String(50), nullable=False, server_default="technical"),
        sa.Column("question_type", sa.String(50), nullable=False, server_default="concept"),
        sa.Column("competency", sa.String(100), nullable=False, server_default="General"),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("expected_topics", sa.JSON(), nullable=False),
        sa.Column("prompt_version", sa.String(50), nullable=False, server_default="v1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interview_id"], ["interviews.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questions_interview_id"), "questions", ["interview_id"], unique=False)

    # 5. Create answers table
    op.create_table(
        "answers",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("interview_id", sa.Uuid(), nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(50), nullable=False, server_default="created"),
        sa.Column("duration_seconds", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("audio_storage_key", sa.String(500), nullable=True),
        sa.Column("audio_size_bytes", sa.Integer(), nullable=True),
        sa.Column("audio_checksum_sha256", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interview_id"], ["interviews.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_answers_interview_id"), "answers", ["interview_id"], unique=False)
    op.create_index(op.f("ix_answers_question_id"), "answers", ["question_id"], unique=False)

    # 6. Create transcripts table
    op.create_table(
        "transcripts",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("answer_id", sa.Uuid(), nullable=False),
        sa.Column("full_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("word_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("language", sa.String(20), nullable=False, server_default="en"),
        sa.Column("segments_json", sa.JSON(), nullable=False),
        sa.Column("words_json", sa.JSON(), nullable=False),
        sa.Column("model_provider", sa.String(50), nullable=False, server_default="mock"),
        sa.Column("model_version", sa.String(100), nullable=False, server_default="mock-v1.0"),
        sa.Column("schema_version", sa.String(20), nullable=False, server_default="1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("answer_id"),
    )
    op.create_index(op.f("ix_transcripts_answer_id"), "transcripts", ["answer_id"], unique=True)

    # 7. Create speech_metrics table
    op.create_table(
        "speech_metrics",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("answer_id", sa.Uuid(), nullable=False),
        sa.Column("schema_version", sa.String(20), nullable=False, server_default="1.0"),
        sa.Column("wpm", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("speaking_duration_seconds", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total_words", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("filler_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("filler_density", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("filler_words_json", sa.JSON(), nullable=False),
        sa.Column("pause_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_pause_seconds", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("pauses_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("answer_id"),
    )
    op.create_index(op.f("ix_speech_metrics_answer_id"), "speech_metrics", ["answer_id"], unique=True)


def downgrade() -> None:
    op.drop_table("speech_metrics")
    op.drop_table("transcripts")
    op.drop_table("answers")
    op.drop_table("questions")
    op.drop_constraint("fk_interviews_role_profile_id", "interviews", type_="foreignkey")
    op.drop_constraint("fk_interviews_job_id", "interviews", type_="foreignkey")
    op.drop_column("interviews", "scoring_algorithm_version")
    op.drop_column("interviews", "completed_at")
    op.drop_column("interviews", "started_at")
    op.drop_column("interviews", "current_question_index")
    op.drop_column("interviews", "target_duration_minutes")
    op.drop_column("interviews", "difficulty_level")
    op.drop_column("interviews", "interview_type")
    op.drop_column("interviews", "role_profile_id")
    op.drop_column("interviews", "job_id")
    op.drop_table("role_profiles")
    op.drop_table("jobs")
