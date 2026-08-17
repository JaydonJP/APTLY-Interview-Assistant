"use client";

import { CheckCircle2, AlertCircle, Dna, Layers } from "lucide-react";
import type { BehavioralAnswerDNA, DNADimension, TechnicalAnswerDNA } from "@/types/dna";

interface AnswerDNACardProps {
  category: "technical" | "behavioral" | string;
  technicalDna?: TechnicalAnswerDNA | null;
  behavioralDna?: BehavioralAnswerDNA | null;
}

export function AnswerDNACard({ category, technicalDna, behavioralDna }: AnswerDNACardProps) {
  const isBehavioral = category.toLowerCase() === "behavioral";

  if (isBehavioral && !behavioralDna) return null;
  if (!isBehavioral && !technicalDna) return null;

  const completeness = isBehavioral
    ? behavioralDna?.completeness_score ?? 0
    : technicalDna?.completeness_score ?? 0;

  const dimensions: DNADimension[] = isBehavioral
    ? [
        behavioralDna!.situation,
        behavioralDna!.task,
        behavioralDna!.action,
        behavioralDna!.result,
        behavioralDna!.ownership,
        behavioralDna!.learning,
      ]
    : [
        technicalDna!.problem,
        technicalDna!.approach,
        technicalDna!.reasoning,
        technicalDna!.implementation,
        technicalDna!.tradeoff,
        technicalDna!.validation,
        technicalDna!.result,
      ];

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Dna className="h-5 w-5 text-violet-300" />
          <h3 className="text-base font-semibold text-white">
            {isBehavioral ? "Behavioral STAR & Ownership DNA" : "Technical Architecture DNA"}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Completeness</span>
          <span className="font-mono text-sm font-semibold text-emerald-300">{Math.round(completeness)}%</span>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, completeness))}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dimensions.map((dim) => (
          <div
            key={dim.name}
            className={`rounded-xl border p-3 transition ${
              dim.present
                ? "border-emerald-300/20 bg-emerald-400/5 text-emerald-100"
                : "border-amber-300/20 bg-amber-400/5 text-amber-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold capitalize tracking-wide text-white">{dim.name}</span>
              {dim.present ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Present
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" /> Missing
                </span>
              )}
            </div>

            {dim.present && dim.evidence_quote ? (
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-300 italic">
                &ldquo;{dim.evidence_quote}&rdquo;
              </p>
            ) : dim.missing_reason ? (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">{dim.missing_reason}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
