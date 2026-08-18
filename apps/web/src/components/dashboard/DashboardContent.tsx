"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  Play,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiClient } from "@/lib/api-client";
import type { InterviewDetail } from "@/types/interview";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function sessionDate(value?: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function DashboardContent() {
  const { user, openAuthModal } = useAuth();
  const [interviews, setInterviews] = useState<InterviewDetail[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInterviews() {
      if (!user) {
        setInterviews([]);
        setLoadingInterviews(false);
        return;
      }

      try {
        setLoadingInterviews(true);
        const data = await apiClient.get<InterviewDetail[]>("/api/v1/interviews");
        if (!cancelled) setInterviews(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load interviews:", error);
      } finally {
        if (!cancelled) setLoadingInterviews(false);
      }
    }

    void loadInterviews();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const completed = useMemo(
    () =>
      interviews.filter(
        (item) => item.status === "completed" || item.answers?.length > 0,
      ),
    [interviews],
  );
  const latest = interviews[0];
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0];
  const hasHistory = interviews.length > 0;

  return (
    <div className="space-y-14">
      <section className="grid min-h-[30rem] items-stretch gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="flex flex-col justify-center rounded-[2rem] border border-white/[0.075] bg-[#0d0f13] px-7 py-12 sm:px-12 lg:px-14">
          <p className="eyebrow">Practice</p>
          <h1 className="mt-5 max-w-2xl text-balance text-4xl font-medium leading-[1.05] tracking-[-0.045em] text-stone-100 sm:text-6xl">
            {greeting()}
            {firstName ? `, ${firstName}.` : "."}
            <span className="mt-2 block text-zinc-500">
              {hasHistory
                ? "Make the next answer count."
                : "Ready for your first rep?"}
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400">
            Practice against the role you want. APTLY challenges vague answers,
            links feedback to the recording, and gives you an immediate retry.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/interview/new"
              className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white"
            >
              Start interview
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="min-h-12 rounded-xl border border-white/10 px-5 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                Sign in to save progress
              </button>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.075] bg-[#0d0f13] p-7 sm:p-8">
          <div className="fine-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative flex h-full min-h-[24rem] flex-col justify-between">
            <div>
              <p className="eyebrow">The practice loop</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-zinc-500">
                Less generic coaching. More proof of exactly what changed.
              </p>
            </div>

            <ol className="space-y-2" aria-label="APTLY practice loop">
              {[
                ["01", "Challenge", "Adaptive follow-ups test the answer."],
                ["02", "Prove", "Every insight returns to a timestamp."],
                ["03", "Repair", "Retry the weak moment while it is fresh."],
              ].map(([number, title, description], index) => (
                <li
                  key={title}
                  className={`rounded-2xl border p-4 ${
                    index === 0
                      ? "border-violet-300/20 bg-violet-300/[0.07]"
                      : "border-white/[0.065] bg-white/[0.018]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-[0.68rem] text-zinc-600">
                      {number}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {hasHistory && latest && (
        <section
          aria-labelledby="current-priority-title"
          className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div className="rounded-[1.5rem] border border-white/[0.075] bg-[#101318] p-6 sm:p-7">
            <p className="eyebrow">Current priority</p>
            <h2
              id="current-priority-title"
              className="mt-4 text-xl font-medium tracking-[-0.02em] text-stone-100"
            >
              Review the evidence before your next rep.
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Your last session is ready to replay. Start with the moments the
              report links directly to your answer.
            </p>
            {latest.status === "completed" && (
              <Link
                href={`/interview/${latest.id}/review`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-300 transition hover:text-blue-200"
              >
                Open Evidence Room
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-white/[0.075] bg-[#101318] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Last session</p>
                <h2 className="mt-4 text-xl font-medium text-stone-100">
                  {latest.title || "Practice interview"}
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {sessionDate(latest.created_at)}
                  </span>
                  <span>{latest.answers?.length || 0} answers recorded</span>
                  <span className="capitalize">{latest.status}</span>
                </div>
              </div>
              <CircleCheck
                className="h-5 w-5 text-emerald-300"
                aria-hidden="true"
              />
            </div>
            <div className="mt-7 h-px bg-white/[0.07]" />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-600">
                {completed.length} completed{" "}
                {completed.length === 1 ? "session" : "sessions"}
              </p>
              <Link
                href={
                  latest.status === "completed"
                    ? `/interview/${latest.id}/review`
                    : `/interview/${latest.id}`
                }
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.04]"
              >
                {latest.status === "completed" ? (
                  <FileText className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {latest.status === "completed" ? "Review" : "Resume"}
              </Link>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="recent-sessions-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">History</p>
            <h2
              id="recent-sessions-title"
              className="mt-3 text-2xl font-medium tracking-[-0.03em] text-stone-100"
            >
              Recent sessions
            </h2>
          </div>
          {interviews.length > 4 && (
            <Link
              href="/history"
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/[0.075] bg-[#0d0f13]">
          {loadingInterviews ? (
            <div className="space-y-px" aria-label="Loading recent sessions">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-[5.5rem] animate-pulse border-b border-white/[0.055] bg-white/[0.02] last:border-0"
                />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
              <RotateCcw className="h-5 w-5 text-zinc-600" aria-hidden="true" />
              <p className="mt-4 text-sm font-medium text-zinc-300">
                Your practice history starts here.
              </p>
              <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-600">
                Complete an interview and its evidence-backed review will appear
                here.
              </p>
            </div>
          ) : (
            <div>
              {interviews.slice(0, 4).map((item) => {
                const isCompleted = item.status === "completed";
                return (
                  <Link
                    key={item.id}
                    href={
                      isCompleted
                        ? `/interview/${item.id}/review`
                        : `/interview/${item.id}`
                    }
                    className="group grid gap-3 border-b border-white/[0.055] px-5 py-4 transition last:border-0 hover:bg-white/[0.025] sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-white">
                        {item.title || "Practice interview"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-zinc-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3 w-3" />
                          {item.target_duration_minutes} min target
                        </span>
                        <span>{item.questions?.length || 0} questions</span>
                        <span>{sessionDate(item.created_at)}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 group-hover:text-zinc-200">
                      {isCompleted ? "Evidence" : "Resume"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
