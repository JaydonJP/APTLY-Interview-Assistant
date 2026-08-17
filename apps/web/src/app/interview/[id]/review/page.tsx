"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { apiClient } from "@/lib/api-client";
import type { InterviewReview } from "@/types/interview";
import {
  Gauge,
  MessageSquare,
  Clock,
  Volume2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

export default function InterviewReviewPage() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id;

  const [review, setReview] = useState<InterviewReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  useEffect(() => {
    async function loadReview() {
      try {
        const data = await apiClient.get<InterviewReview>(
          `/api/v1/interviews/${interviewId}/review`,
        );
        setReview(data);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to load post-interview review.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (interviewId) {
      void loadReview();
    }
  }, [interviewId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-mono text-slate-400">
            Synthesizing Deterministic Speech Analytics...
          </p>
        </div>
      </AppShell>
    );
  }

  if (errorMessage || !review) {
    return (
      <AppShell>
        <Card className="glass-panel p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-slate-100">
            Could Not Load Review
          </h2>
          <p className="text-sm text-slate-400 mt-1 mb-6">
            {errorMessage || "Interview report not found."}
          </p>
          <Link
            href="/dashboard"
            className="rounded-xl bg-cyan-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500"
          >
            Return to Dashboard
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={review.interview.title}
        description="Phase 1 Deterministic Speech & Transcript Summary — Calculated directly from timestamped word sequences."
      />

      {/* Top Banner Notice */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4 text-xs text-cyan-200 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Measurement Before Interpretation:</strong> Speaking pace,
            filler words, and dead air pauses are computed deterministically.
          </span>
        </div>
        <span className="font-mono text-[11px] text-cyan-300/80">
          Schema v1.0
        </span>
      </div>

      {/* ── TOP STATS GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* WPM */}
        <Card className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Average Speaking Pace
            </span>
            <Gauge className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {review.average_wpm}
            </span>
            <span className="text-xs font-mono text-slate-400">WPM</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Reference band: 130–160 WPM
          </p>
        </Card>

        {/* Filler Words */}
        <Card className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Filler Words Detected
            </span>
            <Volume2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {review.total_fillers_count}
            </span>
            <span className="text-xs font-mono text-indigo-300">
              ({review.overall_filler_density}%)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Density of spoken word count
          </p>
        </Card>

        {/* Long Pauses */}
        <Card className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dead Air / Long Pauses
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {review.total_pauses_count}
            </span>
            <span className="text-xs font-mono text-amber-300">Gaps (&gt;2.0s)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Threshold: &gt;2.0s between words
          </p>
        </Card>

        {/* Total Audio Duration */}
        <Card className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Speaking Time
            </span>
            <MessageSquare className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {Math.round(review.total_duration_seconds)}
            </span>
            <span className="text-xs font-mono text-slate-400">Seconds</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Across {review.total_answers_count} answered questions
          </p>
        </Card>
      </div>

      {/* ── QUESTION-BY-QUESTION BREAKDOWN ─────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100">
          Question-by-Question Transcript & Measurements
        </h2>

        {review.questions_review.map((item, idx) => {
          const isExpanded = expandedQuestion === idx;
          const q = item.question;
          const metrics = item.speech_metrics;
          const transcript = item.transcript;

          return (
            <Card key={q.id} className="glass-panel overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-slate-900/40"
                onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-xs font-bold text-cyan-300">
                    Q{q.sequence_number}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {q.question_text}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono uppercase text-cyan-400">
                        {q.category}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-400">
                        {q.competency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {metrics && (
                    <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-300">
                      <span>{metrics.wpm} WPM</span>
                      <span className="text-slate-600">|</span>
                      <span>{metrics.filler_count} Fillers</span>
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-950/40 p-6 space-y-6">
                  {/* Full Transcript */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      <FileText className="h-4 w-4 text-cyan-400" />
                      <span>Timestamped Transcript</span>
                    </div>
                    {transcript?.full_text ? (
                      <p className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm leading-relaxed text-slate-200 font-mono">
                        &ldquo;{transcript.full_text}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs italic text-slate-500">
                        No audio answer recorded for this question.
                      </p>
                    )}
                  </div>

                  {/* Filler Words & Pauses Breakdown */}
                  {metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Exact Filler Occurrences */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 block mb-2">
                          Filler Occurrences ({metrics.filler_count})
                        </span>
                        {metrics.filler_words.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {metrics.filler_words.map((fw, fIdx) => (
                              <span
                                key={fIdx}
                                className="rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1 text-xs font-mono text-indigo-200"
                              >
                                {fw.timestamp_seconds.toFixed(1)}s &mdash; &ldquo;
                                {fw.word}&rdquo;
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-400">
                            Zero filler words detected in this answer!
                          </p>
                        )}
                      </div>

                      {/* Detected Silence Gaps */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-2">
                          Dead Air Gaps ({metrics.pause_count})
                        </span>
                        {metrics.pauses.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {metrics.pauses.map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 text-xs font-mono text-amber-200"
                              >
                                {p.start_seconds.toFixed(1)}s &ndash;{" "}
                                {p.end_seconds.toFixed(1)}s ({p.duration_seconds}s pause)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Continuous speaking without long pauses (&gt;2.0s).
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── FOOTER ACTIONS ────────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Return to Dashboard
        </Link>

        <Link
          href="/interview/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500"
        >
          <span>Start Another Practice Interview</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </AppShell>
  );
}
