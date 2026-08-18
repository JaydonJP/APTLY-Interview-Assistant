"use client";

import { useMemo } from "react";
import { Users, Sparkles, Mic, Shield, Cpu, MessageSquareQuote } from "lucide-react";
import { PERSONA_PROFILES, InterviewerPersona } from "@/types/panel";

interface PanelInterviewerDeckProps {
  activePersona?: InterviewerPersona | string | null;
  isTtsPlaying?: boolean;
}

export function PanelInterviewerDeck({
  activePersona,
  isTtsPlaying = false,
}: PanelInterviewerDeckProps) {
  const hrProfile = PERSONA_PROFILES.HR_LEAD;
  const techProfile = PERSONA_PROFILES.TECH_LEAD;

  const currentPersonaKey = useMemo(() => {
    if (!activePersona) return "TECH_LEAD";
    const upper = String(activePersona).toUpperCase();
    if (upper.includes("HR") || upper.includes("SARAH")) return "HR_LEAD";
    return "TECH_LEAD";
  }, [activePersona]);

  const isHrActive = currentPersonaKey === "HR_LEAD";
  const isTechActive = currentPersonaKey === "TECH_LEAD";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d121c]/90 p-5 shadow-2xl backdrop-blur-xl">
      {/* Panel Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-500/30 to-cyan-500/30 text-cyan-300">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AI Interview Panel
            </h3>
            <p className="text-[11px] text-slate-400">
              Two specialized personas evaluating communication & technical depth
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Dual Persona
          </span>
        </div>
      </div>

      {/* Interviewer Persona Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sarah Chen — HR Lead */}
        <div
          className={`relative rounded-xl border p-4 transition-all duration-300 ${
            isHrActive
              ? "border-violet-500/60 bg-gradient-to-br from-violet-950/40 via-purple-950/20 to-black ring-1 ring-violet-500/50 shadow-lg shadow-violet-500/10"
              : "border-white/6 bg-white/[0.02] opacity-60"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold shadow-inner transition-all ${
                  isHrActive
                    ? "border-violet-400 bg-violet-600/30 text-violet-200 ring-2 ring-violet-400/40"
                    : "border-slate-800 bg-slate-900 text-slate-400"
                }`}
              >
                SC
              </div>
              {isHrActive && isTtsPlaying && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-white">
                  <Mic className="h-2.5 w-2.5 animate-pulse" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="truncate text-sm font-bold text-slate-100">
                  {hrProfile.name}
                </h4>
                {isHrActive ? (
                  <span className="shrink-0 rounded-full border border-violet-400/40 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                    Active Turn
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Listening</span>
                )}
              </div>
              <p className="text-xs text-violet-300 font-medium">{hrProfile.role_title}</p>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {hrProfile.focus_areas.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-violet-950/60 border border-violet-800/40 px-1.5 py-0.5 text-[10px] text-violet-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alex Rivera — Tech Lead */}
        <div
          className={`relative rounded-xl border p-4 transition-all duration-300 ${
            isTechActive
              ? "border-cyan-500/60 bg-gradient-to-br from-cyan-950/40 via-blue-950/20 to-black ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-500/10"
              : "border-white/6 bg-white/[0.02] opacity-60"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold shadow-inner transition-all ${
                  isTechActive
                    ? "border-cyan-400 bg-cyan-600/30 text-cyan-200 ring-2 ring-cyan-400/40"
                    : "border-slate-800 bg-slate-900 text-slate-400"
                }`}
              >
                AR
              </div>
              {isTechActive && isTtsPlaying && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-white">
                  <Mic className="h-2.5 w-2.5 animate-pulse" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="truncate text-sm font-bold text-slate-100">
                  {techProfile.name}
                </h4>
                {isTechActive ? (
                  <span className="shrink-0 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                    Active Turn
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Listening</span>
                )}
              </div>
              <p className="text-xs text-cyan-300 font-medium">{techProfile.role_title}</p>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {techProfile.focus_areas.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 text-[10px] text-cyan-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
