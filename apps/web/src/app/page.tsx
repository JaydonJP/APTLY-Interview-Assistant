import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart2, Brain, Mic } from "lucide-react";

export const metadata: Metadata = {
  title: "APTLY — Evidence-Grounded AI Interview Coach",
};

const FEATURES = [
  {
    icon: Mic,
    title: "Multimodal Analysis",
    description:
      "Measure delivery — WPM, filler words, pauses, vocal energy, eye contact — with deterministic precision.",
  },
  {
    icon: Brain,
    title: "Evidence-Grounded Coaching",
    description:
      "Every coaching item traces back to a specific measurement. No vague feedback.",
  },
  {
    icon: BarChart2,
    title: "Progress Tracking",
    description:
      "Track improvement across interviews with version-stable scoring. Know what's actually getting better.",
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
              Interview better.{" "}
              <span className="text-slate-500">Prove it.</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-slate-600">
              APTLY is an evidence-grounded AI interview coach.{" "}
              <strong>Measure</strong> your delivery. <strong>Diagnose</strong>{" "}
              the gaps. <strong>Practice</strong> with purpose.{" "}
              <strong>Verify</strong> the improvement.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              id="cta-get-started"
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              id="cta-view-docs"
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              View architecture
            </Link>
          </div>

          {/* Phase 0 notice */}
          <div
            className="mx-auto max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="note"
          >
            <strong>Phase 0</strong> — Foundation scaffold only. Interview
            engine coming in Phase 1.
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-slate-200 bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-700" aria-hidden="true" />
                </div>
                <h2 className="font-semibold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        APTLY — Interview → Measure → Diagnose → Practice → Repeat → Verify
      </footer>
    </main>
  );
}
