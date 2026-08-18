"""Phase 3: Recording Reliability, Normalization & Adaptive Question Graph

Revision ID: 004_phase3_recording_and_gemini
Revises: 003_phase2_content_metrics
Create Date: 2026-08-17 21:05:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004_phase3_recording_and_gemini"
down_revision: Union[str, None] = "003_phase2_content_metrics"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update questions table
    op.add_column("questions", sa.Column("parent_question_id", sa.Uuid(), nullable=True))
    op.add_column("questions", sa.Column("root_question_id", sa.Uuid(), nullable=True))
    op.add_column("questions", sa.Column("question_source", sa.String(length=50), nullable=False, server_default="initial"))
    op.add_column("questions", sa.Column("follow_up_depth", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("questions", sa.Column("target_competency", sa.String(length=100), nullable=False, server_default=""))

    op.create_foreign_key("fk_questions_parent_id", "questions", "questions", ["parent_question_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_questions_root_id", "questions", "questions", ["root_question_id"], ["id"], ondelete="SET NULL")
    op.create_index(op.f("ix_questions_parent_question_id"), "questions", ["parent_question_id"])
    op.create_index(op.f("ix_questions_root_question_id"), "questions", ["root_question_id"])

    # 2. Update answers table
    op.add_column("answers", sa.Column("normalized_storage_key", sa.String(length=500), nullable=True))
    op.add_column("answers", sa.Column("recording_session_id", sa.String(length=100), nullable=True))
    op.add_column("answers", sa.Column("media_asset_id", sa.String(length=100), nullable=True))
    op.add_column("answers", sa.Column("processing_status", sa.String(length=50), nullable=False, server_default="created"))
    op.add_column("answers", sa.Column("transcription_status", sa.String(length=50), nullable=False, server_default="pending"))

    op.create_index(op.f("ix_answers_recording_session_id"), "answers", ["recording_session_id"])
    op.create_index(op.f("ix_answers_media_asset_id"), "answers", ["media_asset_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_answers_media_asset_id"), table_name="answers")
    op.drop_index(op.f("ix_answers_recording_session_id"), table_name="answers")
    op.drop_column("answers", "transcription_status")
    op.drop_column("answers", "processing_status")
    op.drop_column("answers", "media_asset_id")
    op.drop_column("answers", "recording_session_id")
    op.drop_column("answers", "normalized_storage_key")

    op.drop_index(op.f("ix_questions_root_question_id"), table_name="questions")
    op.drop_index(op.f("ix_questions_parent_question_id"), table_name="questions")
    op.drop_constraint("fk_questions_root_id", "questions", type_="foreignkey")
    op.drop_constraint("fk_questions_parent_id", "questions", type_="foreignkey")
    op.drop_column("questions", "target_competency")
    op.drop_column("questions", "follow_up_depth")
    op.drop_column("questions", "question_source")
    op.drop_column("questions", "root_question_id")
    op.drop_column("questions", "parent_question_id")
