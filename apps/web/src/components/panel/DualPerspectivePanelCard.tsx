"use client";

import { useState } from "react";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Layers,
  HeartHandshake,
  MessageSquare,
  Award,
  Sparkles,
} from "lucide-react";
import type { PanelInterviewReport } from "@/types/panel";

interface DualPerspectivePanelCardProps {
  panelReport?: PanelInterviewReport | null;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-300";
  if (score >= 70) return "text-cyan-300";
  if (score >= 60) return "text-amber-300";
  return "text-rose-300";
}

function SignalBadge({ signal }: { signal: string }) {
  const upper = (signal || "").toUpperCase();
  if (upper.includes("STRONG")) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200 shadow-lg shadow-emerald-500/10">
        <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
        Strong Hire Alignment
      </span>
    );
  }
  if (upper.includes("HIRE")) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200 shadow-lg shadow-cyan-500/10">
        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-300" />
        Hire Alignment
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200 shadow-lg shadow-amber-500/10">
      <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
      Needs Coaching
    </span>
  );
}

function DimensionBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={`font-mono font-bold ${scoreColor(score)}`}>
          {Math.round(score)} / 100
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

export function DualPerspectivePanelCard({ panelReport }: DualPerspectivePanelCardProps) {
  const [activeTab, setActiveTab] = useState<"both" | "hr" | "tech">("both");

  if (!panelReport) {
    return null;
  }

  const { hr_perspective: hr, tech_perspective: tech, unified_hiring_signal, combined_summary } = panelReport;

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#131926]/95 to-[#0d121c]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
      {/* Header with Hiring Consensus */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-500/30 to-cyan-500/30 text-cyan-300">
              <Users className="h-4 w-4" />
            </span>
            <p className="eyebrow">Dual-Perspective Evaluation</p>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Panel Consensus & Hiring Signal
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            {combined_summary ||
              "Both interviewers conducted independent evaluations and synthesized a unified assessment."}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <SignalBadge signal={unified_hiring_signal} />
          <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("both")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeTab === "both"
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("hr")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeTab === "hr"
                  ? "bg-violet-500/25 text-violet-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              HR Lead
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tech")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeTab === "tech"
                  ? "bg-cyan-500/25 text-cyan-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tech Lead
            </button>
          </div>
        </div>
      </div>

      {/* Dual Perspective Grid */}
      <div
        className={`mt-8 grid gap-6 ${
          activeTab === "both"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* ── 1. HR LEAD PERSPECTIVE (Sarah Chen) ────────────────── */}
        {(activeTab === "both" || activeTab === "hr") && (
          <div className="rounded-2xl border border-violet-500/20 bg-violet-950/[0.15] p-6 shadow-lg shadow-violet-950/20">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-violet-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400 bg-violet-500/20 text-sm font-bold text-violet-200 shadow-inner">
                  SC
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Sarah Chen</h3>
                  <p className="text-xs font-medium text-violet-300">
                    HR Lead & People Partner
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Behavioral Score
                </span>
                <p className="font-mono text-3xl font-bold text-violet-200">
                  {Math.round(hr.overall_score)}
                </p>
              </div>
            </div>

            {/* Sub-Dimension Scores */}
            <div className="mt-5 space-y-3">
              <DimensionBar label="Communication & Storytelling" score={hr.communication_score} />
              <DimensionBar label="Individual Ownership & Initiative" score={hr.ownership_score} />
              <DimensionBar label="Teamwork & Cross-functional Alignment" score={hr.teamwork_score} />
              <DimensionBar label="Conflict Resolution & Adaptability" score={hr.conflict_resolution_score} />
            </div>

            {/* Motivation Alignment */}
            <div className="mt-6 rounded-xl border border-violet-500/20 bg-black/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
                <HeartHandshake className="h-4 w-4 text-violet-300" />
                Motivation & Cultural Alignment
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {hr.motivation_alignment}
              </p>
            </div>

            {/* Observations */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                HR Key Observations
              </p>
              <div className="space-y-2">
                {hr.key_observations.map((obs, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Growth Areas */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-violet-500/20">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 mb-1.5">
                  Top Behavioral Strengths
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {hr.strengths.map((str, idx) => (
                    <li key={idx}>• {str}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 mb-1.5">
                  Growth & Refinement
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {hr.growth_areas.map((gro, idx) => (
                    <li key={idx}>• {gro}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. TECH LEAD PERSPECTIVE (Alex Rivera) ─────────────── */}
        {(activeTab === "both" || activeTab === "tech") && (
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/[0.15] p-6 shadow-lg shadow-cyan-950/20">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400 bg-cyan-500/20 text-sm font-bold text-cyan-200 shadow-inner">
                  AR
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Alex Rivera</h3>
                  <p className="text-xs font-medium text-cyan-300">
                    Staff Systems Architect & Tech Lead
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Technical Score
                </span>
                <p className="font-mono text-3xl font-bold text-cyan-200">
                  {Math.round(tech.overall_score)}
                </p>
              </div>
            </div>

            {/* Sub-Dimension Scores */}
            <div className="mt-5 space-y-3">
              <DimensionBar label="System Architecture & Scalability" score={tech.architecture_score} />
              <DimensionBar label="Technical Depth & Implementation" score={tech.technical_depth_score} />
              <DimensionBar label="Trade-offs Rigor & Failure Recovery" score={tech.tradeoffs_rigor_score} />
              <DimensionBar label="Empirical Validation & Telemetry" score={tech.validation_methodology_score} />
            </div>

            {/* Scale & Failure Handling */}
            <div className="mt-6 rounded-xl border border-cyan-500/20 bg-black/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                <Cpu className="h-4 w-4 text-cyan-300" />
                Scale & Failure Mode Assessment
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {tech.scale_and_failure_handling}
              </p>
            </div>

            {/* Observations */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Tech Lead Observations
              </p>
              <div className="space-y-2">
                {tech.key_observations.map((obs, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Growth Areas */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-cyan-500/20">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 mb-1.5">
                  Top Technical Strengths
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {tech.strengths.map((str, idx) => (
                    <li key={idx}>• {str}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 mb-1.5">
                  Growth & Refinement
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {tech.growth_areas.map((gro, idx) => (
                    <li key={idx}>• {gro}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
