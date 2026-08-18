/**
 * APTLY — Universal Evidence Event Contracts
 *
 * Grounding all interview coaching, deterministic speech/delivery metrics,
 * and semantic insights into timestamped, verifiable evidence events.
 */

export type EvidenceEventType =
  | "filler"
  | "pause"
  | "pace_shift"
  | "camera_attention"
  | "voice_energy"
  | "unsupported_claim"
  | "star_gap"
  | "ownership_gap"
  | "consistency_issue"
  | "strong_evidence"
  | "challenge"
  | "pressure_event";

export type EvidenceSource =
  | "MEASURED"
  | "DERIVED"
  | "AI_EVALUATED"
  | "UNAVAILABLE";

export interface EvidenceEvent {
  id: string;
  session_id: string;
  turn_id: string;
  type: EvidenceEventType;
  start_ms: number;
  end_ms: number;
  severity: number; // 1 (minor) to 5 (critical)
  reliability: number; // 0.0 to 1.0
  title: string;
  explanation: string;
  payload: Record<string, any>;
  source: EvidenceSource;

  // Optional backward-compatibility convenience fields
  start_seconds?: number;
  end_seconds?: number;
  description?: string;
  quote?: string | null;
  question_number?: number;
}
