import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Eye,
  Mic2,
  Play,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

import { UserMenu } from "@/components/auth/UserMenu";

export const metadata: Metadata = {
  title: "APTLY — Evidence-backed AI interview coaching",
};

const PROOF_POINTS = [
  {
    icon: Sparkles,
    title: "Adaptive questions",
    description: "Follow-ups react to what you actually said, including vague claims that deserve proof.",
  },
  {
    icon: Eye,
    title: "Replayable evidence",
    description: "Timestamped fillers, pauses, transcript spans, and content notes stay tied to the recording.",
  },
  {
    icon: BarChart3,
    title: "A better next rep",
    description: "Leave with one focused drill and a clear retry target instead of a wall of generic advice.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="grid-noise pointer-events-none absolute inset-x-0 top-0 h-[42rem] opacity-60" />

      <header className="relative mx-auto flex w-full max-w-[82rem] items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="APTLY home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-400/15 text-sm font-bold text-violet-100">A</span>
          <span className="text-sm font-semibold tracking-[0.22em] text-white">APTLY</span>
        </Link>
        <div className="hidden items-center gap-5 text-sm text-slate-400 md:flex">
          <span>Evidence-backed coaching</span>
          <span className="h-1 w-1 rounded-full bg-emerald-300" />
          <span>Browser-first privacy</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-slate-300 transition hover:text-white hidden sm:inline">Workspace</Link>
          <UserMenu />
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[82rem] items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-28 lg:pt-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 text-xs font-medium text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0.7rem_rgba(69,211,154,0.8)]" />
            Built for the interview after the interview
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-7xl">
            Interview better.
            <span className="gradient-text block">Prove it.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
            Aptly conducts a role-aware voice interview, measures how you deliver the answer, and takes you back to the moments worth fixing.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link id="cta-get-started" href="/dashboard" className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
              Start a mock interview
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              <Play className="h-4 w-4 text-cyan-200" />
              See the loop
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> No face identification</span>
            <span className="inline-flex items-center gap-2"><Mic2 className="h-4 w-4 text-violet-300" /> Audio + camera capture</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[2.5rem] bg-violet-400/10 blur-3xl" />
          <div className="relative rounded-[1.75rem] border border-white/10 bg-[#0d1118]/90 p-3 shadow-[0_2rem_7rem_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-4 py-3">
              <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-300" /><span className="text-xs font-medium text-slate-200">Interview evidence</span></div>
              <span className="font-mono text-[11px] text-slate-500">SESSION 04 / REVIEW</span>
            </div>
            <div className="grid gap-3 p-2 pt-3 sm:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-white/8 bg-[#161d28] p-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500"><span>Q3 · Follow-up</span><span className="font-mono">04:18</span></div>
                <p className="mt-7 text-base leading-7 text-slate-200">“What metric improved, and how did you validate the result?”</p>
                <div className="mt-10 flex h-16 items-end gap-1.5 border-b border-white/8 pb-2">
                  {[18, 25, 22, 42, 36, 54, 44, 30, 48, 62, 46, 70, 50, 34, 44, 58, 38, 28, 48, 60].map((height, index) => <span key={index} className={`w-full rounded-t-sm ${index > 13 ? "bg-cyan-300/70" : "bg-violet-300/45"}`} style={{ height: `${height}%` }} />)}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500"><span>00:00</span><span>Answer waveform</span><span>01:42</span></div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/7 p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-amber-200">Coaching moment</span><span className="font-mono text-[11px] text-amber-200/60">04:18</span></div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Unsupported result claim. Add a baseline and validation method.</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-amber-300" /></div>
                </div>
                <div className="rounded-xl border border-white/8 bg-[#161d28] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Evidence linked</div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-white/[0.04] p-3"><p className="font-mono text-lg text-white">142</p><p className="mt-1 text-[10px] text-slate-500">WPM</p></div><div className="rounded-lg bg-white/[0.04] p-3"><p className="font-mono text-lg text-white">02</p><p className="mt-1 text-[10px] text-slate-500">Fillers</p></div></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/6 px-4 py-3 text-xs text-cyan-100"><Waves className="h-4 w-4" /><span>Challenge → Prove → Repair</span><span className="ml-auto text-cyan-200/50">01</span></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative border-y border-white/8 bg-white/[0.02]">
        <div className="mx-auto grid max-w-[82rem] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div><p className="eyebrow">The Aptly loop</p><h2 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-white">Every score has proof. Every weakness gets an action.</h2></div>
          <div className="grid gap-4 sm:grid-cols-3">{PROOF_POINTS.map(({ icon: Icon, title, description }) => <div key={title} className="rounded-2xl border border-white/8 bg-[#0d1118] p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-sm font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>)}</div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[82rem] flex-col gap-3 px-4 py-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>APTLY · evidence-backed AI interview coaching</span><span>Privacy is a product feature, not a footnote.</span></footer>
    </main>
  );
}
