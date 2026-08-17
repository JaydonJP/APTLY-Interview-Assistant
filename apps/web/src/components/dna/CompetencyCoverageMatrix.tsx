"use client";

import { CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck, Target } from "lucide-react";
import type { CompetencyCoverageStatus, SessionCompetencyCoverage } from "@/types/dna";

interface CompetencyCoverageMatrixProps {
  coverage?: SessionCompetencyCoverage | null;
}

function statusBadge(status: CompetencyCoverageStatus) {
  switch (status) {
    case "DEMONSTRATED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> Demonstrated
        </span>
      );
    case "WEAK_EVIDENCE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
          <AlertTriangle className="h-3 w-3" /> Weak Evidence
        </span>
      );
    case "TESTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-200">
          <Target className="h-3 w-3" /> Tested
        </span>
      );
    case "NOT_TESTED":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
          <HelpCircle className="h-3 w-3" /> Not Tested
        </span>
      );
  }
}

export function CompetencyCoverageMatrix({ coverage }: CompetencyCoverageMatrixProps) {
  if (!coverage || !coverage.competencies.length) return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-semibold text-white">Job Competency Coverage Matrix</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Cross-referenced against Job Description requirements and target competencies.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{coverage.demonstrated_count} Demonstrated</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>{coverage.weak_evidence_count} Weak Evidence</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <span>{coverage.not_tested_count} Not Tested</span>
          </div>
        </div>
      </div>

      {/* Non-judgmental banner */}
      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-400">
        <span className="font-semibold text-slate-200">Evaluation Note: </span>
        Competencies marked <span className="font-medium text-slate-300">Not Tested</span> were not targeted during this interview session. This does not indicate poor candidate capability.
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coverage.competencies.map((item) => (
          <div
            key={item.competency_name}
            className={`rounded-xl border p-4 transition ${
              item.status === "DEMONSTRATED"
                ? "border-emerald-300/15 bg-emerald-400/[0.03]"
                : item.status === "WEAK_EVIDENCE"
                ? "border-amber-300/15 bg-amber-400/[0.03]"
                : "border-white/5 bg-black/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-semibold text-white">{item.competency_name}</h4>
              {statusBadge(item.status)}
            </div>

            <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{item.explanation}</p>

            {item.evidence_snippets.length > 0 && (
              <div className="mt-3 border-t border-white/5 pt-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evidence Quote</p>
                <p className="mt-1 line-clamp-2 text-xs italic text-slate-300">
                  &ldquo;{item.evidence_snippets[0]}&rdquo;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
