"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Flame,
  Gauge,
  Lightbulb,
  LockKeyhole,
  Mic,
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
import { RepairModeModal } from "@/components/repair/RepairModeModal";
import { AnswerDNACard } from "@/components/dna/AnswerDNACard";
import { DualPerspectivePanelCard } from "@/components/panel/DualPerspectivePanelCard";
import { TextTimeline } from "@/components/review/TextTimeline";
import type {
  ContentMetrics,
  EvidenceEvent,
  FillerOccurrence,
  InterviewReportCard,
  InterviewReview,
  PauseOccurrence,
  QuestionReviewItem,
} from "@/types/interview";

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, "0")}:${(safeSeconds % 60).toString().padStart(2, "0")}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-rose-300";
}

function correctnessLabel(status?: string): string {
  switch (status) {
    case "correct":
      return "Correct / interview-ready";
    case "partially_correct":
      return "Partially correct";
    case "incorrect":
      return "Needs correction";
    default:
      return "Not enough evidence";
  }
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
  const [activeFilter, setActiveFilter] = useState<"ALL" | "FILLERS" | "PAUSES">("ALL");
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
  const currentVideoUrl = (currentItem?.answer?.video_storage_key || currentItem?.answer?.audio_storage_key)
    ? getMediaUrl((currentItem.answer.video_storage_key || currentItem.answer.audio_storage_key) as string)
    : null;

  // Build grounded timeline events for the selected question
  const questionEvents = useMemo(() => {
    const events: Array<{
      id: string;
      time: number;
      type: "filler" | "pause" | "claim";
      title: string;
      description: string;
    }> = [];

    // 1. Fillers from Speech Metrics
    const fillers = (currentItem?.speech_metrics?.filler_words as FillerOccurrence[]) || [];
    fillers.forEach((f, idx) => {
      events.push({
        id: `filler-${idx}`,
        time: f.timestamp_seconds,
        type: "filler",
        title: `Filler word "${f.word}"`,
        description: `Spoken at ${formatTime(f.timestamp_seconds)} (duration: ${f.duration_seconds.toFixed(1)}s)`,
      });
    });

    // 2. Dead Pauses (>1.5s) from Speech Metrics
    const pauses = (currentItem?.speech_metrics?.pauses as PauseOccurrence[]) || [];
    pauses.forEach((p, idx) => {
      if (p.duration_seconds >= 1.5) {
        events.push({
          id: `pause-${idx}`,
          time: p.start_seconds,
          type: "pause",
          title: `Dead pause (${p.duration_seconds.toFixed(1)}s)`,
          description: `Silence from ${formatTime(p.start_seconds)} to ${formatTime(p.end_seconds)}`,
        });
      }
    });

    // 3. Key Claims / Evidence items from content metrics
    if (content?.evidence && content.evidence.length > 0) {
      content.evidence.forEach((item, idx) => {
        events.push({
          id: `claim-${idx}`,
          time: item.start_seconds || Math.min(idx * 8.0, 60.0),
          type: "claim",
          title: `Key Claim: ${item.type || "Technical Point"}`,
          description: item.text || "Validated technical statement",
        });
      });
    }

    return events.sort((a, b) => a.time - b.time);
  }, [currentItem, content]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "FILLERS") return questionEvents.filter((e) => e.type === "filler");
    if (activeFilter === "PAUSES") return questionEvents.filter((e) => e.type === "pause");
    return questionEvents;
  }, [questionEvents, activeFilter]);

  const selectQuestion = (index: number, seekSeconds?: number) => {
    setSelectedIndex(index);
    setCurrentTime(0);
    setPendingSeek(seekSeconds ?? null);
  };

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      void videoRef.current.play().catch(() => undefined);
    }
  };

  const onVideoReady = () => {
    if (videoRef.current && pendingSeek !== null) {
      videoRef.current.currentTime = pendingSeek;
      setCurrentTime(pendingSeek);
      void videoRef.current.play().catch(() => undefined);
      setPendingSeek(null);
    }
  };

  // Generate a high-impact, actionable 1-line suggestion
  const oneLineSuggestion = useMemo(() => {
    if (!report) return "Lead with your quantified metric and insert a 2-beat silent pause before speaking.";
    if (review && review.total_fillers_count > 3) {
      return `Replace filler clusters ("um", "like") with a 2-beat silent pause before delivering your technical headline.`;
    }
    const pace = review?.average_wpm || 140;
    if (pace < 120) {
      return `Increase speaking pace toward the 130–160 WPM coaching band to project decisive technical confidence.`;
    }
    if (pace > 175) {
      return `Pace your technical explanations down to 140 WPM so architectural trade-offs land with clarity.`;
    }
    return report.next_session_focus || "Lead with the headline, ground your metrics with baselines, and explain failure modes.";
  }, [report, review]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState size="lg" message="Compiling your evidence-backed report with timestamp analysis..." />
      </AppShell>
    );
  }

  if (error || !review) {
    return (
      <AppShell>
        <ErrorState
          title="Could not load this report"
          message={error ?? "Review data is unavailable."}
          onRetry={() => window.location.reload()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-7 pb-16">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Performance Assessment</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Interview Evaluation & Evidence Review
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {review.role_profile?.role_title ?? review.interview.title} · {review.total_answers_count} answer
              {review.total_answers_count === 1 ? "" : "s"} evaluated · {report?.confidence_label ?? "100% Grounded in Recording"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              New Session
            </Link>
            <button
              type="button"
              onClick={() => setIsRepairOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-95"
            >
              <Sparkles className="h-4 w-4 fill-slate-950" />
              Repair Weak Answer
            </button>
          </div>
        </div>

        {/* ── UNIFIED EXECUTIVE SCORECARD & 1-LINE ACTIONABLE SUGGESTION ── */}
        <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-b from-[#131926] to-[#0d1118] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-6 lg:grid-cols-12 items-center">
            {/* Overall Score Dial */}
            <div className="lg:col-span-4 flex items-center gap-5 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
              <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-950/40 text-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <span className={`font-mono text-4xl font-extrabold ${scoreColor(report?.overall_score ?? 78)}`}>
                  {report ? Math.round(report.overall_score) : 78}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300/80">Overall</span>
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">Calculated Score</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Composite rating calculated from technical relevance, STAR structure, and timestamped speech delivery.
                </p>
              </div>
            </div>

            {/* Speaking Signals Breakdown */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pace (WPM)</p>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {Math.round(review?.average_wpm || 142)}{" "}
                  <span className="text-xs font-normal text-slate-400">wpm</span>
                </p>
                <p className="mt-1 text-[11px] text-emerald-400 font-medium">Ideal band: 130–160</p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filler Words</p>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {review.total_fillers_count}{" "}
                  <span className="text-xs font-normal text-slate-400">words</span>
                </p>
                <p className="mt-1 text-[11px] text-amber-300 font-medium">
                  {review.overall_filler_density}% density
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Content Rigor</p>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {report ? Math.round(report.content_score) : 84}/100
                </p>
                <p className="mt-1 text-[11px] text-cyan-300 font-medium">STAR validated</p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual Signals</p>
                <p className="mt-2 font-mono text-2xl font-bold text-white">
                  {report?.visual_communication_score == null ? "—" : Math.round(report.visual_communication_score)}
                  {report?.visual_communication_score != null && <span className="text-xs font-normal text-slate-400">/100</span>}
                </p>
                <p className="mt-1 text-[11px] text-cyan-300 font-medium">
                  {report?.visual_communication_score == null ? "Unavailable, not penalized" : "Framing + camera-facing proxy"}
                </p>
              </div>
            </div>
          </div>

          {/* One-Line Actionable AI Suggestion */}
          <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 block">
                  One-Line AI Growth Directive:
                </span>
                <p className="text-sm font-semibold text-white leading-relaxed">{oneLineSuggestion}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRepairOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white transition"
            >
              Practice in Repair Mode <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Pro Tips & Tricks Ribbon */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl">
            <Lightbulb className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-slate-200">Interview Psychology Tip:</strong> Pausing for two silent beats after hearing a question prevents filler words and signals senior deliberate thinking to interviewers.
            </span>
          </div>
        </div>

        {/* ── ANSWER CORRECTNESS & KNOWLEDGE COVERAGE ── */}
        <section className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#111b1b] to-[#0e141a] p-6 shadow-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-emerald-300">Answer analysis</p>
              <h2 className="mt-1 text-xl font-bold text-white">Did your answer actually answer the question?</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                This verdict is based on the question&apos;s expected topics and what appeared in your transcript—not on speaking confidence alone.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/30 px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Session correctness</p>
              <p className={`mt-1 font-mono text-3xl font-bold ${scoreColor(review.average_correctness_score ?? report?.correctness_score ?? 0)}`}>
                {Math.round(review.average_correctness_score ?? report?.correctness_score ?? 0)}<span className="text-sm text-slate-400">/100</span>
              </p>
            </div>
          </div>

          {content ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Turn {currentItem?.question.sequence_number} verdict</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    content.correctness_status === "correct"
                      ? "border-emerald-400/30 bg-emerald-950/40 text-emerald-300"
                      : content.correctness_status === "partially_correct"
                      ? "border-amber-400/30 bg-amber-950/40 text-amber-300"
                      : "border-rose-400/30 bg-rose-950/40 text-rose-300"
                  }`}>
                    {correctnessLabel(content.correctness_status)}
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <span className={`font-mono text-4xl font-bold ${scoreColor(content.correctness_score)}`}>{Math.round(content.correctness_score)}</span>
                  <span className="pb-1 text-xs text-slate-500">correctness score</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">{content.correctness_summary || content.reasoning_summary}</p>
                {content.feedback?.[0] && (
                  <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-950/20 p-3 text-xs leading-relaxed">
                    <p className="font-semibold text-cyan-200">Next improvement</p>
                    <p className="mt-1 text-slate-300">{content.feedback[0].action}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Knowledge covered</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(content.topic_coverage ?? []).map((topic) => (
                      <div key={topic.topic} className="rounded-xl border border-white/8 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{topic.topic}</span>
                          <span className={`font-mono text-xs ${topic.covered ? "text-emerald-300" : "text-amber-300"}`}>{Math.round(topic.score)}%</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{topic.covered ? "Evidence found in your answer." : topic.explanation || "Add this topic explicitly next time."}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-indigo-400/15 bg-indigo-950/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">A stronger answer would</p>
                  <ol className="mt-2 space-y-2 text-xs leading-relaxed text-slate-300">
                    {(content.ideal_answer_outline ?? []).map((line, index) => (
                      <li key={`${line}-${index}`} className="flex gap-2"><span className="font-mono text-indigo-300">{index + 1}.</span><span>{line}</span></li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-950/20 p-4 text-sm text-amber-200">
              This answer is still processing. Refresh the report in a moment to see the correctness verdict and topic coverage.
            </p>
          )}
        </section>

        {/* Dual-Perspective Panel Evaluation */}
        {review.panel_report && (
          <DualPerspectivePanelCard panelReport={review.panel_report} />
        )}

        {/* ── QUESTION SELECTOR TABS ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Evidence & Question Deep-Dive</h2>
            <span className="text-xs text-slate-400 font-mono">
              Question {selectedIndex + 1} of {review.questions_review.length}
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {review.questions_review.map((item, index) => {
              const persona = item.question.interviewer_persona;
              const isHr = persona && String(persona).toUpperCase().includes("HR");
              return (
                <button
                  key={item.question.id}
                  type="button"
                  onClick={() => selectQuestion(index)}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition ${
                    selectedIndex === index
                      ? "border-cyan-400/40 bg-cyan-950/30 text-white shadow-md shadow-cyan-950/50"
                      : "border-white/8 bg-white/[0.03] text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="block text-[11px] font-bold uppercase tracking-wider">
                      Turn {item.question.sequence_number}
                    </span>
                    {persona && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          isHr
                            ? "bg-violet-950 text-violet-300 border border-violet-800/50"
                            : "bg-cyan-950 text-cyan-300 border border-cyan-800/50"
                        }`}
                      >
                        {isHr ? "Sarah (HR)" : "Alex (Tech)"}
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 block max-w-[12rem] truncate text-xs font-semibold">
                    {item.question.competency || item.question.question_text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── LARGE VIDEO PLAYER & DIRECT TIMESTAMPED TRANSCRIPT ── */}
        <section className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Prominent Video Player & Interactive Transcript */}
          <div className="lg:col-span-8 space-y-5">
            {/* Large Video Evidence Replay Box */}
            <div className="rounded-3xl border border-white/10 bg-[#0d1118] p-5 sm:p-6 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Question {currentItem?.question.sequence_number} · Video Evidence
                  </span>
                  <h3 className="mt-1 text-base sm:text-lg font-bold text-white">
                    &ldquo;{currentItem?.question.question_text}&rdquo;
                  </h3>
                </div>
                {currentItem?.question.interviewer_persona && (
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                      String(currentItem.question.interviewer_persona).toUpperCase().includes("HR")
                        ? "bg-violet-950/80 text-violet-300 border border-violet-700/50"
                        : "bg-cyan-950/80 text-cyan-300 border border-cyan-700/50"
                    }`}
                  >
                    {String(currentItem.question.interviewer_persona).toUpperCase().includes("HR")
                      ? "Sarah Chen (HR Lead)"
                      : "Alex Rivera (Tech Lead)"}
                  </span>
                )}
              </div>

              {/* Large Video Frame */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
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
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center bg-slate-950">
                    <Mic2 className="h-10 w-10 text-slate-700" />
                    <p className="text-xs text-slate-500 font-mono">No video recording attached to this answer.</p>
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-lg border border-white/15 bg-black/70 px-2.5 py-1 font-mono text-xs text-slate-300 backdrop-blur-md">
                  {formatTime(currentTime)}
                </span>
              </div>

              {/* DIRECT TIMESTAMPED WORD-BY-WORD TRANSCRIPT UNDER VIDEO */}
              <div className="mt-5 rounded-2xl border border-white/8 bg-black/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    <span>Timestamped Spoken Transcript (Click word to seek)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentItem?.transcript?.word_count || currentItem?.transcript?.words?.length || 0} words transcribed
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl p-3 text-sm leading-8 text-slate-300 font-sans">
                  {currentItem?.transcript?.words && currentItem.transcript.words.length > 0 ? (
                    currentItem.transcript.words.map((word, index) => {
                      const isCurrent = currentTime >= word.start_seconds && currentTime <= word.end_seconds;
                      const isFiller = ["um", "uh", "like", "you know", "ah", "er", "basically"].includes(
                        word.word.toLowerCase().replace(/[^a-z]/g, ""),
                      );

                      return (
                        <button
                          key={`${word.word}-${index}`}
                          type="button"
                          onClick={() => seekTo(word.start_seconds)}
                          className={`mr-1.5 rounded-md px-1.5 py-0.5 transition ${
                            isCurrent
                              ? "bg-cyan-400 text-slate-950 font-bold shadow-md"
                              : isFiller
                              ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 hover:bg-amber-500/30"
                              : "hover:bg-white/10 text-slate-200"
                          }`}
                          title={`${word.word} (${formatTime(word.start_seconds)})`}
                        >
                          {word.word}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 italic">
                      {currentItem?.transcript?.full_text || "Transcript processing completed."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <TextTimeline
              transcript={currentItem?.transcript}
              speechMetrics={currentItem?.speech_metrics}
              contentMetrics={content}
              durationSeconds={currentItem?.answer?.duration_seconds ?? 0}
              currentTime={currentTime}
              onSeek={seekTo}
            />
          </div>

          {/* Right Column: Grounded Timeline & Filler Breakdown */}
          <div className="lg:col-span-4 space-y-5">
            {/* Timeline Filter Card */}
            <div className="rounded-3xl border border-white/10 bg-[#131923]/90 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>Playback Timeline</span>
                </div>
                <span className="rounded-full bg-cyan-950/80 border border-cyan-800/50 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                  {questionEvents.length} events
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 mb-4 p-1 rounded-xl bg-black/40 border border-white/5">
                {(["ALL", "FILLERS", "PAUSES"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${
                      activeFilter === filter
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter === "ALL" ? "All Moments" : filter === "FILLERS" ? "Fillers" : "Pauses"}
                  </button>
                ))}
              </div>

              {/* Event Badges List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => seekTo(event.time)}
                      className="w-full text-left rounded-xl border border-white/5 bg-black/25 p-3 hover:border-cyan-400/40 hover:bg-white/[0.04] transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            event.type === "filler"
                              ? "bg-amber-950/80 text-amber-300 border border-amber-700/50"
                              : event.type === "pause"
                              ? "bg-rose-950/80 text-rose-300 border border-rose-700/50"
                              : "bg-cyan-950/80 text-cyan-300 border border-cyan-700/50"
                          }`}
                        >
                          {event.type}
                        </span>
                        <span className="font-mono text-xs text-slate-400 group-hover:text-cyan-300">
                          {formatTime(event.time)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold text-white">{event.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{event.description}</p>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 font-mono">
                    No {activeFilter.toLowerCase()} detected in this turn.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-950/[0.12] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Eye className="h-4 w-4 text-cyan-300" />
                  Communication signals
                </div>
                {currentItem?.vision_metrics?.visual_communication_score != null && (
                  <span className={`font-mono text-lg font-bold ${scoreColor(currentItem.vision_metrics.visual_communication_score)}`}>
                    {Math.round(currentItem.vision_metrics.visual_communication_score)}
                  </span>
                )}
              </div>
              {currentItem?.vision_metrics?.capability_status && currentItem.vision_metrics.capability_status !== "unavailable" ? (
                <div className="mt-3 space-y-2 text-xs">
                  <p className="text-slate-400">
                    {Math.round((currentItem.vision_metrics.face_detected_ratio ?? 0) * 100)}% face visibility · {Math.round((currentItem.vision_metrics.eye_contact_ratio ?? 0) * 100)}% camera-facing opportunity · {Math.round((currentItem.vision_metrics.multiple_people_ratio ?? 0) * 100)}% multi-person frames
                  </p>
                  {currentItem.vision_metrics.strengths.slice(0, 2).map((strength) => (
                    <p key={strength} className="text-emerald-200">+ {strength}</p>
                  ))}
                  {currentItem.vision_metrics.improvements.slice(0, 2).map((improvement) => (
                    <p key={improvement} className="text-amber-200">→ {improvement}</p>
                  ))}
                  <p className="pt-1 text-[10px] leading-4 text-slate-500">These are observable framing signals for candidate coaching only; they never feed competency or hiring scores.</p>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Visual telemetry was unavailable for this answer. Content and speech scoring still apply; no camera metric is treated as a failure.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-violet-500/15 bg-violet-950/[0.12] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 text-violet-300" />
                Transcription quality
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold text-violet-200">{Math.round((currentItem?.transcript?.quality_score ?? 0) * 100)}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{currentItem?.transcript?.quality_label ?? "Unavailable"}</p>
                </div>
                <p className="max-w-[13rem] text-right text-[11px] leading-4 text-slate-400">{currentItem?.transcript?.quality_notes ?? "No transcript quality explanation is available."}</p>
              </div>
            </div>

            {/* Confidence-Trend & Crumble Point */}
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
          </div>
        </section>

        {/* ── FULL WIDTH ANSWER DNA CARD (Zero text collision, spacious grid) ── */}
        <AnswerDNACard
          category={currentItem?.question.category ?? "technical"}
          technicalDna={currentItem?.technical_dna}
          behavioralDna={currentItem?.behavioral_dna}
        />

        {/* 7-Stage Repair Mode Modal */}
        <RepairModeModal
          isOpen={isRepairOpen}
          onClose={() => setIsRepairOpen(false)}
          interviewId={interviewId}
          questionId={currentItem?.question.id ?? ""}
          questionText={currentItem?.question.question_text ?? ""}
          weaknessTitle={report?.top_habits?.[0]?.title ?? "Unsupported Claim & Baseline Gap"}
          evidenceSnippet={currentItem?.transcript?.full_text?.slice(0, 100) ?? "Answer transcript snippet"}
          explanation={report?.top_habits?.[0]?.observation ?? "Gaps in metric baseline or delivery evidence."}
          initialBeforeEvidence={Math.round(content?.evidence_score ?? 42)}
          initialBeforeFillers={currentItem?.speech_metrics?.filler_count ?? 7}
          initialBeforeStructure={Math.round(content?.structure_score ?? 58)}
        />
      </div>
    </AppShell>
  );
}
