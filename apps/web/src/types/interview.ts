/**
 * APTLY — Interview Types
 */

export type InterviewStatus =
  | "created"
  | "configured"
  | "active"
  | "processing"
  | "completed"
  | "failed";

export interface Interview {
  id: string;
  title: string;
  status: InterviewStatus;
  metrics_schema_version: string;
  evaluation_schema_version: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewListItem {
  id: string;
  title: string;
  status: InterviewStatus;
  created_at: string;
  duration_seconds?: number;
  overall_score?: number;
}
