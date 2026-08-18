"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { EvidenceRoom } from "@/components/evidence/EvidenceRoom";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { apiClient } from "@/lib/api-client";
import type { InterviewReview } from "@/types/interview";

export default function InterviewReviewPage() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id;
  const [review, setReview] = useState<InterviewReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReview() {
      try {
        const data = await apiClient.get<InterviewReview>(
          `/api/v1/interviews/${interviewId}/review`,
        );
        if (!cancelled) setReview(data);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The evidence report could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (interviewId) void loadReview();
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  if (loading) {
    return (
      <AppShell width="wide">
        <LoadingState
          size="lg"
          message="Aligning your recording, transcript, and evidence..."
        />
      </AppShell>
    );
  }

  if (error || !review) {
    return (
      <AppShell>
        <ErrorState
          title="Could not open the Evidence Room"
          message={error || "Review data is unavailable."}
          onRetry={() => window.location.reload()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell width="wide">
      <EvidenceRoom review={review} interviewId={interviewId} />
    </AppShell>
  );
}
