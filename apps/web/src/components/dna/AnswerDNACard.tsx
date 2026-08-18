"use client";

import { CheckCircle2, AlertCircle, Dna } from "lucide-react";
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
    <div className="rounded-3xl border border-white/10 bg-[#131923]/90 p-5 sm:p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
            <Dna className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {isBehavioral ? "Behavioral STAR & Ownership DNA" : "Technical Architecture DNA"}
            </h3>
            <p className="text-[11px] text-slate-400">
              Structural completeness of your spoken technical framework
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/5 px-3 py-1.5">
          <span className="text-xs text-slate-400">Completeness:</span>
          <span className="font-mono text-sm font-bold text-emerald-300">{Math.round(completeness)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/50 border border-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.max(5, Math.min(100, completeness))}%` }}
        />
      </div>

      {/* Spacious Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {dimensions.map((dim) => (
          <div
            key={dim.name}
            className={`flex flex-col justify-between rounded-2xl border p-3.5 transition min-w-0 ${
              dim.present
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                : "border-amber-500/30 bg-amber-950/20 text-amber-100"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-xs font-bold capitalize text-white truncate" title={dim.name}>
                  {dim.name}
                </span>
                {dim.present ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded-md">
                    <CheckCircle2 className="h-3 w-3" /> Present
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded-md">
                    <AlertCircle className="h-3 w-3" /> Missing
                  </span>
                )}
              </div>

              {dim.present && dim.evidence_quote ? (
                <p className="line-clamp-3 text-[11px] leading-relaxed text-slate-300 italic">
                  &ldquo;{dim.evidence_quote}&rdquo;
                </p>
              ) : dim.missing_reason ? (
                <p className="line-clamp-3 text-[11px] leading-relaxed text-amber-200/80">
                  {dim.missing_reason}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No explicit mention detected.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
