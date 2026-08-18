"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Cpu,
  Flame,
  LineChart,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { InterviewTwinProfile } from "@/types/twin";

interface InterviewTwinDashboardProps {
  twin: InterviewTwinProfile;
}

export function InterviewTwinDashboard({ twin }: InterviewTwinDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-[#131923] via-[#0e131d] to-[#181126] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <Cpu className="h-3.5 w-3.5" /> Longitudinal Coaching History · Not Personality Profiling
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Your Persistent Interview Twin
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Tracks actual measurable progression across sessions, synthesizes recurring evidence debt, and informs
              future interview generation so each new mock targets your real growth areas.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 shadow-lg shadow-white/10"
            >
              <Sparkles className="h-4 w-4" /> Start Next Rep
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 border-t border-white/8 pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Completed Sessions</p>
            <p className="mt-1 text-2xl font-mono font-semibold text-white">{twin.total_completed_sessions}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Trajectory Status</p>
            <p className="mt-1 text-sm font-medium text-emerald-300">{twin.status_message}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Coaching Scope</p>
            <p className="mt-1 text-sm text-slate-300">Empirical measurement only</p>
          </div>
        </div>
      </div>

      {/* Insufficient Data Warning if < 2 sessions */}
      {!twin.has_sufficient_data && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/5 p-6 text-amber-200">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-300" />
            <div>
              <h3 className="text-base font-semibold text-white">Not enough data yet</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {twin.total_completed_sessions === 0
                  ? "You have not completed any interview sessions yet. Complete at least 2 sessions to unlock longitudinal coaching trajectories and empirical improvement curves."
                  : "You have 1 completed session on record. Complete a 2nd session to establish baseline comparison curves and recurring evidence debt detection."}
              </p>
              <div className="mt-4">
                <Link
                  href="/interview/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-400/20 border border-amber-400/30 px-3.5 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-400/30 transition"
                >
                  Launch an interview <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Longitudinal Session Progression (Session 1, Session 2, Session 3...) */}
      {twin.session_history.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Longitudinal Session Progression</h2>
            </div>
            <span className="text-xs text-slate-400">{twin.session_history.length} actual sessions evaluated</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {twin.session_history.map((s) => (
              <div key={s.session_id} className="rounded-xl border border-white/8 bg-black/20 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 text-[10px] font-semibold text-violet-200 uppercase">
                      Session {s.session_number}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-white line-clamp-1">{s.title}</h3>
                    <p className="text-[11px] text-slate-500">{s.session_date}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-2xl font-semibold text-white">{s.overall_score == null ? "—" : Math.round(s.overall_score)}</span>
                    <p className="text-[10px] uppercase text-slate-500">Overall</p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-3 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Content Score</span>
                    <span className="font-mono text-white">{s.content_score == null ? "—" : Math.round(s.content_score)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Evidence Score</span>
                    <span className="font-mono text-cyan-200">{s.evidence_score == null ? "—" : Math.round(s.evidence_score)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Delivery Score</span>
                    <span className="font-mono text-emerald-200">{s.delivery_score == null ? "—" : Math.round(s.delivery_score)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Filler Words</span>
                    <span className="font-mono text-amber-200">{s.filler_count == null ? "—" : s.filler_count}</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <Link
                    href={`/interview/${s.session_id}/review`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200 hover:text-white transition"
                  >
                    View session report <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Interview Directives & Recurring Evidence Debt */}
      {twin.has_sufficient_data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Next Interview Adaptation */}
          <div className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/10 to-transparent p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-violet-300" />
              <h2 className="text-lg font-semibold text-white">Next Interview Question Directives</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your previous interview sessions identified growth areas. The next interview generator will automatically
              inject questions targeting these exact dimensions.
            </p>

            <div className="space-y-3">
              {twin.next_interview_focus_areas.map((focus, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-white/8 bg-black/25 p-3.5 text-xs">
                  <Target className="h-4 w-4 shrink-0 text-violet-300 mt-0.5" />
                  <p className="text-slate-200 leading-relaxed">{focus}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring Evidence Debt */}
          <div className="rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-500/10 to-transparent p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-semibold text-white">Recurring Evidence Debt</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Proof dimensions that were consistently omitted or unverified across multiple answers.
            </p>

            <div className="space-y-3">
              {twin.recurring_evidence_debt.map((debt, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-black/25 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize text-amber-200">{debt.category} Gap</span>
                    <span className="text-[10px] text-slate-500">Flagged {debt.frequency} time{debt.frequency === 1 ? "" : "s"}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{debt.coaching_recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recurring Strengths & Weaknesses */}
      {twin.has_sufficient_data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Recurring Strengths
            </div>
            <div className="space-y-2">
              {twin.recurring_strengths.map((str, i) => (
                <div key={i} className="flex gap-3 text-xs leading-relaxed text-slate-300 rounded-lg bg-white/[0.02] p-3 border border-white/5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{str}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
              <Flame className="h-4 w-4" /> Recurring Growth Opportunities
            </div>
            <div className="space-y-2">
              {twin.recurring_weaknesses.map((weak, i) => (
                <div key={i} className="flex gap-3 text-xs leading-relaxed text-slate-300 rounded-lg bg-white/[0.02] p-3 border border-white/5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                  <span>{weak}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
