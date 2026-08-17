/**
 * APTLY — Shared Type Contracts
 *
 * Contains non-HTTP contracts and protocols:
 * - Realtime WebSocket event schemas (with protocol_version, sequence_number, session_id, event_id)
 * - Domain events and status enums
 * - Media lifecycle states
 * - Data classification constants
 */

export const REALTIME_PROTOCOL_VERSION = "1.0" as const;

// ── Media Lifecycle & Privacy ─────────────────────────────────────────────────

export type DataClass =
  | "raw_video"
  | "raw_audio"
  | "transcripts"
  | "speech_metrics"
  | "vision_metrics"
  | "content_evaluation"
  | "delivery_evaluation"
  | "coaching_feedback"
  | "reports"
  | "progress_data"
  | "other";

export type MediaProcessingStatus =
  | "uploading"
  | "uploaded"
  | "processing"
  | "processed"
  | "failed"
  | "retrying"
  | "deleted";

export type ProcessingState =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retrying";

// ── WebSocket Protocol Contracts ──────────────────────────────────────────────

export interface WebSocketEnvelope<T = Record<string, unknown>> {
  type: string;
  protocol_version: typeof REALTIME_PROTOCOL_VERSION;
  event_id: string;
  session_id: string;
  sequence_number: number;
  timestamp: string;
  payload?: T;
}

// Heartbeat & Reconnect
export interface PingMessage extends WebSocketEnvelope {
  type: "heartbeat.ping";
}

export interface PongMessage extends WebSocketEnvelope {
  type: "heartbeat.pong";
}

export interface SessionReconnectRequest extends WebSocketEnvelope {
  type: "session.reconnect";
  last_received_sequence: number;
}

// Client -> Server
export interface SessionStartEvent extends WebSocketEnvelope {
  type: "session.start";
  interview_id: string;
}

export interface CandidateSpeakingEvent extends WebSocketEnvelope {
  type: "candidate.speaking";
  answer_id: string;
}

export interface CandidateStoppedEvent extends WebSocketEnvelope {
  type: "candidate.stopped";
  answer_id: string;
  duration_seconds: number;
}

export interface SessionPauseEvent extends WebSocketEnvelope {
  type: "session.pause";
  reason?: string;
}

export interface SessionResumeEvent extends WebSocketEnvelope {
  type: "session.resume";
}

export interface SessionEndEvent extends WebSocketEnvelope {
  type: "session.end";
  reason?: string;
}

export type ClientEvent =
  | PingMessage
  | SessionReconnectRequest
  | SessionStartEvent
  | CandidateSpeakingEvent
  | CandidateStoppedEvent
  | SessionPauseEvent
  | SessionResumeEvent
  | SessionEndEvent;

// Server -> Client
export interface QuestionStartedEvent extends WebSocketEnvelope {
  type: "question.started";
  question_id: string;
  question_index: number;
  total_questions: number;
  time_limit_seconds: number | null;
}

export interface QuestionEndedEvent extends WebSocketEnvelope {
  type: "question.ended";
  question_id: string;
  reason: "time_expired" | "candidate_finished";
}

export interface InterviewerSpeakingEvent extends WebSocketEnvelope {
  type: "interviewer.speaking";
  question_id: string;
  text: string;
  audio_url: string;
}

export interface InterviewerFinishedEvent extends WebSocketEnvelope {
  type: "interviewer.finished";
  question_id: string;
}

export interface ProcessingStartedEvent extends WebSocketEnvelope {
  type: "processing.started";
  answer_id: string;
  stages: string[];
}

export interface ProcessingCompletedEvent extends WebSocketEnvelope {
  type: "processing.completed";
  interview_id: string;
  report_url: string;
}

export interface RealtimeErrorEvent extends WebSocketEnvelope {
  type: "error";
  code: string;
  message: string;
  recoverable: boolean;
}

export type ServerEvent =
  | PongMessage
  | QuestionStartedEvent
  | QuestionEndedEvent
  | InterviewerSpeakingEvent
  | InterviewerFinishedEvent
  | ProcessingStartedEvent
  | ProcessingCompletedEvent
  | RealtimeErrorEvent;
