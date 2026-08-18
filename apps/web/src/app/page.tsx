import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Play,
  ShieldCheck,
} from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { UserMenu } from "@/components/auth/UserMenu";

export const metadata: Metadata = {
  title: "APTLY - Evidence-backed AI interview coaching",
  description:
    "Practice real interviews, inspect timestamped evidence, and repair weak answers immediately.",
};

const EXPERIENCES = [
  {
    number: "01",
    title: "Role intelligence",
    copy: "Turn any job description into the competencies, technical themes, and behavioral evidence the interview will test.",
  },
  {
    number: "02",
    title: "Interview room",
    copy: "A distraction-free interview where the intelligence lives in the follow-up questions, not a wall of live analytics.",
  },
  {
    number: "03",
    title: "Evidence room",
    copy: "Replay the exact timestamp, transcript span, pause, filler, claim, or delivery signal behind every important insight.",
  },
  {
    number: "04",
    title: "Repair mode",
    copy: "Retry a weak answer immediately and compare only the changes APTLY can reliably support.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08090b]">
      <header className="mx-auto flex h-[4.75rem] w-[min(100%-2rem,78rem)] items-center justify-between">
        <BrandMark href="/" />
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-xs font-medium text-zinc-500 transition hover:text-zinc-200 sm:block"
          >
            Practice
          </Link>
          <UserMenu />
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100svh-4.75rem)] w-[min(100%-2rem,78rem)] items-center gap-14 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:py-20">
        <div className="relative z-10">
          <p className="eyebrow">Evidence-backed interview coaching</p>
          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-stone-100 sm:text-7xl">
            The interview coach that asks for proof.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400">
            APTLY challenges vague answers, connects feedback to the recording,
            and helps you repair the weak moment before it becomes a habit.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/interview/new"
              className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white"
            >
              Start an interview
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#product"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.09] px-5 text-sm font-medium text-zinc-400 transition hover:border-white/[0.16] hover:text-zinc-200"
            >
              See the product
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.68rem] text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-300" />
              Feedback linked to evidence
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-300" />
              No face identification
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-20 rounded-full bg-violet-400/[0.08] blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#0d0f13] p-3 shadow-[0_3rem_8rem_rgba(0,0,0,0.42)]">
            <div className="rounded-[1.35rem] border border-white/[0.065] bg-black p-4 sm:p-5">
              <div className="flex items-center justify-between text-[0.65rem] text-zinc-600">
                <span>Evidence Room / Turn 03</span>
                <span className="font-mono tabular-nums">04:18</span>
              </div>
              <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#171a20] to-[#090a0c]">
                <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-zinc-300">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                  <p className="mt-5 max-w-md text-sm leading-6 text-zinc-300">
                    &ldquo;We improved model accuracy by 30% after rebuilding the
                    evaluation pipeline.&rdquo;
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <div className="relative h-10">
                  <span className="absolute inset-x-0 top-5 h-px bg-white/[0.09]" />
                  {[
                    ["18%", "bg-amber-300", "h-4"],
                    ["39%", "bg-violet-300", "h-6"],
                    ["63%", "bg-blue-300", "h-5"],
                    ["78%", "bg-emerald-300", "h-7"],
                  ].map(([left, color, height]) => (
                    <span
                      key={left}
                      className={`absolute top-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${color} ${height}`}
                      style={{ left }}
                    />
                  ))}
                </div>
                <div className="flex justify-between font-mono text-[0.6rem] text-zinc-700">
                  <span>00:00</span>
                  <span>01:24</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2 p-2 pt-3 sm:grid-cols-3">
              {[
                ["Challenge", "Which metric changed?"],
                ["Prove", "Baseline not stated"],
                ["Repair", "Retry with validation"],
              ].map(([title, copy], index) => (
                <div
                  key={title}
                  className={`rounded-xl border p-3 ${
                    index === 2
                      ? "border-violet-300/16 bg-violet-300/[0.05]"
                      : "border-white/[0.06] bg-white/[0.018]"
                  }`}
                >
                  <p className="text-[0.68rem] font-medium text-zinc-300">
                    {title}
                  </p>
                  <p className="mt-1 text-[0.62rem] text-zinc-700">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="product"
        className="border-y border-white/[0.065] bg-[#0b0c0f]"
      >
        <div className="mx-auto w-[min(100%-2rem,78rem)] py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
              <p className="eyebrow">The product</p>
              <h2 className="mt-4 max-w-sm text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-4xl">
                Four experiences. One deliberate practice loop.
              </h2>
            </div>
            <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {EXPERIENCES.map((item) => (
                <div
                  key={item.number}
                  className="grid gap-3 py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-start"
                >
                  <span className="font-mono text-xs text-zinc-700">
                    {item.number}
                  </span>
                  <h3 className="text-sm font-medium text-zinc-200">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-6 text-zinc-500">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(100%-2rem,78rem)] py-20 text-center sm:py-28">
        <p className="eyebrow">Your next rep</p>
        <h2 className="mx-auto mt-5 max-w-2xl text-balance text-4xl font-medium tracking-[-0.045em] text-stone-100 sm:text-5xl">
          Stop collecting advice. Repair the answer.
        </h2>
        <Link
          href="/interview/new"
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white"
        >
          Build your role profile <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-white/[0.065]">
        <div className="mx-auto flex w-[min(100%-2rem,78rem)] flex-col gap-3 py-7 text-[0.68rem] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <span>APTLY / Evidence-backed interview coaching</span>
          <span>Challenge. Prove. Repair.</span>
        </div>
      </footer>
    </main>
  );
}
