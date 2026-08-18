-- APTLY Supabase/PostgreSQL schema.
-- Apply with the service role or use Alembic for an existing database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_text TEXT NOT NULL,
    title VARCHAR(255),
    company VARCHAR(255),
    user_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    role_title VARCHAR(255) NOT NULL,
    seniority VARCHAR(50) NOT NULL DEFAULT 'Mid-Level',
    domain VARCHAR(100) NOT NULL DEFAULT 'Software Engineering',
    technical_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    behavioral_competencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    interview_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT '',
    user_id VARCHAR(255),
    learner_id VARCHAR(120) NOT NULL DEFAULT 'anonymous',
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    role_profile_id UUID REFERENCES role_profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    interview_type VARCHAR(50) NOT NULL DEFAULT 'mixed',
    difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    target_duration_minutes INTEGER NOT NULL DEFAULT 10,
    current_question_index INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metrics_schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    evaluation_schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    scoring_algorithm_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(50) NOT NULL DEFAULT 'technical',
    question_type VARCHAR(50) NOT NULL DEFAULT 'concept',
    competency VARCHAR(100) NOT NULL DEFAULT 'General',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
    question_text TEXT NOT NULL,
    expected_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    parent_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    root_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    question_source VARCHAR(50) NOT NULL DEFAULT 'initial',
    follow_up_depth INTEGER NOT NULL DEFAULT 0,
    target_competency VARCHAR(100) NOT NULL DEFAULT '',
    interviewer_persona VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    audio_storage_key VARCHAR(500),
    video_storage_key VARCHAR(500),
    normalized_storage_key VARCHAR(500),
    audio_size_bytes INTEGER,
    video_size_bytes INTEGER,
    audio_checksum_sha256 VARCHAR(64),
    video_checksum_sha256 VARCHAR(64),
    media_content_type VARCHAR(100),
    media_has_video BOOLEAN NOT NULL DEFAULT FALSE,
    recording_session_id VARCHAR(100),
    media_asset_id VARCHAR(100),
    processing_status VARCHAR(50) NOT NULL DEFAULT 'created',
    transcription_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
    full_text TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    language VARCHAR(20) NOT NULL DEFAULT 'en',
    segments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_provider VARCHAR(50) NOT NULL DEFAULT 'mock',
    model_version VARCHAR(100) NOT NULL DEFAULT 'mock-v1.0',
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    provider_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    source_agreement_score DOUBLE PRECISION,
    quality_label VARCHAR(20) NOT NULL DEFAULT 'low',
    quality_notes TEXT NOT NULL DEFAULT '',
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS speech_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    wpm DOUBLE PRECISION NOT NULL DEFAULT 0,
    speaking_duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_words INTEGER NOT NULL DEFAULT 0,
    filler_count INTEGER NOT NULL DEFAULT 0,
    filler_density DOUBLE PRECISION NOT NULL DEFAULT 0,
    filler_words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    pause_count INTEGER NOT NULL DEFAULT 0,
    total_pause_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    pauses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL DEFAULT 'technical',
    relevance_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    technical_depth_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    completeness_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    structure_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    evidence_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    overall_content_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    correctness_status VARCHAR(40) NOT NULL DEFAULT 'not_enough_evidence',
    correctness_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    correctness_summary TEXT NOT NULL DEFAULT '',
    topic_coverage_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    ideal_answer_outline_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    strengths_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    weaknesses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    star_analysis_json JSONB,
    claims_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    feedback_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    practice_drills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    reasoning_summary TEXT NOT NULL DEFAULT '',
    provider VARCHAR(50) NOT NULL DEFAULT 'mock',
    model VARCHAR(100) NOT NULL DEFAULT 'mock',
    prompt_version VARCHAR(50) NOT NULL DEFAULT 'content-v1.0',
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vision_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'browser',
    model_version VARCHAR(100) NOT NULL DEFAULT 'unavailable',
    capability_status VARCHAR(50) NOT NULL DEFAULT 'unavailable',
    frame_count INTEGER NOT NULL DEFAULT 0,
    valid_frame_count INTEGER NOT NULL DEFAULT 0,
    analysis_duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    face_detected_ratio DOUBLE PRECISION,
    multiple_people_ratio DOUBLE PRECISION,
    eye_contact_ratio DOUBLE PRECISION,
    face_centering_score DOUBLE PRECISION,
    tracking_confidence DOUBLE PRECISION,
    visual_communication_score DOUBLE PRECISION,
    expression_signal VARCHAR(50) NOT NULL DEFAULT 'unavailable',
    expression_confidence DOUBLE PRECISION,
    face_presence_events_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    strengths_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    improvements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    turn_number INTEGER NOT NULL DEFAULT 1,
    memory_type VARCHAR(50) NOT NULL,
    entity_key VARCHAR(255) NOT NULL,
    entity_value VARCHAR(2048) NOT NULL,
    quote VARCHAR(2048),
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_name VARCHAR(180) NOT NULL UNIQUE,
    display_name VARCHAR(180) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'general',
    answer_count INTEGER NOT NULL DEFAULT 0,
    average_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    mastery_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_topic_id UUID NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
    target_topic_id UUID NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
    edge_type VARCHAR(50) NOT NULL DEFAULT 'co_occurs',
    weight INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_topic_id, target_topic_id, edge_type)
);

