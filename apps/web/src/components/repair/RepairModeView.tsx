"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

interface RepairDrill {
  id: string;
  name: string;
  target: string;
  formula: string;
  instructions: string;
}

interface RepairDelta {
  metric_name: string;
  before_value: number;
  after_value: number;
  delta: number;
  improved: boolean;
  display_text: string;
}

interface RepairResult {
  improvement_verified?: boolean;
  summary_verdict?: string;
  deltas?: RepairDelta[];
}

interface RepairModeViewProps {
  level: 1 | 2 | 3 | 4;
  setLevel: Dispatch<SetStateAction<1 | 2 | 3 | 4>>;
  onClose: () => void;
  questionText: string;
  weaknessTitle: string;
  evidenceSnippet: string;
  explanation: string;
  drills: RepairDrill[];
  selectedDrill: RepairDrill;
  setSelectedDrill: (drill: RepairDrill) => void;
  retryText: string;
  setRetryText: Dispatch<SetStateAction<string>>;
  isRecording: boolean;
  isEvaluating: boolean;
  evaluationError: string | null;
  evaluationResult: RepairResult | null;
  onToggleRecording: () => void;
  onSubmit: () => void;
}

const STEPS = [
  ["Diagnose", "Find the exact gap"],
  ["Frame", "Choose a repair structure"],
  ["Retry", "Deliver the answer again"],
  ["Compare", "Verify what changed"],
];

