"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BrainCircuit, Check, LockKeyhole, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { apiClient, getLearnerId } from "@/lib/api-client";
import type { LearnerProgress } from "@/types/progress";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-200";
  if (score >= 60) return "text-amber-200";
  return "text-rose-200";
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiClient
      .get<LearnerProgress>(`/api/v1/progress?learner_id=${encodeURIComponent(getLearnerId())}`)
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
  }, []);

  const topics = progress?.topics ?? [];
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Progress lab</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Build a trend you can trust.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Every evaluated answer updates your topic mastery and the next interview difficulty recommendation.</p>
        </div>
        <Link href="/interview/new" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">Start next session <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <section className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Sessions", progress?.sessions_completed ?? 0, "Completed interviews"],
          ["Answers reviewed", progress?.answers_reviewed ?? 0, "Semantic evaluations"],
          ["Average correctness", progress ? `${Math.round(progress.average_score)}` : "—", "Across tracked topics"],
          ["Next difficulty", progress?.recommended_difficulty ?? "—", "Progression recommendation"],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="rounded-2xl border border-white/8 bg-[#131923]/85 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p><p className="mt-4 font-mono text-3xl capitalize text-white">{loading ? "…" : value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>
        ))}
      </section>

      <section className="relative mt-5 overflow-hidden rounded-2xl border border-violet-300/15 bg-violet-300/7 p-6 sm:p-8"><div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-violet-300/10 blur-3xl" /><div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-violet-100"><Sparkles className="h-4 w-4" /><span className="text-sm font-semibold">Adaptive progression</span></div><h2 className="mt-4 max-w-xl text-2xl font-semibold tracking-tight text-white">Practice → measure → connect → level up.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">APTLY raises the challenge after consistent topic-level correctness. A weak topic stays visible until another answer demonstrates mastery.</p></div><div className="grid min-w-[18rem] gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-500">Progression status</span><span className="text-emerald-200">{progress?.recommended_difficulty ?? "Baseline"}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-300" style={{ width: `${Math.min(100, progress?.average_score ?? 0)}%` }} /></div><div className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />Scores stay tied to persisted evidence</div></div></div></section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]"><div className="rounded-2xl border border-white/8 bg-[#0d1118] p-5 sm:p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-white"><BrainCircuit className="h-4 w-4 text-cyan-200" />Knowledge graph</div><span className="text-xs text-slate-500">{topics.length} topics · {progress?.edges.length ?? 0} connections</span></div>{topics.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{topics.map((topic) => <div key={topic.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{topic.name}</p><p className="mt-1 text-[11px] capitalize text-slate-500">{topic.category} · {topic.attempts} attempt{topic.attempts === 1 ? "" : "s"}</p></div><span className={`font-mono text-sm ${scoreColor(topic.mastery_score)}`}>{Math.round(topic.mastery_score)}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300" style={{ width: `${Math.min(100, topic.mastery_score)}%` }} /></div><p className="mt-2 text-[11px] leading-5 text-slate-500">Last answer {Math.round(topic.last_score)}/100 · {topic.correct_attempts} correct</p></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm leading-6 text-slate-500">Answer your first interview question to grow the graph. Each question adds its expected topics, competency, and newly discovered concepts.</div>}</div><div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5 sm:p-6"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><Check className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-white">What gets tracked</h2><p className="mt-1 text-xs leading-5 text-slate-500">The database keeps the progress durable across sessions.</p></div></div><div className="mt-5 space-y-4 text-sm leading-6 text-slate-400"><p><BarChart3 className="mr-2 inline h-4 w-4 text-cyan-200" />Correctness, topic coverage, evidence, and speech habits.</p><p><BrainCircuit className="mr-2 inline h-4 w-4 text-violet-200" />Topic co-occurrence edges show which concepts you practice together.</p><p><Sparkles className="mr-2 inline h-4 w-4 text-amber-200" />The next difficulty is recommended from your accumulated mastery.</p></div></div></section>
    </AppShell>
  );
}
