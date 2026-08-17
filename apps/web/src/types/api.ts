/**
 * APTLY — API Types (mirrors backend Pydantic schemas)
 */

export interface ServiceStatus {
  name: string;
  status: "ok" | "degraded" | "unavailable";
  latency_ms?: number | null;
  message?: string | null;
}

export interface HealthResponse {
  schema_version?: string;
  status: "ok" | "degraded" | "unavailable";
  app_name: string;
  app_version: string;
  environment: string;
  timestamp: string;
  services: ServiceStatus[];
  using_mock_providers: boolean;
}

export interface ErrorDetail {
  code: string;
  message: string;
  request_id: string;
  details?: Record<string, unknown> | null;
}

export interface ErrorResponse {
  error: ErrorDetail;
}

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

export interface ApiHealthCheck {
  isHealthy: boolean;
  lastChecked: Date;
}
