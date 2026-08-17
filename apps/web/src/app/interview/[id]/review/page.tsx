"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Flame,
  Gauge,
  LockKeyhole,
  Mic2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { apiClient, getMediaUrl } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { EvidenceTimeline } from "@/components/evidence/EvidenceTimeline";
import { RepairModeModal } from "@/components/repair/RepairModeModal";
import type {
  ContentMetrics,
  EvidenceEvent,
  InterviewReportCard,
  InterviewReview,
  QuestionReviewItem,
} from "@/types/interview";

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, "0")}:${(safeSeconds % 60).toString().padStart(2, "0")}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-200";
  if (score >= 60) return "text-amber-200";
  return "text-rose-200";
}

function MetricTile({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-[#131923]/85 p-4 ${accent}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
      <p className="mt-4 font-mono text-3xl text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={`font-mono ${scoreColor(score)}`}>{Math.round(score)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/7">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-300 to-cyan-300 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

export default function InterviewReviewPage() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id;
  const [review, setReview] = useState<InterviewReview | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRepairOpen, setIsRepairOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadReview() {
      try {
        const data = await apiClient.get<InterviewReview>(`/api/v1/interviews/${interviewId}/review`);
        if (!cancelled) setReview(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "The report could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (interviewId) void loadReview();
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  const currentItem: QuestionReviewItem | undefined = review?.questions_review[selectedIndex];
  const content: ContentMetrics | null | undefined = currentItem?.content_metrics;
  const report: InterviewReportCard | null = review?.report_card ?? null;
  const currentVideoUrl = currentItem?.answer?.audio_storage_key
    ? getMediaUrl(currentItem.answer.audio_storage_key)
    : null;
  const events = report?.evidence_events ?? [];
  const currentQuestionEvents = events.filter(
    (event) => event.question_number === currentItem?.question.sequence_number,
  );

  const selectQuestion = (index: number, seekSeconds?: number) => {
    setSelectedIndex(index);
    setCurrentTime(0);
    setPendingSeek(seekSeconds ?? null);
  };

  const focusEvent = (event: EvidenceEvent) => {
    const questionIndex =
      review?.questions_review.findIndex(
        (item) => item.question.sequence_number === event.question_number,
      ) ?? -1;
    if (questionIndex >= 0) selectQuestion(questionIndex, event.start_seconds);
  };

  const onVideoReady = () => {
    if (videoRef.current && pendingSeek !== null) {
      videoRef.current.currentTime = pendingSeek;
      setCurrentTime(pendingSeek);
      void videoRef.current.play().catch(() => undefined);
      setPendingSeek(null);
    }
  };

  if (loading)
    return (
      <AppShell>
        <LoadingState size="lg" message="Compiling your evidence-backed report..." />
      </AppShell>
    );

  if (error || !review)
    return (
      <AppShell>
        <ErrorState
          title="Could not load this report"
          message={error ?? "Review data is unavailable."}
          onRetry={() => window.location.reload()}
        />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="space-y-7 pb-16">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Interview report</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Your answer, with receipts.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              {review.role_profile?.role_title ?? review.interview.title} · {review.total_answers_count} answer
              {review.total_answers_count === 1 ? "" : "s"} reviewed · {report?.confidence_label ?? "Evidence linked"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              New interview
            </Link>
            <button
              type="button"
              onClick={() => setIsRepairOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 shadow-lg shadow-white/10"
            >
              <Sparkles className="h-4 w-4" />
              Repair weak answer
            </button>
          </div>
        </div>

        {/* Score Summary Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Overall report"
            value={report ? `${Math.round(report.overall_score)}` : "—"}
            note="Content + delivery"
            accent="border-violet-300/15"
          />
          <MetricTile
            label="Content"
            value={report ? `${Math.round(report.content_score)}` : "—"}
            note="Relevance, depth, proof"
            accent="border-cyan-300/15"
          />
          <MetricTile
            label="Delivery"
            value={report ? `${Math.round(report.delivery_score)}` : "—"}
            note="Measured speech signals"
            accent="border-emerald-300/15"
          />
          <MetricTile
            label="Filler words"
            value={`${review.total_fillers_count}`}
            note={`${review.overall_filler_density}% of words`}
            accent="border-amber-300/15"
          />
        </section>

        {/* Next Rep & Measurement Notes */}
        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Next rep</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {report?.next_session_focus ?? "Keep the headline-first structure."}
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-300/12 text-violet-100">
                <Target className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              Aptly ranks coaching opportunities by severity and ties each one to a drill. Fix one behavior, then run the
              question again.
            </p>
            <button
              type="button"
              onClick={() => setIsRepairOpen(true)}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
            >
              Open Repair Mode <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1118] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Measurement notes
              </div>
              <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                Transparent
              </span>
            </div>
            <div className="mt-5 space-y-3 text-xs leading-5 text-slate-400">
              {(report?.delivery.metric_notes ?? ["Timestamped speech metrics are deterministic."]).map((note) => (
                <div key={note} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {note}
                </div>
              ))}
              <div className="flex gap-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                Raw camera analysis is not used for identity or emotion inference.
              </div>
            </div>
          </div>
        </section>

        {/* Habits & Evidence Replay */}
        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/6 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <Flame className="h-4 w-4" />
                Three habits worth fixing
              </div>
              <div className="mt-5 space-y-3">
                {(report?.top_habits ?? []).map((habit) => (
                  <div key={habit.id} className="rounded-xl border border-white/8 bg-black/15 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{habit.title}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{habit.observation}</p>
                      </div>
                      <span className="flex shrink-0 gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <span
                            key={level}
                            className={`h-1.5 w-1.5 rounded-full ${
                              level <= habit.severity ? "bg-amber-200" : "bg-white/10"
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    <div className="mt-4 border-t border-white/8 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/80">
                        Practice drill · {habit.drill_title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{habit.drill_instructions}</p>
                    </div>
                  </div>
                ))}
                {!report?.top_habits.length && (
                  <p className="text-sm text-slate-400">No high-priority habit was detected in this session.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-violet-200" />
                What landed
              </div>
              <div className="mt-4 space-y-3">
                {(report?.strengths ?? []).map((strength) => (
                  <div key={strength} className="flex gap-3 text-sm leading-6 text-slate-400">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                    {strength}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Evidence replay</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Click a moment. See why it matters.</h2>
              </div>
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Waves className="h-4 w-4 text-cyan-200" />
                {events.length} linked moments
              </span>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {review.questions_review.map((item, index) => (
                <button
                  key={item.question.id}
                  type="button"
                  onClick={() => selectQuestion(index)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                    selectedIndex === index
                      ? "border-violet-300/35 bg-violet-300/12 text-white"
                      : "border-white/8 bg-white/[0.03] text-slate-500 hover:text-white"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-wider">
                    Question {item.question.sequence_number}
                  </span>
                  <span className="mt-1 block max-w-[9rem] truncate text-xs font-medium">
                    {item.question.competency}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-black">
                <div className="relative aspect-video bg-[#080a0f]">
                  {currentVideoUrl ? (
                    <video
                      ref={videoRef}
                      src={currentVideoUrl}
                      controls
                      playsInline
                      onLoadedMetadata={onVideoReady}
                      onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                      <Mic2 className="h-8 w-8 text-slate-700" />
                      <p className="text-xs text-slate-500">No recording attached to this answer.</p>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-400">
                    {formatTime(currentTime)}
                  </span>
                </div>
                <div className="border-t border-white/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Question {currentItem?.question.sequence_number}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{currentItem?.question.question_text}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/8 bg-black/15 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Delivery snapshot</span>
                    <span className="text-[10px] text-emerald-200">Deterministic</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.04] p-3">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Gauge className="h-3.5 w-3.5" />
                        Pace
                      </div>
                      <p className="mt-2 font-mono text-xl text-white">
                        {currentItem?.speech_metrics?.wpm ?? 0}
                        <span className="ml-1 text-xs text-slate-500">WPM</span>
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] p-3">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Flame className="h-3.5 w-3.5" />
                        Fillers
                      </div>
                      <p className="mt-2 font-mono text-xl text-white">
                        {currentItem?.speech_metrics?.filler_count ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <ScoreBar label="Content quality" score={content?.overall_content_score ?? 0} />
                    <ScoreBar label="Relevance" score={content?.relevance_score ?? 0} />
                    <ScoreBar label="Technical depth" score={content?.technical_depth_score ?? 0} />
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/6 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100">
                    <Eye className="h-4 w-4" />
                    Camera attention estimate
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {report?.delivery.camera_attention_estimate == null
                      ? "Not available for this session."
                      : `${Math.round(report.delivery.camera_attention_estimate)}% · reliability ${Math.round(
                          (report.delivery.camera_attention_reliability ?? 0) * 100,
                        )}%`}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    Aptly labels this as an estimate, not laboratory eye tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence Timeline */}
            <div className="mt-6 border-t border-white/8 pt-5">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-300" />
                  Universal Evidence Events
                </div>
                <span className="font-normal normal-case text-slate-500">
                  {currentQuestionEvents.length} event{currentQuestionEvents.length === 1 ? "" : "s"} in this turn
                </span>
              </div>
              <EvidenceTimeline
                events={currentQuestionEvents.length ? currentQuestionEvents : events}
                totalDurationMs={(currentItem?.answer?.duration_seconds || 60) * 1000}
                onSelectEvent={focusEvent}
                onSeek={(sec) => {
                  setPendingSeek(sec);
                  if (videoRef.current) {
                    videoRef.current.currentTime = sec;
                    setCurrentTime(sec);
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Transcript & Content Feedback */}
        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1118] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileText className="h-4 w-4 text-violet-200" />
              Transcript
            </div>
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-white/7 bg-black/15 p-4 text-sm leading-7 text-slate-300">
              {currentItem?.transcript?.words?.length
                ? currentItem.transcript.words.map((word, index) => (
                    <button
                      key={`${word.word}-${index}`}
                      type="button"
                      onClick={() => {
                        setPendingSeek(word.start_seconds);
                        if (videoRef.current) {
                          videoRef.current.currentTime = word.start_seconds;
                          setCurrentTime(word.start_seconds);
                        }
                      }}
                      className={`mr-1 rounded px-1 transition ${
                        currentTime >= word.start_seconds && currentTime <= word.end_seconds
                          ? "bg-violet-300/25 text-white"
                          : "hover:bg-white/8"
                      }`}
                    >
                      {word.word}
                    </button>
                  ))
                : currentItem?.transcript?.full_text ?? "No timestamped transcript available."}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#131923]/85 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-violet-200" />
              Content readout
            </div>
            {content ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm leading-6 text-slate-400">{content.reasoning_summary}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {content.feedback.slice(0, 2).map((feedback) => (
                    <div key={feedback.observation} className="rounded-xl border border-white/7 bg-black/10 p-3">
                      <p className="text-xs font-semibold text-slate-200">{feedback.observation}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{feedback.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                Content evaluation is still processing for this answer.
              </div>
            )}
          </div>
        </section>

        {/* 7-Stage Repair Mode Modal */}
        <RepairModeModal
          isOpen={isRepairOpen}
          onClose={() => setIsRepairOpen(false)}
          interviewId={interviewId}
          questionId={currentItem?.question.id ?? ""}
          questionText={currentItem?.question.question_text ?? ""}
          weaknessTitle={report?.top_habits[0]?.title ?? "Unsupported Claim & Baseline Gap"}
          evidenceSnippet={currentItem?.transcript?.full_text?.slice(0, 100) ?? "Answer transcript snippet"}
          explanation={report?.top_habits[0]?.observation ?? "Gaps in metric baseline or delivery evidence."}
          initialBeforeEvidence={Math.round(content?.evidence_score ?? 42)}
          initialBeforeFillers={currentItem?.speech_metrics?.filler_count ?? 7}
          initialBeforeStructure={Math.round(content?.structure_score ?? 58)}
        />
      </div>
    </AppShell>
  );
}
