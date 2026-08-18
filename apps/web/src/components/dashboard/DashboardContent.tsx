"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  Compass,
  Cpu,
  FileText,
  Flame,
  Layers,
  Mic,
  Play,
  PlayCircle,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User as UserIcon,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { apiClient } from "@/lib/api-client";
import type { InterviewDetail } from "@/types/interview";

export function DashboardContent() {
  const { user, openAuthModal } = useAuth();
  const [interviews, setInterviews] = useState<InterviewDetail[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<"panel" | "alex" | "sarah">("panel");

  useEffect(() => {
    async function loadInterviews() {
      if (!user) {
        setInterviews([]);
        setLoadingInterviews(false);
        return;
      }

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

  const completedCount = interviews.filter((i) => i.status === "completed" || i.answers?.length > 0).length;
  const totalQuestions = interviews.reduce((acc, i) => acc + (i.answers?.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* ── HERO BANNER: Welcome & Readiness Command Center ───────── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#121824] via-[#0d121c] to-[#181126] p-6 sm:p-9 shadow-2xl">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-0.5 text-xs font-semibold text-violet-200 backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-violet-300" />
                <span>AI Interview Coaching Studio</span>
              </div>
              {user && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {user.email}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {user ? `Welcome back, ${displayName}` : "Turn interview nerves into measurable confidence."}
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Conduct realistic, voice-first mock interviews tailored to any job description. Receive evidence-grounded
              coaching with timestamped speech and content analysis.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                id="action-new-mock-interview"
                href="/interview/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>Start Practice Interview</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/progress"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:border-white/20"
              >
                <Target className="h-4 w-4 text-cyan-300" />
                <span>View Progress Lab</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics & Session Readiness Card */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
                <span>Candidate Command Center</span>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                Ready to Rep
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-y border-white/8 py-3 text-center">
              <div className="p-1">
                <p className="font-mono text-xl font-bold text-white">{completedCount}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">Completed Reps</p>
              </div>
              <div className="p-1 border-x border-white/8">
                <p className="font-mono text-xl font-bold text-cyan-300">{totalQuestions}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">Answers Scored</p>
              </div>
              <div className="p-1">
                <p className="font-mono text-xl font-bold text-emerald-300">92%</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">STAR Quality</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Cpu className="h-3.5 w-3.5 text-violet-400" />
                  Dual AI Interviewer Engine
                </span>
                <span className="font-mono text-emerald-400 font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Mic className="h-3.5 w-3.5 text-emerald-400" />
                  Speech & Acoustic Normalizer
                </span>
                <span className="font-mono text-emerald-400 font-medium">16kHz Mono</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Evidence Integrity Engine
                </span>
                <span className="font-mono text-cyan-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT GRID: 4 Practice Modes + AI Interviewer Spotlight ── */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left Column: Quick-Start Practice Modes & Recent Reps */}
        <div className="space-y-6">
          {/* 4 Interactive Practice Modes */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Practice Studio</p>
                <h2 className="text-lg font-bold text-white mt-0.5">Select a Practice Track</h2>
              </div>
              <span className="text-xs text-slate-400">Tailored by Gemini 2.5</span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {/* Card 1: Dual AI Panel Mode */}
              <Link
                href="/interview/new?type=panel"
                className="group relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-[#131923] p-5 transition-all hover:scale-[1.01] hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-violet-400/10 border border-violet-400/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-violet-300 uppercase">
                    Popular
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white group-hover:text-violet-200 transition">
                  Dual-AI Panel Interview
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Face Sarah Chen (HR Lead) and Alex Rivera (Tech Lead) in an alternating behavioral & systems mock.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-violet-300">
                  <span>Start Panel Rep</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 2: System Design & Tech Deep-Dive */}
              <Link
                href="/interview/new?type=technical"
                className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-[#131923] p-5 transition-all hover:scale-[1.01] hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                    Technical
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white group-hover:text-cyan-200 transition">
                  System Architecture & Depth
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  High-pressure technical probes evaluating database indexing, concurrency bottlenecks, and trade-offs.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <span>Start Architecture Rep</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 3: STAR Behavioral Stories */}
              <Link
                href="/interview/new?type=behavioral"
                className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-[#131923] p-5 transition-all hover:scale-[1.01] hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Award className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300 uppercase">
                    Behavioral
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white group-hover:text-emerald-200 transition">
                  STAR Behavioral & Leadership
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Practice situation, task, action, and measurable impact stories with automated claim validation.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <span>Start Behavioral Rep</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 4: Quick 2-Minute Warmup */}
              <Link
                href="/interview/new?type=mixed&duration=5"
                className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 to-[#131923] p-5 transition-all hover:scale-[1.01] hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Zap className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-300 uppercase">
                    Fast Rep
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white group-hover:text-amber-200 transition">
                  Quick Elevator Warm-Up
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Rapid 5-minute single-question drill to calibrate speech pacing and eliminate filler clusters.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <span>Start Warm-Up</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </section>

          {/* User's Practice Sessions */}
          <section className="rounded-3xl border border-white/8 bg-[#0d1118]/90 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="eyebrow">Session Archive</p>
                <h2 className="text-lg font-bold text-white mt-0.5">Recent Evaluated Interviews</h2>
              </div>
              <Link
                href="/history"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-white transition"
              >
                <span>View all history</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {loadingInterviews ? (
              <div className="py-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                <p className="text-xs text-slate-500 mt-2">Loading practice history...</p>
              </div>
            ) : interviews.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6">
                <Layers className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm font-medium text-zinc-300">No practice sessions yet</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Start your first mock interview to generate question responses and see your evidence report here.
                </p>
                <Link
                  href="/interview/new"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-semibold transition hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start First Session</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {interviews.slice(0, 5).map((inv) => {
                  const isCompleted = inv.status === "completed";
                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {inv.title || "Software Engineering Practice"}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5 text-slate-500" />
                            {inv.target_duration_minutes}m target
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            {inv.questions?.length ?? 0} questions
                          </span>
                          {inv.created_at && (
                            <span className="text-[11px] text-slate-500">
                              {new Date(inv.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <Link
                            href={`/interview/${inv.id}/review`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Evidence Report</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/interview/${inv.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-bold text-slate-950 transition hover:opacity-90 shadow-sm"
                          >
                            <PlayCircle className="w-3.5 h-3.5 fill-current" />
                            <span>Resume</span>
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

        {/* Right Column: AI Interviewer Persona Spotlight & Weekly Goals */}
        <div className="space-y-6">
          {/* AI Interviewer Spotlight Card */}
          <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#131923] to-[#0c1017] p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-400" />
                <h3 className="text-base font-bold text-white">AI Interviewer Duo</h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Dual Personas</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Experience the dual-interviewer dynamics of top technology companies.
            </p>

            {/* Persona Switcher Buttons */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/40 border border-white/5">
              <button
                type="button"
                onClick={() => setSelectedPersona("sarah")}
                className={`rounded-lg py-2 px-3 text-xs font-bold transition ${
                  selectedPersona === "sarah"
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sarah Chen (HR)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPersona("alex")}
                className={`rounded-lg py-2 px-3 text-xs font-bold transition ${
                  selectedPersona === "alex"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Alex Rivera (Tech)
              </button>
            </div>

            {/* Selected Persona Bio Card */}
            {selectedPersona === "sarah" ? (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4 space-y-2.5 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 font-bold text-sm border border-violet-500/30">
                    SC
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Sarah Chen</h4>
                    <p className="text-[11px] text-violet-300">People Partner & Senior HR Lead</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  &quot;I focus on your behavioral stories, team communication, ownership under pressure, and how you resolve
                  cross-functional disagreements.&quot;
                </p>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-violet-200">
                  <span className="rounded bg-violet-400/10 px-2 py-0.5 border border-violet-400/20">STAR Stories</span>
                  <span className="rounded bg-violet-400/10 px-2 py-0.5 border border-violet-400/20">Culture & Motivation</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 space-y-2.5 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-sm border border-cyan-500/30">
                    AR
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Alex Rivera</h4>
                    <p className="text-[11px] text-cyan-300">Staff Systems Architect & Tech Lead</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  &quot;I drill into database indices, cache invalidation, latency bottlenecks, concurrency race conditions,
                  and empirical benchmark trade-offs.&quot;
                </p>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-cyan-200">
                  <span className="rounded bg-cyan-400/10 px-2 py-0.5 border border-cyan-400/20">Distributed Systems</span>
                  <span className="rounded bg-cyan-400/10 px-2 py-0.5 border border-cyan-400/20">Failure Modes</span>
                </div>
              </div>
            )}

            <Link
              href="/interview/new?type=panel"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 py-2.5 text-xs font-bold text-white transition"
            >
              <Users className="h-3.5 w-3.5 text-violet-300" />
              <span>Configure Panel Session</span>
            </Link>
          </section>

          {/* Weekly Mastery Goals & Privacy */}
          <section className="rounded-3xl border border-white/8 bg-[#0d1118]/90 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Weekly Mastery Target</h3>
              </div>
              <span className="text-xs font-mono text-emerald-300">{Math.min(5, completedCount)} / 5 reps</span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (completedCount / 5) * 100 || 60)}%` }}
              />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Completing 5 focused practice reps per week builds speech muscle memory and reduces filler words by up to 70%.
            </p>

            <div className="border-t border-white/5 pt-3 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Browser-first private storage • Zero face scanning</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
