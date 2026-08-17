"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  User as UserIcon,
  PlayCircle,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiClient } from "@/lib/api-client";
import { HealthCard } from "@/components/health/HealthCard";
import type { InterviewDetail } from "@/types/interview";

const SIGNALS = [
  ["Adaptive questioning", "Active", "text-emerald-300"],
  ["Timestamped speech", "Active", "text-emerald-300"],
  ["Supabase Auth", "Connected", "text-emerald-300"],
] as const;

export function DashboardContent() {
  const { user, openAuthModal } = useAuth();
  const [interviews, setInterviews] = useState<InterviewDetail[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);

  useEffect(() => {
    async function loadInterviews() {
      try {
        setLoadingInterviews(true);
        const data = await apiClient.get<InterviewDetail[]>("/api/v1/interviews");
        setInterviews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load user interviews:", err);
      } finally {
        setLoadingInterviews(false);
      }
    }

    loadInterviews();
  }, [user]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Practice Candidate";

  return (
    <div className="space-y-8">
      {/* Hero Welcome & Readiness */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/8 bg-[#131923] p-6 shadow-[0_2rem_5rem_rgba(0,0,0,0.24)] sm:p-9">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-400/12 blur-3xl pointer-events-none" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="eyebrow">Personalized Practice Lab</span>
              {user && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {user.email}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">
              {user ? `Welcome back, ${displayName}` : "Turn interview nerves into measurable confidence."}
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
              {user
                ? "Your custom questions, speech pacing, transcripts, and evidence drills are securely synced to your Supabase account."
                : "Set a target role, meet an adaptive interviewer, then inspect the exact timestamped moments to improve."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                id="action-new-mock-interview"
                href="/interview/new"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 shadow-lg shadow-white/5"
              >
                <Plus className="h-4 w-4" />
                New mock interview
              </Link>
              {!user && (
                <button
                  onClick={() => openAuthModal("signup")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <Sparkles className="h-4 w-4" />
                  Sign In to Sync History
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/25 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4 text-violet-200" />
                Session Readiness
              </div>
              <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                Ready
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {SIGNALS.map(([label, value, color]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-white/6 pb-3 text-xs last:border-0 last:pb-0"
                >
                  <span className="text-slate-400">{label}</span>
                  <span
                    className={`inline-flex items-center gap-2 font-medium ${color}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Action Cards & Past Interviews */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {/* Action cards */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Start Practice</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Choose Your Next Move
                </h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                id="action-new-interview"
                href="/interview/new"
                className="group rounded-2xl border border-violet-300/20 bg-violet-300/8 p-5 transition hover:-translate-y-0.5 hover:border-violet-200/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-300/15 text-violet-100">
                    <Plus className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-violet-200 transition group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-white">
                  New Interview
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Paste any job description to extract role requirements and start.
                </p>
              </Link>

              <Link
                id="action-view-progress"
                href="/progress"
                className="group rounded-2xl border border-cyan-300/15 bg-cyan-300/6 p-5 transition hover:-translate-y-0.5 hover:border-cyan-200/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/12 text-cyan-100">
                    <Target className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-cyan-200 transition group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-white">
                  Progress & Analytics
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Inspect your delivery metrics, filler trends, and repair records.
                </p>
              </Link>
            </div>
          </section>

          {/* User's Practice Sessions */}
          <section className="rounded-2xl border border-white/8 bg-[#0d1118] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="eyebrow">Your History</p>
                <h2 className="text-lg font-semibold text-white mt-0.5">
                  Recent Practice Sessions
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {interviews.length} {interviews.length === 1 ? "session" : "sessions"}
              </span>
            </div>

            {loadingInterviews ? (
              <div className="py-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                <p className="text-xs text-slate-500 mt-2">Loading practice sessions...</p>
              </div>
            ) : interviews.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6">
                <Layers className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm font-medium text-zinc-300">
                  No practice sessions yet
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Start your first mock interview to generate question responses and see your evidence report here.
                </p>
                <Link
                  href="/interview/new"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Start First Session
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {interviews.slice(0, 6).map((inv) => {
                  const isCompleted = inv.status === "completed";
                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white truncate">
                            {inv.title || "Software Engineering Practice"}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5 text-zinc-500" />
                            {inv.target_duration_minutes}m target
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            {inv.questions?.length ?? 0} questions
                          </span>
                          {inv.created_at && (
                            <span className="text-[11px] text-zinc-500">
                              {new Date(inv.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <Link
                            href={`/interview/${inv.id}/review`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            Report
                          </Link>
                        ) : (
                          <Link
                            href={`/interview/${inv.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-zinc-950 transition"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Resume
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right side: System Health & Privacy */}
        <div className="space-y-6">
          <HealthCard />

          <section className="rounded-2xl border border-white/8 bg-[#0d1118] p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Data Privacy & Security</h3>
            </div>
            <p className="text-xs leading-5 text-slate-400">
              Audio recordings and transcripts are private to your user ID. You can sign out or delete sessions at any time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
