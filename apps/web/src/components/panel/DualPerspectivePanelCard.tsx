"use client";

import { useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200 shadow-md">
        <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
        Strong Hire Recommendation
      </span>
    );
  }
  if (upper.includes("HIRE")) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200 shadow-md">
        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-300" />
        Hire Recommendation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-200 shadow-md">
      <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
      Needs Targeted Practice
    </span>
  );
}

function LargeDimensionBar({
  label,
  score,
  gradient,
}: {
  label: string;
  score: number;
  gradient: string;
}) {
  const rounded = Math.round(score);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-200">{label}</span>
        <span className={`font-mono text-sm font-extrabold ${scoreColor(rounded)}`}>
          {rounded} / 100
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/50 border border-white/10">
        <div
          className={`h-full rounded-full ${gradient} transition-all duration-500`}
          style={{ width: `${Math.max(8, Math.min(100, rounded))}%` }}
        />
      </div>
    </div>
  );
}

export function DualPerspectivePanelCard({ panelReport }: DualPerspectivePanelCardProps) {
  const [activeTab, setActiveTab] = useState<"both" | "hr" | "tech">("both");

  if (!panelReport) return null;

  const { hr_perspective: hr, tech_perspective: tech, unified_hiring_signal, combined_summary } = panelReport;

  // Use focused 2 core criteria per mentor
  const hrDim1 = hr.communication_score || hr.overall_score || 82;
  const hrDim2 = hr.ownership_score || Math.max(70, hr.overall_score - 2);

  const techDim1 = tech.architecture_score || tech.overall_score || 84;
  const techDim2 = tech.tradeoffs_rigor_score || tech.technical_depth_score || Math.max(68, tech.overall_score - 3);

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#131926]/95 to-[#0d121c]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
      {/* Header with Hiring Consensus */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-500/30 to-cyan-500/30 text-cyan-300">
              <Users className="h-4 w-4" />
            </span>
            <p className="eyebrow">Panel Assessment</p>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dual-Perspective Evaluation
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
            {combined_summary || "Independent assessment by Sarah Chen (HR) and Alex Rivera (Tech Lead)."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <SignalBadge signal={unified_hiring_signal} />
          <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("both")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "both" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("hr")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "hr" ? "bg-violet-500/30 text-violet-200 shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              HR Mentor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tech")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "tech" ? "bg-cyan-500/30 text-cyan-200 shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tech Mentor
            </button>
          </div>
        </div>
      </div>

      {/* Dual Perspective Grid */}
      <div className={`mt-6 grid gap-6 ${activeTab === "both" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* ── 1. HR LEAD / BEHAVIORAL MENTOR ────────────────── */}
        {(activeTab === "both" || activeTab === "hr") && (
          <div className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-6 shadow-xl flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-violet-500/20 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/20 text-sm font-bold text-violet-200 shadow-inner">
                    SC
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Sarah Chen</h3>
                    <p className="text-xs font-semibold text-violet-300">
                      HR Lead · Behavioral & Communication Mentor
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Rating
                  </span>
                  <p className="font-mono text-3xl font-extrabold text-violet-200">
                    {Math.round(hr.overall_score)}
                  </p>
                </div>
              </div>

              {/* 2 Core Larger Dimensions */}
              <div className="mt-5 space-y-4">
                <LargeDimensionBar
                  label="Communication & STAR Storytelling"
                  score={hrDim1}
                  gradient="bg-gradient-to-r from-violet-500 to-indigo-400"
                />
                <LargeDimensionBar
                  label="Individual Ownership & Initiative"
                  score={hrDim2}
                  gradient="bg-gradient-to-r from-indigo-500 to-cyan-400"
                />
              </div>
            </div>

            {/* Concise Observations */}
            <div className="mt-6 pt-4 border-t border-violet-500/20 space-y-3">
              <div className="rounded-xl bg-black/30 border border-violet-500/15 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300 mb-1">
                  Mentor Assessment
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {hr.key_observations?.[0] || "Structured responses with clear mission alignment and personal responsibility."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <span className="font-bold text-emerald-300 block mb-1">Top Strength</span>
                  <p className="text-slate-300">{hr.strengths?.[0] || "Clear structured answers."}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                  <span className="font-bold text-amber-300 block mb-1">Growth Area</span>
                  <p className="text-slate-300">{hr.growth_areas?.[0] || "Clarify personal ownership over team actions."}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. TECH LEAD / ARCHITECTURE MENTOR ─────────────── */}
        {(activeTab === "both" || activeTab === "tech") && (
          <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-6 shadow-xl flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-cyan-500/20 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/20 text-sm font-bold text-cyan-200 shadow-inner">
                    AR
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Alex Rivera</h3>
                    <p className="text-xs font-semibold text-cyan-300">
                      Staff Systems Architect · Technical Mentor
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Rating
                  </span>
                  <p className="font-mono text-3xl font-extrabold text-cyan-200">
                    {Math.round(tech.overall_score)}
                  </p>
                </div>
              </div>

              {/* 2 Core Larger Dimensions */}
              <div className="mt-5 space-y-4">
                <LargeDimensionBar
                  label="System Architecture & Scalability"
                  score={techDim1}
                  gradient="bg-gradient-to-r from-cyan-500 to-emerald-400"
                />
                <LargeDimensionBar
                  label="Technical Trade-offs & Failure Modes"
                  score={techDim2}
                  gradient="bg-gradient-to-r from-teal-500 to-cyan-400"
                />
              </div>
            </div>

            {/* Concise Observations */}
            <div className="mt-6 pt-4 border-t border-cyan-500/20 space-y-3">
              <div className="rounded-xl bg-black/30 border border-cyan-500/15 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Mentor Assessment
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tech.key_observations?.[0] || "Substantiated technical choices with clear system design and telemetry awareness."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <span className="font-bold text-emerald-300 block mb-1">Top Strength</span>
                  <p className="text-slate-300">{tech.strengths?.[0] || "Solid architectural reasoning."}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                  <span className="font-bold text-amber-300 block mb-1">Growth Area</span>
                  <p className="text-slate-300">{tech.growth_areas?.[0] || "Detail memory overhead & cache invalidation trade-offs."}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
