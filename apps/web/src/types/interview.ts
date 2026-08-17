/**
 * APTLY — Complete Phase 1 Interview Types & Schemas
 */

export type InterviewStatus =
  | "created"
  | "ready"
  | "running"
  | "question_active"
  | "answering"
  | "answer_submitted"
  | "processing"
  | "next_question"
  | "completing"
  | "completed"
  | "failed";

export interface RoleProfile {
  id: string;
  job_id: string;
  role_title: string;
  seniority: string;
  domain: string;
  technical_skills: string[];
  tools: string[];
  responsibilities: string[];
  behavioral_competencies: string[];
  interview_topics: string[];
  preferred_experience: string[];
  prompt_version: string;
  created_at: string;
}

export interface Job {
  id: string;
  title: string | null;
  company: string | null;
  raw_text: string;
  role_profile?: RoleProfile;
  created_at: string;
}

export interface Question {
  id: string;
  interview_id: string;
  sequence_number: number;
  category: "technical" | "behavioral" | "situational" | string;
  question_type: string;
  competency: string;
  difficulty: "easy" | "medium" | "hard" | string;
  question_text: string;
  expected_topics: string[];
  prompt_version: string;
}

export interface FillerOccurrence {
  word: string;
  timestamp_seconds: number;
  duration_seconds: number;
}

export interface PauseOccurrence {
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
}

export interface SpeechMetrics {
  id: string;
  answer_id: string;
  wpm: number;
  speaking_duration_seconds: number;
  total_words: number;
  filler_count: number;
  filler_density: number;
  filler_words: FillerOccurrence[];
  pause_count: number;
  total_pause_seconds: number;
  pauses: PauseOccurrence[];
  created_at: string;
}

export interface TranscriptWord {
  word: string;
  start_seconds: number;
  end_seconds: number;
  confidence?: number;
}

export interface Transcript {
  id: string;
  answer_id: string;
  full_text: string;
  word_count: number;
  language: string;
  segments: unknown[];
  words: TranscriptWord[];
  model_provider: string;
  model_version: string;
  created_at: string;
}

export interface Answer {
  id: string;
  interview_id: string;
  question_id: string;
  sequence_number: number;
  status: string;
  duration_seconds: number;
  started_at?: string | null;
  ended_at?: string | null;
  audio_storage_key?: string | null;
  audio_size_bytes?: number | null;
  transcript?: Transcript | null;
  speech_metrics?: SpeechMetrics | null;
  created_at: string;
}

export interface InterviewDetail {
  id: string;
  title: string;
  status: InterviewStatus;
  interview_type: string;
  difficulty_level: string;
  target_duration_minutes: number;
  current_question_index: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  role_profile?: RoleProfile | null;
  questions: Question[];
  answers: Answer[];
}

export interface QuestionReviewItem {
  question: Question;
  answer?: Answer | null;
  transcript?: Transcript | null;
  speech_metrics?: SpeechMetrics | null;
}

export interface InterviewReview {
  interview: {
    id: string;
    title: string;
    status: InterviewStatus;
    interview_type: string;
    difficulty_level: string;
    target_duration_minutes: number;
    current_question_index: number;
    started_at?: string | null;
    completed_at?: string | null;
    created_at: string;
  };
  role_profile?: RoleProfile | null;
  total_duration_seconds: number;
  total_answers_count: number;
  average_wpm: number;
  total_fillers_count: number;
  overall_filler_density: number;
  total_pauses_count: number;
  questions_review: QuestionReviewItem[];
}
