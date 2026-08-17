"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { InterviewTwinDashboard } from "@/components/twin/InterviewTwinDashboard";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthContext";
import type { InterviewTwinProfile } from "@/types/twin";
import { LockKeyhole, LogIn } from "lucide-react";

export default function InterviewTwinPage() {
  const { user, openAuthModal } = useAuth();
  const [twin, setTwin] = useState<InterviewTwinProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTwin() {
      if (!user) {
        setTwin(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
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
  }, [user]);

  return (
    <AppShell>
      <div className="pb-16">
        {!user ? (
          <div className="mt-8 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#121824] via-[#0d121c] to-[#181126] p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300 border border-violet-400/30">
              <LockKeyhole className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
              Sign in to access your private Interview Twin coaching profile
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm leading-relaxed text-slate-300">
              Your AI Interview Twin aggregates your real session performance, evidence debt, and personalized focus areas securely for your account.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-400 hover:to-cyan-400 transition"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In to Access Interview Twin</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
              >
                <span>Create Free Account</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {loading && <LoadingState size="lg" message="Synthesizing your longitudinal coaching history..." />}
            {error && (
              <ErrorState
                title="Could not load Interview Twin"
                message={error}
                onRetry={() => window.location.reload()}
              />
            )}
            {!loading && !error && twin && <InterviewTwinDashboard twin={twin} />}
          </>
        )}
      </div>
    </AppShell>
  );
}
