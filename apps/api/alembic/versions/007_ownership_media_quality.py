"""Complete ownership, media, and transcript quality columns."""

from collections.abc import Sequence

from alembic import op

revision: str = "007_ownership_media_quality"
down_revision: str | None = "006_vision_metrics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    statements = (
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)",
        "CREATE INDEX IF NOT EXISTS ix_jobs_user_id ON jobs (user_id)",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)",
        "CREATE INDEX IF NOT EXISTS ix_interviews_user_id ON interviews (user_id)",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS interviewer_persona VARCHAR(50)",
        "ALTER TABLE answers ADD COLUMN IF NOT EXISTS video_storage_key VARCHAR(500)",
        "ALTER TABLE answers ADD COLUMN IF NOT EXISTS video_size_bytes INTEGER",
        "ALTER TABLE answers ADD COLUMN IF NOT EXISTS video_checksum_sha256 VARCHAR(64)",
        "ALTER TABLE answers ADD COLUMN IF NOT EXISTS media_content_type VARCHAR(100)",
        "ALTER TABLE answers ADD COLUMN IF NOT EXISTS media_has_video BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS quality_score FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS provider_confidence FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS source_agreement_score FLOAT",
        "ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS quality_label VARCHAR(20) NOT NULL DEFAULT 'low'",
        "ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS quality_notes TEXT NOT NULL DEFAULT ''",
    )
    for statement in statements:
        op.execute(statement)


def downgrade() -> None:
    statements = (
        "ALTER TABLE transcripts DROP COLUMN IF EXISTS quality_notes",
        "ALTER TABLE transcripts DROP COLUMN IF EXISTS quality_label",
        "ALTER TABLE transcripts DROP COLUMN IF EXISTS source_agreement_score",
        "ALTER TABLE transcripts DROP COLUMN IF EXISTS provider_confidence",
        "ALTER TABLE transcripts DROP COLUMN IF EXISTS quality_score",
        "ALTER TABLE answers DROP COLUMN IF EXISTS media_has_video",
        "ALTER TABLE answers DROP COLUMN IF EXISTS media_content_type",
        "ALTER TABLE answers DROP COLUMN IF EXISTS video_checksum_sha256",
        "ALTER TABLE answers DROP COLUMN IF EXISTS video_size_bytes",
        "ALTER TABLE answers DROP COLUMN IF EXISTS video_storage_key",
        "ALTER TABLE questions DROP COLUMN IF EXISTS interviewer_persona",
        "ALTER TABLE interviews DROP COLUMN IF EXISTS user_id",
        "ALTER TABLE jobs DROP COLUMN IF EXISTS user_id",
    )
    for statement in statements:
        op.execute(statement)
