"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthContext";
import { InterviewDetail } from "@/types/interview";
import {
  Calendar,
  Clock,
  PlusCircle,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  LockKeyhole,
  LogIn,
  History as HistoryIcon,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function HistoryPage() {
  const { user, openAuthModal } = useAuth();
  const [interviews, setInterviews] = useState<InterviewDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = async () => {
    if (!user) {
      setInterviews([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<InterviewDetail[]>("/api/v1/interviews");
      setInterviews(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load interview history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      if (filterStatus === "COMPLETED" && item.status !== "completed") return false;
      if (filterStatus === "IN_PROGRESS" && item.status === "completed") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || "").toLowerCase().includes(q);
        const roleMatch = (item.role_profile?.role_title || "").toLowerCase().includes(q);
        if (!titleMatch && !roleMatch) return false;
      }

      return true;
    });
  }, [interviews, filterStatus, searchQuery]);

  return (
    <AppShell>
      <div className="space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-300">
              <HistoryIcon className="h-4 w-4" />
              <span>Practice History & Replay Records</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Session Archive & Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Review your past practice sessions, explore grounded evidence timelines, and track competency growth over time.
            </p>
          </div>

          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400"
          >
            <PlusCircle className="h-4 w-4" />
            New Interview
          </Link>
        </div>

        {/* Signed Out State Banner */}
        {!user ? (
          <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#121824] via-[#0d121c] to-[#181126] p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300 border border-violet-400/30">
              <LockKeyhole className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
              Sign in to view your private practice history & reports
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm leading-relaxed text-slate-300">
              Your interview practice recordings, report cards, evidence timelines, and longitudinal metrics are securely private to your account.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-400 hover:to-cyan-400 transition"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In to Access Reports</span>
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
            {/* Filter and Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus("ALL")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                    filterStatus === "ALL"
                      ? "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Sessions ({interviews.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("COMPLETED")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                    filterStatus === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Completed ({interviews.filter((i) => i.status === "completed").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("IN_PROGRESS")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                    filterStatus === "IN_PROGRESS"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  In Progress ({interviews.filter((i) => i.status !== "completed").length})
                </button>
              </div>

              <div className="relative min-w-[16rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by role or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Content State */}
            {loading ? (
              <LoadingState message="Loading your practice history..." />
            ) : error ? (
              <ErrorState
                title="Unable to load history"
                message={error}
                onRetry={loadHistory}
              />
            ) : filteredInterviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
                  <HistoryIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">No interviews found</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {searchQuery
                    ? "No practice sessions matched your search criteria."
                    : "You have not completed any mock interview sessions yet."}
                </p>
                <Link
                  href="/interview/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  <PlusCircle className="h-4 w-4" /> Start your first interview
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredInterviews.map((item) => {
                  const roleTitle = item.role_profile?.role_title || item.title || "Custom Interview";
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently";

                  const isCompleted = item.status === "completed";
                  const answersCount = item.answers?.length || 0;
                  const questionsCount = item.questions?.length || 0;

                  return (
                    <div
                      key={item.id}
                      className="group relative rounded-2xl border border-white/8 bg-[#111620]/90 p-5 sm:p-6 transition hover:border-violet-400/30 hover:bg-[#151c2a]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Left: Info */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                                isCompleted
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                              }`}
                            >
                              {isCompleted ? "Completed Report" : "In Progress"}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                              <Calendar className="h-3.5 w-3.5 text-slate-500" />
                              {dateStr}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              {item.target_duration_minutes} mins
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold text-white group-hover:text-violet-200 transition">
                            {roleTitle}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                            <span>
                              {answersCount} of {questionsCount || answersCount} answers recorded
                            </span>
                            {item.role_profile?.domain && (
                              <>
                                <span>·</span>
                                <span>{item.role_profile.domain}</span>
                              </>
                            )}
                            {item.role_profile?.seniority && (
                              <>
                                <span>·</span>
                                <span>{item.role_profile.seniority}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          {isCompleted ? (
                            <>
                              <Link
                                href={`/interview/${item.id}/review`}
                                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500 shadow-md shadow-violet-600/20"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                View Full Report
                              </Link>
                              <Link
                                href={`/interview/${item.id}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Practice Rep
                              </Link>
                            </>
                          ) : (
                            <Link
                              href={`/interview/${item.id}`}
                              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                              Resume Interview
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
