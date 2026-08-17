import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Plus, ShieldCheck, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HealthCard } from "@/components/health/HealthCard";

export const metadata: Metadata = { title: "Dashboard" };

const SIGNALS = [
  ["Adaptive questioning", "Ready", "text-emerald-300"],
  ["Timestamped speech", "Ready", "text-emerald-300"],
  ["Browser capture", "Permission-based", "text-cyan-200"],
] as const;

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/8 bg-[#131923] p-6 shadow-[0_2rem_5rem_rgba(0,0,0,0.24)] sm:p-9">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-violet-400/12 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div><p className="eyebrow">Your practice lab</p><h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">Turn interview nerves into a measurable next rep.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">Set a target role, meet a role-aware interviewer, then review the exact moments that made your answer less clear.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/interview/new" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"><Plus className="h-4 w-4" />New mock interview</Link><Link href="/progress" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10">View progress<ArrowRight className="h-4 w-4" /></Link></div></div>
          <div className="rounded-2xl border border-white/8 bg-black/15 p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-white"><Sparkles className="h-4 w-4 text-violet-200" />Session readiness</div><span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Good to go</span></div><div className="mt-5 space-y-3">{SIGNALS.map(([label, value, color]) => <div key={label} className="flex items-center justify-between border-b border-white/6 pb-3 text-xs last:border-0 last:pb-0"><span className="text-slate-400">{label}</span><span className={`inline-flex items-center gap-2 font-medium ${color}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{value}</span></div>)}</div></div>
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Start here</p><h2 className="mt-2 text-xl font-semibold text-white">Choose your next move</h2></div><span className="text-xs text-slate-500">No setup debt</span></div><div className="grid gap-4 sm:grid-cols-2"><Link id="action-new-interview" href="/interview/new" className="group rounded-2xl border border-violet-300/20 bg-violet-300/8 p-5 transition hover:-translate-y-0.5 hover:border-violet-200/40"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-300/15 text-violet-100"><Plus className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-violet-200 transition group-hover:translate-x-1" /></div><h3 className="mt-6 text-sm font-semibold text-white">New interview</h3><p className="mt-2 text-sm leading-6 text-slate-400">Paste a job description and get a tailored question set.</p></Link><Link id="action-view-progress" href="/progress" className="group rounded-2xl border border-cyan-300/15 bg-cyan-300/6 p-5 transition hover:-translate-y-0.5 hover:border-cyan-200/30"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/12 text-cyan-100"><Target className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-cyan-200 transition group-hover:translate-x-1" /></div><h3 className="mt-6 text-sm font-semibold text-white">Review your progress</h3><p className="mt-2 text-sm leading-6 text-slate-400">Compare interpretable delivery and content signals over time.</p></Link></div></section>
        <HealthCard />
      </div>

      <section className="mt-8 rounded-2xl border border-white/8 bg-[#0d1118] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">What Aptly measures</p><h2 className="mt-2 text-xl font-semibold text-white">A coaching instrument, not a hiring score</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Measured delivery signals stay separate from semantic judgment, and every surfaced issue is paired with a concrete action.</p></div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4" />Private by design</div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/7 bg-white/[0.025] p-4"><Clock3 className="h-4 w-4 text-cyan-200" /><p className="mt-3 text-sm font-medium text-slate-200">Delivery</p><p className="mt-1 text-xs leading-5 text-slate-500">Pace, fillers, pauses, and replay anchors.</p></div><div className="rounded-xl border border-white/7 bg-white/[0.025] p-4"><CheckCircle2 className="h-4 w-4 text-emerald-200" /><p className="mt-3 text-sm font-medium text-slate-200">Content</p><p className="mt-1 text-xs leading-5 text-slate-500">Relevance, structure, depth, and support.</p></div><div className="rounded-xl border border-white/7 bg-white/[0.025] p-4"><BookOpen className="h-4 w-4 text-violet-200" /><p className="mt-3 text-sm font-medium text-slate-200">Practice</p><p className="mt-1 text-xs leading-5 text-slate-500">One drill that makes the next answer better.</p></div></div></section>
    </AppShell>
  );
}
