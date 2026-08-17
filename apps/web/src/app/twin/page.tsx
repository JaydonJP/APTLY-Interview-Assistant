"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { InterviewTwinDashboard } from "@/components/twin/InterviewTwinDashboard";
import { apiClient } from "@/lib/api-client";
import type { InterviewTwinProfile } from "@/types/twin";

export default function InterviewTwinPage() {
  const [twin, setTwin] = useState<InterviewTwinProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTwin() {
      try {
        const data = await apiClient.get<InterviewTwinProfile>("/api/v1/twin");
        if (!cancelled) setTwin(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Interview Twin coaching profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTwin();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="pb-16">
        {loading && <LoadingState size="lg" message="Synthesizing your longitudinal coaching history..." />}
        {error && (
          <ErrorState
            title="Could not load Interview Twin"
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}
        {!loading && !error && twin && <InterviewTwinDashboard twin={twin} />}
      </div>
    </AppShell>
  );
}
