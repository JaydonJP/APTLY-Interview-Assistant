export interface SessionTrendPoint {
  session_id: string;
  session_number: number;
  session_date: string;
  title: string;
  overall_score: number;
  content_score: number;
  delivery_score: number;
  evidence_score: number;
  structure_score: number;
  filler_count: number;
  wpm: number;
}

export interface EvidenceDebtItem {
  category: string;
  frequency: number;
  sample_context?: string | null;
  coaching_recommendation: string;
}

export interface CompletedDrillRecord {
  drill_name: string;
  session_id: string;
  before_evidence: number;
  after_evidence: number;
  delta: number;
  verified_improvement: boolean;
  completed_at: string;
}

export interface InterviewTwinProfile {
  total_completed_sessions: number;
  has_sufficient_data: boolean;
  status_message: string;
  recurring_strengths: string[];
  recurring_weaknesses: string[];
  recurring_evidence_debt: EvidenceDebtItem[];
  completed_drills: CompletedDrillRecord[];
  session_history: SessionTrendPoint[];
  next_interview_focus_areas: string[];
  recommended_question_types: string[];
}
