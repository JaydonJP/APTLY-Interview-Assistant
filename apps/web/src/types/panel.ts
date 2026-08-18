/**
 * APTLY — Panel Mode Types
 *
 * Defines the dual-interviewer personas (Sarah Chen & Alex Rivera)
 * and dual-perspective evaluation scorecards.
 */

export type InterviewerPersona = "HR_LEAD" | "TECH_LEAD";

export interface PersonaProfile {
  id: InterviewerPersona;
  name: string;
  role_title: string;
  focus_areas: string[];
  avatar_accent: string;
}

export const PERSONA_PROFILES: Record<InterviewerPersona, PersonaProfile> = {
  HR_LEAD: {
    id: "HR_LEAD",
    name: "Sarah Chen",
    role_title: "HR Lead & People Partner",
    focus_areas: ["communication", "ownership", "teamwork", "conflict", "motivation"],
    avatar_accent: "border-violet-400 bg-violet-500/15 text-violet-200",
  },
  TECH_LEAD: {
    id: "TECH_LEAD",
    name: "Alex Rivera",
    role_title: "Staff Systems Architect & Tech Lead",
    focus_areas: ["architecture", "technical depth", "tradeoffs", "validation", "scale", "failure modes"],
    avatar_accent: "border-cyan-400 bg-cyan-500/15 text-cyan-200",
  },
};

export interface HRPerspectiveReport {
  overall_score: number;
  communication_score: number;
  ownership_score: number;
  teamwork_score: number;
  conflict_resolution_score: number;
  motivation_alignment: string;
  key_observations: string[];
  strengths: string[];
  growth_areas: string[];
}

export interface TechPerspectiveReport {
  overall_score: number;
  architecture_score: number;
  technical_depth_score: number;
  tradeoffs_rigor_score: number;
  validation_methodology_score: number;
  scale_and_failure_handling: string;
  key_observations: string[];
  strengths: string[];
  growth_areas: string[];
}

export type UnifiedHiringSignal = "STRONG_HIRE" | "HIRE" | "NEEDS_DEVELOPMENT" | string;

export interface PanelInterviewReport {
  is_panel_interview: boolean;
  hr_perspective: HRPerspectiveReport;
  tech_perspective: TechPerspectiveReport;
  combined_summary: string;
  unified_hiring_signal: UnifiedHiringSignal;
}
