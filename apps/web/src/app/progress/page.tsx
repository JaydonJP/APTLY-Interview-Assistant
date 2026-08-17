import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, LockKeyhole, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Progress" };

const METRICS = [
  ["Filler rate", "—", "Complete one session to set a baseline"],
  ["Speaking pace", "—", "Compare against the 130–160 WPM coaching band"],
  ["Evidence quality", "—", "Track how often claims land with proof"],
] as const;

export default function ProgressPage() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Progress lab</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Build a trend you can trust.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Aptly compares like-for-like sessions using versioned metrics. Your first session becomes a baseline, not a verdict.</p></div><Link href="/interview/new" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">Start baseline<ArrowRight className="h-4 w-4" /></Link></div>
      <section className="mt-9 grid gap-4 md:grid-cols-3">{METRICS.map(([label, value, note]) => <div key={label} className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-300">{label}</span><BarChart3 className="h-4 w-4 text-slate-600" /></div><p className="mt-7 font-mono text-4xl text-slate-600">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{note}</p></div>)}</section>
      <section className="relative mt-5 overflow-hidden rounded-2xl border border-violet-300/15 bg-violet-300/7 p-6 sm:p-8"><div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-violet-300/10 blur-3xl" /><div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-violet-100"><Sparkles className="h-4 w-4" /><span className="text-sm font-semibold">Your progress story starts with evidence</span></div><h2 className="mt-4 max-w-xl text-2xl font-semibold tracking-tight text-white">Practice → measure → repeat → verify.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">When you return, Aptly will show trends for fillers per minute, pace, long pauses, camera attention, STAR coverage, and evidence quality.</p></div><div className="grid min-w-[18rem] gap-3 rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-500">Baseline status</span><span className="text-amber-200">Not started</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[8%] rounded-full bg-violet-300" /></div><div className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />No score inflation across versions</div></div></div></section>
      <section className="mt-8 rounded-2xl border border-white/8 bg-[#0d1118] p-6"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><Check className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-white">The comparison rule</h2><p className="mt-1 text-xs leading-5 text-slate-500">Only compare sessions produced by the same scoring algorithm version. Upgrades never manufacture improvement.</p></div></div></section>
    </AppShell>
  );
}