export function RepairModeView({
  level,
  setLevel,
  onClose,
  questionText,
  weaknessTitle,
  evidenceSnippet,
  explanation,
  drills,
  selectedDrill,
  setSelectedDrill,
  retryText,
  setRetryText,
  isRecording,
  isEvaluating,
  evaluationError,
  evaluationResult,
  onToggleRecording,
  onSubmit,
}: RepairModeViewProps) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#07080a]">
      <div className="mx-auto min-h-[100svh] max-w-6xl px-4 py-5 sm:px-7 sm:py-7">
        <header className="flex items-center justify-between gap-5 border-b border-white/[0.07] pb-5">
          <div>
            <p className="eyebrow">Repair mode</p>
            <p className="mt-2 text-xs text-zinc-600">
              One weakness. One retry. A measurable comparison.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Repair Mode"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] text-zinc-500 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <aside>
            <ol className="grid grid-cols-4 gap-2 lg:grid-cols-1" aria-label="Repair progress">
              {STEPS.map(([title, detail], index) => {
                const stepNumber = (index + 1) as 1 | 2 | 3 | 4;
                const active = level === stepNumber;
                const complete = level > stepNumber;
                const enabled =
                  stepNumber <= level ||
                  (stepNumber === 3 && Boolean(selectedDrill)) ||
                  (stepNumber === 4 && Boolean(evaluationResult));
                return (
                  <li key={title}>
                    <button
                      type="button"
                      onClick={() => enabled && setLevel(stepNumber)}
                      disabled={!enabled}
                      aria-current={active ? "step" : undefined}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-violet-300/25 bg-violet-300/[0.07]"
                          : "border-transparent hover:border-white/[0.07]"
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.65rem] ${
                        complete
                          ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-300"
                          : active
                            ? "border-violet-300/30 text-violet-200"
                            : "border-white/[0.08] text-zinc-700"
                      }`}>
                        {complete ? <Check className="h-3 w-3" /> : stepNumber}
                      </span>
                      <span className="hidden lg:block">
                        <span className="block text-xs font-medium text-zinc-300">{title}</span>
                        <span className="mt-1 block text-[0.68rem] leading-4 text-zinc-700">{detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <main className="min-w-0">
            <div className="mb-7 rounded-xl border border-white/[0.07] bg-white/[0.018] px-4 py-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-zinc-700">
                Target question
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {questionText}
              </p>
            </div>

            {level === 1 && (
              <section className="gentle-enter">
                <p className="eyebrow">Weakness</p>
                <h1 className="mt-4 text-balance text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-5xl">
                  {weaknessTitle}
                </h1>

                <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
                  <div className="rounded-[1.5rem] border border-amber-300/15 bg-amber-300/[0.045] p-6 sm:p-7">
                    <p className="eyebrow text-amber-300/70">Original evidence</p>
                    <blockquote className="mt-5 text-xl leading-8 tracking-[-0.02em] text-zinc-200">
                      &ldquo;{evidenceSnippet}&rdquo;
                    </blockquote>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] p-6 sm:p-7">
                    <p className="eyebrow">Why it matters</p>
                    <p className="mt-5 text-sm leading-7 text-zinc-400">{explanation}</p>
                  </div>
                </div>

                <div className="mt-7 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setLevel(2)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white"
                  >
                    Build the repair <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}

            {level === 2 && (
              <section className="gentle-enter">
                <p className="eyebrow">Repair frame</p>
                <h1 className="mt-4 text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-4xl">
                  Give the answer a structure that forces proof.
                </h1>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {drills.map((drill) => (
                    <button
                      key={drill.id}
                      type="button"
                      onClick={() => setSelectedDrill(drill)}
                      aria-pressed={selectedDrill.id === drill.id}
                      className={`rounded-[1.25rem] border p-5 text-left transition ${
                        selectedDrill.id === drill.id
                          ? "border-violet-300/30 bg-violet-300/[0.07]"
                          : "border-white/[0.07] bg-[#0d0f13] hover:border-white/[0.14]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{drill.name}</p>
                          <p className="mt-1 text-[0.68rem] text-violet-300">{drill.target}</p>
                        </div>
                        {selectedDrill.id === drill.id && <Check className="h-4 w-4 text-violet-200" />}
                      </div>
                      <p className="mt-4 text-xs leading-5 text-zinc-500">{drill.formula}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
                  <p className="text-xs font-medium text-zinc-300">{selectedDrill.name}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">{selectedDrill.instructions}</p>
                </div>
                <div className="mt-7 flex items-center justify-between">
                  <BackButton onClick={() => setLevel(1)} />
                  <button type="button" onClick={() => setLevel(3)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white">
                    Retry this answer <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}

            {level === 3 && (
              <section className="gentle-enter">
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <p className="eyebrow">Retry</p>
                    <h1 className="mt-4 text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-4xl">
                      Deliver the answer again.
                    </h1>
                    <p className="mt-3 text-sm text-zinc-600">{selectedDrill.formula}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleRecording}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-medium transition ${
                      isRecording
                        ? "border-red-300/25 bg-red-300/[0.08] text-red-200"
                        : "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200"
                    }`}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isRecording ? "Stop listening" : "Speak answer"}
                  </button>
                </div>

                <div className="relative mt-7">
                  <textarea
                    value={retryText}
                    onChange={(event) => setRetryText(event.target.value)}
                    rows={10}
                    autoFocus
                    placeholder="Start with the metric, state the baseline, explain your action, then show how you validated the result..."
                    className="w-full resize-y rounded-[1.5rem] border border-white/[0.085] bg-[#0d0f13] p-6 text-base leading-8 text-zinc-200 placeholder:text-zinc-700 focus:border-violet-300/35 focus:outline-none"
                  />
                  {isRecording && (
                    <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-black/70 px-3 py-1.5 text-[0.68rem] text-red-200">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-300" />
                      Listening
                    </span>
                  )}
                </div>

                {evaluationError && (
                  <div role="alert" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-xs leading-5 text-amber-100">
                    {evaluationError}
                  </div>
                )}

                <div className="mt-7 flex items-center justify-between">
                  <BackButton onClick={() => setLevel(2)} />
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!retryText.trim() || isEvaluating}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isEvaluating ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isEvaluating ? "Evaluating..." : "Compare the retry"}
                  </button>
                </div>
              </section>
            )}

            {level === 4 && evaluationResult && (
              <section className="gentle-enter">
                <p className="eyebrow">Before / after</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
                  <h1 className="max-w-3xl text-balance text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-5xl">
                    {evaluationResult.improvement_verified
                      ? "The repair moved the answer."
                      : "The gain is not verified yet."}
                  </h1>
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    evaluationResult.improvement_verified
                      ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200"
                      : "border-amber-300/20 bg-amber-300/[0.06] text-amber-200"
                  }`}>
                    {evaluationResult.improvement_verified ? "Improvement verified" : "Retry recommended"}
                  </span>
                </div>

                <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-500">
                  {evaluationResult.summary_verdict}
                </p>

                <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13]">
                  <div className="grid grid-cols-[1fr_5rem_5rem_5rem] border-b border-white/[0.07] px-5 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-700 sm:grid-cols-[1fr_8rem_8rem_8rem] sm:px-7">
                    <span>Signal</span><span>Before</span><span>After</span><span>Change</span>
                  </div>
                  {evaluationResult.deltas && evaluationResult.deltas.length > 0 ? (
                    evaluationResult.deltas.map((delta) => (
                      <div key={delta.metric_name} className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center border-b border-white/[0.055] px-5 py-5 last:border-0 sm:grid-cols-[1fr_8rem_8rem_8rem] sm:px-7">
                        <span className="text-sm font-medium text-zinc-300">{delta.metric_name}</span>
                        <span className="font-mono text-sm tabular-nums text-zinc-600">{Math.round(delta.before_value)}</span>
                        <span className="font-mono text-lg tabular-nums text-zinc-100">{Math.round(delta.after_value)}</span>
                        <span className={`font-mono text-xs tabular-nums ${delta.improved ? "text-emerald-300" : "text-zinc-600"}`}>
                          {delta.delta > 0 ? "+" : ""}{Math.round(delta.delta)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="px-7 py-8 text-sm text-zinc-600">No reliable comparison metrics were returned.</p>
                  )}
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-zinc-700">Repaired transcript</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    &ldquo;{retryText}&rdquo;
                  </p>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <button type="button" onClick={() => { setRetryText(""); setLevel(3); }} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-200">
                    <RotateCcw className="h-3.5 w-3.5" /> Try another rep
                  </button>
                  <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white">
                    Return to evidence <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 transition hover:text-zinc-200">
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}
