"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  LineChart,
  LockKeyhole,
  Target,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiClient } from "@/lib/api-client";
import type { Answer, InterviewDetail } from "@/types/interview";

interface SessionSignal {
  id: string;
  title: string;
  date: string;
  content: number | null;
  evidence: number | null;
  wpm: number | null;
  fillers: number | null;
  weakness: string | null;
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter(
    (value): value is number =>
      value != null && Number.isFinite(value) && value > 0,
  );
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function signalsFor(interview: InterviewDetail): SessionSignal {
  const answers: Answer[] = interview.answers || [];
  return {
    id: interview.id,
    title: interview.title || "Practice interview",
    date: interview.completed_at || interview.created_at,
    content: average(
      answers.map((answer) => answer.content_metrics?.overall_content_score),
    ),
    evidence: average(
      answers.map((answer) => answer.content_metrics?.evidence_score),
    ),
    wpm: average(answers.map((answer) => answer.speech_metrics?.wpm)),
    fillers:
      answers.length > 0
        ? answers.reduce(
            (sum, answer) => sum + (answer.speech_metrics?.filler_count || 0),
            0,
          )
        : null,
    weakness:
      answers
        .flatMap((answer) => answer.content_metrics?.weaknesses || [])
        .find(Boolean) || null,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function ProgressOverview() {
  const { user, openAuthModal } = useAuth();
  const [interviews, setInterviews] = useState<InterviewDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setInterviews([]);
        setLoading(false);
        return;
      }
      try {
        const data = await apiClient.get<InterviewDetail[]>("/api/v1/interviews");
        if (!cancelled) setInterviews(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sessions = useMemo(
    () =>
      interviews
        .filter(
          (interview) =>
            interview.status === "completed" || interview.answers?.length > 0,
        )
        .map(signalsFor)
        .reverse(),
    [interviews],
  );
  const latest = sessions.at(-1) || null;
  const previous = sessions.at(-2) || null;
  const contentDelta =
    latest?.content != null && previous?.content != null
      ? latest.content - previous.content
      : null;

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-zinc-600">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="mt-6 text-3xl font-medium tracking-[-0.04em] text-stone-100">
            Progress needs your saved sessions.
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Sign in to compare measured delivery signals and answer quality over time.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="mt-7 min-h-11 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">Progress</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] text-stone-100 sm:text-6xl">
          Fewer metrics. Clearer direction.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-500">
          A longitudinal view of signals APTLY can actually support with your recordings and evaluated answers.
        </p>
      </header>

      {loading ? (
        <div className="h-80 animate-pulse rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02]" />
      ) : sessions.length === 0 ? (
        <section className="flex min-h-80 flex-col items-center justify-center rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] p-8 text-center">
          <LineChart className="h-5 w-5 text-zinc-700" />
          <h2 className="mt-5 text-xl font-medium text-zinc-200">
            No reliable trend yet.
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-600">
            Complete your first interview to establish a real baseline.
          </p>
          <Link
            href="/interview/new"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950"
          >
            Start first rep <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] p-6 sm:p-7">
              <div className="flex items-center gap-2 text-zinc-600">
                <Target className="h-4 w-4" />
                <p className="eyebrow">Current priority</p>
              </div>
              <h2 className="mt-5 text-2xl font-medium leading-8 tracking-[-0.03em] text-stone-100">
                {latest?.weakness || "Repeat the last role with stronger evidence."}
              </h2>
              <p className="mt-4 text-xs leading-5 text-zinc-600">
                {latest?.weakness
                  ? "This comes from the latest evaluated answer, not a generic recommendation."
                  : "No reliable weakness label was returned for the latest session."}
              </p>
              <Link
                href={`/interview/${latest?.id}/review`}
                className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-violet-300 hover:text-violet-200"
              >
                Review latest evidence <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Latest session</p>
                  <h2 className="mt-4 text-xl font-medium text-zinc-200">
                    {latest?.title}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {latest ? formatDate(latest.date) : "Unavailable"}
                </span>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-4">
                <Signal label="Content" value={latest?.content} suffix="/100" />
                <Signal label="Evidence" value={latest?.evidence} suffix="/100" />
                <Signal label="Pace" value={latest?.wpm} suffix=" wpm" />
                <Signal label="Fillers" value={latest?.fillers} />
              </div>
              <p className="mt-4 text-xs text-zinc-600">
                {contentDelta == null
                  ? "A second scored session is needed for a comparable change."
                  : `Content quality ${contentDelta >= 0 ? "rose" : "fell"} ${Math.abs(Math.round(contentDelta))} points from the prior session.`}
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Session trend</p>
                <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-stone-100">
                  Quality over time
                </h2>
              </div>
              <p className="hidden text-xs text-zinc-700 sm:block">
                Content / Evidence
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13]">
              {sessions.slice(-8).map((session) => (
                <Link
                  key={session.id}
                  href={`/interview/${session.id}/review`}
                  className="grid gap-4 border-b border-white/[0.055] px-5 py-5 last:border-0 hover:bg-white/[0.02] sm:grid-cols-[12rem_1fr_5rem] sm:items-center sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-300">
                      {session.title}
                    </p>
                    <p className="mt-1 text-[0.68rem] text-zinc-700">
                      {formatDate(session.date)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <TrendBar label="Content" value={session.content} color="bg-violet-300" />
                    <TrendBar label="Evidence" value={session.evidence} color="bg-blue-300" />
                  </div>
                  <ChevronRight className="hidden h-4 w-4 justify-self-end text-zinc-700 sm:block" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Signal({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value?: number | null;
  suffix?: string;
}) {
  return (
    <div className="bg-[#0d0f13] p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.13em] text-zinc-700">
        {label}
      </p>
      <p className={`mt-3 font-mono text-lg tabular-nums ${value == null ? "text-zinc-700" : "text-zinc-200"}`}>
        {value == null ? "-" : `${Math.round(value)}${suffix}`}
      </p>
    </div>
  );
}

function TrendBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[4rem_1fr_2rem] items-center gap-2">
      <span className="text-[0.65rem] text-zinc-700">{label}</span>
      <span className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        {value != null && (
          <span
            className={`block h-full rounded-full ${color}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </span>
      <span className="text-right font-mono text-[0.65rem] tabular-nums text-zinc-600">
        {value == null ? "-" : Math.round(value)}
      </span>
    </div>
  );
}
