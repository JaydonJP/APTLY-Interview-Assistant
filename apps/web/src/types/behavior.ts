/**
 * APTLY Types — Observable Visual Behavior & Delivery
 */

export interface ObservableBehaviorEvent {
  id?: string;
  interview_id?: string;
  question_id?: string | null;
  answer_id?: string | null;
  event_type: "LOOK_AWAY" | "MOVEMENT_SPIKE" | "FRAMING_POOR" | "FRAMING_GOOD" | "FACE_PRESENT" | "FACE_MISSING";
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  confidence: number;
  value?: number | null;
  metadata_json?: {
    yaw?: number;
    pitch?: number;
    roll?: number;
    variance?: number;
    framing?: string;
    [key: string]: any;
  };
  created_at?: string;
}

export interface BehaviorSnapshot {
  timestamp_ms: number;
  camera_attention: number;
  head_movement: number;
  face_present: boolean;
  framing_state: "CENTERED" | "TOO_LEFT" | "TOO_RIGHT" | "TOO_HIGH" | "TOO_LOW" | "TOO_CLOSE" | "TOO_FAR";
}

export interface QuestionHeatmapBlock {
  block_index: number;
  start_seconds: number;
  end_seconds: number;
  time_label: string;
  attention_level: "HIGH" | "MEDIUM" | "LOW";
  intensity_score: number;
  has_look_away: boolean;
  has_movement_spike: boolean;
  event_label: string;
}

export interface QuestionVisualInsight {
  sequence_number: number;
  question_id: string;
  question_text: string;
  competency: string;
  duration_seconds: number;
  camera_attention: number;
  content_score: number;
  look_away_count: number;
  movement_spikes: number;
  framing_consistency: number;
  observable_summary: string;
  heatmap_blocks?: QuestionHeatmapBlock[];
}

export interface VisualDeliveryHabit {
  habit_title: string;
  observable_evidence: string;
  timestamp_display: string;
  event_count: number;
  total_duration_seconds: number;
  impact_description: string;
  recommended_drill: string;
  drill_instructions: string;
}

export interface VisualDeliverySummary {
  interview_id: string;
  on_camera_presence_score: number;
  camera_attention_estimate: number;
  framing_consistency_score: number;
  face_visibility_score: number;
  movement_stability_score: number;
  look_away_count: number;
  look_away_total_seconds: number;
  movement_spike_count: number;
  poor_framing_count: number;
  trend_beginning_attention: number;
  trend_middle_attention: number;
  trend_end_attention: number;
  trend_observation: string;
  question_insights: QuestionVisualInsight[];
  top_habits: VisualDeliveryHabit[];
  events: ObservableBehaviorEvent[];
}
