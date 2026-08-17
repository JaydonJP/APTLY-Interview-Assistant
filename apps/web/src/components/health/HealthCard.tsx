/**
 * APTLY — System Health Dashboard Card
 */

"use client";

import { useHealthCheck } from "@/hooks/useHealthCheck";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
  }
  if (status === "degraded") {
    return <AlertCircle className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
  }
  return <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
}

export function HealthCard() {
  const { data, isLoading, isError, refetch } = useHealthCheck();

  if (isLoading) {
    return (
      <Card>
        <LoadingState size="sm" message="Checking system health..." />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <ErrorState
          title="Could not reach API"
          message="Make sure the backend server is running on port 8000."
          onRetry={() => void refetch()}
        />
      </Card>
    );
  }

  return (
    <Card id="system-health-card">
      <CardHeader
        title="System Health"
        description={`Version ${data?.app_version ?? "—"} · ${data?.environment ?? "—"}`}
      />

      {/* Overall status */}
      <div className="flex items-center gap-2 mb-4">
        <StatusIcon status={data?.status ?? "unavailable"} />
        <span
          className={cn(
            "text-sm font-medium",
            data?.status === "ok"
              ? "text-emerald-300"
              : data?.status === "degraded"
                ? "text-amber-300"
                : "text-red-300",
          )}
        >
          {data?.status === "ok"
            ? "All systems operational"
            : data?.status === "degraded"
              ? "Degraded performance"
              : "System unavailable"}
        </span>
      </div>

      {/* Mock provider warning */}
      {data?.using_mock_providers && (
        <div
          className="mb-4 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200"
          role="alert"
          id="mock-provider-warning"
        >
          ⚠ Mock AI providers active — no real LLM/TTS/transcription calls
        </div>
      )}

      {/* Service list */}
      {data?.services && data.services.length > 0 && (
        <ul className="space-y-2" aria-label="Service statuses">
          {data.services.map((service) => (
            <li
              key={service.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <StatusIcon status={service.status} />
                <span className="text-slate-300">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {service.latency_ms != null && (
                  <span className="text-slate-400 text-xs">
                    {service.latency_ms}ms
                  </span>
                )}
                {service.message && (
                  <span className="text-slate-400 text-xs">
                    ({service.message})
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Last checked */}
      {data?.timestamp && (
        <p className="mt-4 text-xs text-slate-400">
          Last checked: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      )}
    </Card>
  );
}
