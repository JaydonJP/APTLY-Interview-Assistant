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
import { AnswerDNACard } from "@/components/dna/AnswerDNACard";
import { DualPerspectivePanelCard } from "@/components/panel/DualPerspectivePanelCard";
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

        {/* Dual-Perspective Panel Evaluation Report */}
        {review.panel_report && (
          <DualPerspectivePanelCard panelReport={review.panel_report} />
        )}

        {/* Habits, Confidence Crumble & Privacy Note */}
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

            {/* Confidence-Trend Detection Card (Where Candidate Crumbled) */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/[0.15] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Flame className="h-4 w-4 text-amber-400" />
                Confidence-Trend & Crumble Point
              </div>
              {report?.crumble_point ? (
                <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs">
                  <span className="font-bold text-rose-300 block mb-1">
                    ⚠️ Crumble Point Detected (Question {report.crumble_point.question_number})
                  </span>
                  <p className="text-slate-300 leading-relaxed">{report.crumble_point.note}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  Consistent performance across turns. No severe confidence collapse was detected during this session.
                </p>
              )}
            </div>

            {/* Privacy & Data Handling Note */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/[0.15] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Privacy & Security Guarantee
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <p><span className="font-bold text-emerald-300">Processing:</span> WebRTC and MediaRecorder streams are processed ephemerally.</p>
                <p><span className="font-bold text-emerald-300">Storage:</span> Saved in encrypted object storage strictly under candidate UUID.</p>
                <p><span className="font-bold text-emerald-300">Retention:</span> Can be deleted anytime on candidate request or auto-purged post-session.</p>
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
              {review.questions_review.map((item, index) => {
                const persona = item.question.interviewer_persona;
                const isHr = persona && String(persona).toUpperCase().includes("HR");
                return (
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="block text-[10px] uppercase tracking-wider">
                        Question {item.question.sequence_number}
                      </span>
                      {persona && (
                        <span
                          className={`rounded px-1 text-[9px] font-bold ${
                            isHr
                              ? "bg-violet-950 text-violet-300 border border-violet-800/50"
                              : "bg-cyan-950 text-cyan-300 border border-cyan-800/50"
                          }`}
                        >
                          {isHr ? "HR" : "Tech"}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 block max-w-[9rem] truncate text-xs font-medium">
                      {item.question.competency}
                    </span>
                  </button>
                );
              })}
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Question {currentItem?.question.sequence_number}
                    </p>
                    {currentItem?.question.interviewer_persona && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          String(currentItem.question.interviewer_persona).toUpperCase().includes("HR")
                            ? "bg-violet-950 text-violet-300 border border-violet-800/50"
                            : "bg-cyan-950 text-cyan-300 border border-cyan-800/50"
                        }`}
                      >
                        {String(currentItem.question.interviewer_persona).toUpperCase().includes("HR")
                          ? "Sarah Chen (HR)"
                          : "Alex Rivera (Tech Lead)"}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-white">
                    {currentItem?.question.question_text}
                  </h3>
                </div>
              </div>

              <EvidenceTimeline
                events={currentQuestionEvents}
                onSelectEvent={focusEvent}
                onSeek={(sec) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = sec;
                    setCurrentTime(sec);
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Answer DNA Breakdown */}
        <AnswerDNACard
          category={currentItem?.question.category ?? "technical"}
          technicalDna={currentItem?.technical_dna}
          behavioralDna={currentItem?.behavioral_dna}
        />

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