CREATE TABLE IF NOT EXISTS learner_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id VARCHAR(120) NOT NULL,
    topic_id UUID NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
    attempts INTEGER NOT NULL DEFAULT 0,
    correct_attempts INTEGER NOT NULL DEFAULT 0,
    average_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    mastery_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
    last_answer_id UUID REFERENCES answers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (learner_id, topic_id)
);

CREATE INDEX IF NOT EXISTS ix_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS ix_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS ix_interviews_learner_id ON interviews(learner_id);
CREATE INDEX IF NOT EXISTS ix_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS ix_answers_interview_id ON answers(interview_id);
CREATE INDEX IF NOT EXISTS ix_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS ix_session_memories_interview_id ON session_memories(interview_id);
CREATE INDEX IF NOT EXISTS ix_learner_topic_progress_learner_id ON learner_topic_progress(learner_id);

-- Supabase is a private persistence layer. The API uses the service role for
-- migrations and storage; direct client reads/writes are owner-scoped.
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE speech_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_topic_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_owner_policy ON jobs;
CREATE POLICY jobs_owner_policy ON jobs FOR ALL
    USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
DROP POLICY IF EXISTS interviews_owner_policy ON interviews;
CREATE POLICY interviews_owner_policy ON interviews FOR ALL
    USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
DROP POLICY IF EXISTS role_profiles_owner_policy ON role_profiles;
CREATE POLICY role_profiles_owner_policy ON role_profiles FOR ALL USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = role_profiles.job_id AND jobs.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS questions_owner_policy ON questions;
CREATE POLICY questions_owner_policy ON questions FOR ALL USING (EXISTS (
    SELECT 1 FROM interviews WHERE interviews.id = questions.interview_id AND interviews.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS answers_owner_policy ON answers;
CREATE POLICY answers_owner_policy ON answers FOR ALL USING (EXISTS (
    SELECT 1 FROM interviews WHERE interviews.id = answers.interview_id AND interviews.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS transcripts_owner_policy ON transcripts;
CREATE POLICY transcripts_owner_policy ON transcripts FOR ALL USING (EXISTS (
    SELECT 1 FROM answers JOIN interviews ON interviews.id = answers.interview_id
    WHERE answers.id = transcripts.answer_id AND interviews.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS speech_metrics_owner_policy ON speech_metrics;
CREATE POLICY speech_metrics_owner_policy ON speech_metrics FOR ALL USING (EXISTS (
    SELECT 1 FROM answers JOIN interviews ON interviews.id = answers.interview_id
    WHERE answers.id = speech_metrics.answer_id AND interviews.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS content_metrics_owner_policy ON content_metrics;
CREATE POLICY content_metrics_owner_policy ON content_metrics FOR ALL USING (EXISTS (
    SELECT 1 FROM answers JOIN interviews ON interviews.id = answers.interview_id
    WHERE answers.id = content_metrics.answer_id AND interviews.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS vision_metrics_owner_policy ON vision_metrics;
CREATE POLICY vision_metrics_owner_policy ON vision_metrics FOR ALL USING (EXISTS (
    SELECT 1 FROM answers JOIN interviews ON interviews.id = answers.interview_id
    WHERE answers.id = vision_metrics.answer_id AND interviews.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS session_memories_owner_policy ON session_memories;
CREATE POLICY session_memories_owner_policy ON session_memories FOR ALL USING (EXISTS (
    SELECT 1 FROM interviews WHERE interviews.id = session_memories.interview_id AND interviews.user_id = auth.uid()::text
));
DROP POLICY IF EXISTS learner_topic_progress_owner_policy ON learner_topic_progress;
CREATE POLICY learner_topic_progress_owner_policy ON learner_topic_progress FOR ALL
    USING (learner_id = auth.uid()::text) WITH CHECK (learner_id = auth.uid()::text);
