/**
 * APTLY Web — Universal Evidence Event Types & Helpers
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
  severity: number; // 1 to 5
  reliability: number; // 0.0 to 1.0
  title: string;
  explanation: string;
  payload: Record<string, any>;
  source: EvidenceSource;

  // Backward compatibility aliases
  start_seconds?: number;
  end_seconds?: number;
  description?: string;
  quote?: string | null;
  question_number?: number;
}

export function formatEventTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}

export function getEventTypeBadge(type: EvidenceEventType): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case "filler":
      return {
        label: "Filler word",
        bg: "bg-amber-500/10",
        text: "text-amber-300",
        border: "border-amber-500/20",
      };
    case "pause":
      return {
        label: "Pause",
        bg: "bg-indigo-500/10",
        text: "text-indigo-300",
        border: "border-indigo-500/20",
      };
    case "pace_shift":
      return {
        label: "Pace shift",
        bg: "bg-cyan-500/10",
        text: "text-cyan-300",
        border: "border-cyan-500/20",
      };
    case "camera_attention":
      return {
        label: "Camera attention",
        bg: "bg-blue-500/10",
        text: "text-blue-300",
        border: "border-blue-500/20",
      };
    case "voice_energy":
      return {
        label: "Voice energy",
        bg: "bg-purple-500/10",
        text: "text-purple-300",
        border: "border-purple-500/20",
      };
    case "unsupported_claim":
      return {
        label: "Unsupported claim",
        bg: "bg-rose-500/10",
        text: "text-rose-300",
        border: "border-rose-500/20",
      };
    case "star_gap":
      return {
        label: "STAR gap",
        bg: "bg-orange-500/10",
        text: "text-orange-300",
        border: "border-orange-500/20",
      };
    case "ownership_gap":
      return {
        label: "Ownership gap",
        bg: "bg-yellow-500/10",
        text: "text-yellow-300",
        border: "border-yellow-500/20",
      };
    case "consistency_issue":
      return {
        label: "Consistency issue",
        bg: "bg-pink-500/10",
        text: "text-pink-300",
        border: "border-pink-500/20",
      };
    case "strong_evidence":
      return {
        label: "Strong evidence",
        bg: "bg-emerald-500/10",
        text: "text-emerald-300",
        border: "border-emerald-500/20",
      };
    case "challenge":
      return {
        label: "Challenge",
        bg: "bg-violet-500/10",
        text: "text-violet-300",
        border: "border-violet-500/20",
      };
    case "pressure_event":
      return {
        label: "Pressure event",
        bg: "bg-red-500/10",
        text: "text-red-300",
        border: "border-red-500/20",
      };
    default:
      return {
        label: type,
        bg: "bg-slate-500/10",
        text: "text-slate-300",
        border: "border-slate-500/20",
      };
  }
}

export function getSourceBadge(source: EvidenceSource): {
  label: string;
  bg: string;
  text: string;
} {
  switch (source) {
    case "MEASURED":
      return { label: "Measured", bg: "bg-emerald-500/15", text: "text-emerald-300" };
    case "DERIVED":
      return { label: "Derived", bg: "bg-cyan-500/15", text: "text-cyan-300" };
    case "AI_EVALUATED":
      return { label: "AI Evaluated", bg: "bg-violet-500/15", text: "text-violet-300" };
    case "UNAVAILABLE":
      return { label: "Unavailable", bg: "bg-slate-500/15", text: "text-slate-400" };
    default:
      return { label: source, bg: "bg-slate-500/15", text: "text-slate-400" };
  }
}
