"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { getMediaUrl } from "@/lib/api-client";
import type {
  ContentMetrics,
  FillerOccurrence,
  InterviewReview,
  PauseOccurrence,
  QuestionReviewItem,
} from "@/types/interview";
import { RepairModeModal } from "@/components/repair/RepairModeModal";
import {
  EvidencePlayer,
  type EvidencePlayerHandle,
} from "./EvidencePlayer";
import {
  EvidenceScrubber,
  type EvidenceMoment,
  type EvidenceMomentTone,
} from "./EvidenceScrubber";

interface EvidenceRoomProps {
  review: InterviewReview;
  interviewId: string;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function toneFor(type: string): EvidenceMomentTone {
  if (type === "strong_evidence") return "green";
  if (type === "camera_attention" || type === "evidence") return "blue";
  if (type === "pause" || type === "pace_shift") return "violet";
  if (type === "pressure_event" || type === "consistency_issue") return "red";
  return "amber";
}

function reliabilityLabel(value?: number | null) {
  if (value == null) return "Not reported";
  if (value >= 0.8) return `High / ${Math.round(value * 100)}%`;
  if (value >= 0.55) return `Moderate / ${Math.round(value * 100)}%`;
  return `Low / ${Math.round(value * 100)}%`;
}

function metricValue(value: number | null | undefined, suffix = "") {
  if (value == null || Number.isNaN(value)) return "Unavailable";
  return `${Math.round(value)}${suffix}`;
}

function buildMoments(
  review: InterviewReview,
  item: QuestionReviewItem | undefined,
  selectedIndex: number,
): EvidenceMoment[] {
  if (!item) return [];
  const moments: EvidenceMoment[] = [];
  const questionNumber = item.question.sequence_number;
  const reportEvents = review.report_card?.evidence_events ?? [];
  const scopedReportEvents = reportEvents.filter(
    (event) =>
      event.question_number === questionNumber ||
      event.turn_id === item.question.id ||
      event.turn_id === item.answer?.id,
  );
  const eventsToUse =
    scopedReportEvents.length > 0
      ? scopedReportEvents
      : selectedIndex === 0
        ? reportEvents
        : [];

  eventsToUse.forEach((event) => {
    const time = event.start_ms
      ? event.start_ms / 1000
      : event.start_seconds || 0;
    const end = event.end_ms
      ? event.end_ms / 1000
      : event.end_seconds || time + 0.5;
    moments.push({
      id: `report-${event.id}`,
      time,
      end,
      type: event.type,
      title: event.title,
      detail: event.explanation || event.description || "Evidence linked to this moment.",
      source: event.source,
      reliability: event.reliability,
      severity: event.severity,
      quote:
        typeof event.payload?.quote === "string"
          ? event.payload.quote
          : event.quote,
      tone: toneFor(event.type),
    });
  });

  const fillers =
    (item.speech_metrics?.filler_words as FillerOccurrence[] | undefined) ?? [];
  fillers.forEach((filler, index) => {
    moments.push({
      id: `filler-${index}`,
      time: filler.timestamp_seconds,
      end: filler.timestamp_seconds + filler.duration_seconds,
      type: "filler",
      title: `Filler: "${filler.word}"`,
      detail: "A measured filler occurrence in the recording.",
      source: "MEASURED",
      reliability: null,
      severity: 2,
      quote: filler.word,
      tone: "amber",
    });
  });

  const pauses =
    (item.speech_metrics?.pauses as PauseOccurrence[] | undefined) ?? [];
  pauses
    .filter((pause) => pause.duration_seconds >= 1.5)
    .forEach((pause, index) => {
      moments.push({
        id: `pause-${index}`,
        time: pause.start_seconds,
        end: pause.end_seconds,
        type: "pause",
        title: `${pause.duration_seconds.toFixed(1)}s pause`,
        detail: "Measured silence long enough to affect answer rhythm.",
        source: "MEASURED",
        reliability: null,
        severity: pause.duration_seconds >= 3 ? 3 : 2,
        tone: "violet",
      });
    });

  (item.content_metrics?.evidence ?? []).forEach((evidence, index) => {
    moments.push({
      id: `evidence-${evidence.id || index}`,
      time: evidence.start_seconds || 0,
      end: evidence.end_seconds || evidence.start_seconds + 1,
      type: "evidence",
      title: "Evidence anchor",
      detail: evidence.text,
      source: "AI_EVALUATED",
      reliability: evidence.confidence,
      severity: 1,
      quote: evidence.text,
      tone: "blue",
    });
  });

  (item.content_metrics?.claims ?? []).forEach((claim, index) => {
    if (String(claim.support_status).toLowerCase().includes("support")) return;
    moments.push({
      id: `claim-${index}`,
      time: claim.start_seconds || 0,
      end: (claim.start_seconds || 0) + 1,
      type: "unsupported_claim",
      title: "Unsupported claim",
      detail: "The answer states a result without enough transcript evidence to verify the baseline or method.",
      source: "AI_EVALUATED",
      reliability: null,
      severity: 4,
      quote: claim.claim,
      tone: "amber",
    });
  });

  const unique = new Map<string, EvidenceMoment>();
  moments
    .sort((a, b) => a.time - b.time)
    .forEach((moment) => unique.set(moment.id, moment));
  return [...unique.values()];
}

export function EvidenceRoom({ review, interviewId }: EvidenceRoomProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedMoment, setSelectedMoment] = useState<EvidenceMoment | null>(
    null,
  );
  const [repairOpen, setRepairOpen] = useState(false);
  const playerRef = useRef<EvidencePlayerHandle | null>(null);

  const item = review.questions_review[selectedIndex];
  const content: ContentMetrics | null | undefined = item?.content_metrics;
  const report = review.report_card;
  const mediaKey =
    item?.answer?.video_storage_key || item?.answer?.audio_storage_key;
  const mediaUrl = mediaKey ? getMediaUrl(mediaKey) : null;
  const moments = useMemo(
    () => buildMoments(review, item, selectedIndex),
    [review, item, selectedIndex],
  );

  useEffect(() => {
    setCurrentTime(0);
    setDuration(item?.answer?.duration_seconds || 0);
    setSelectedMoment(moments[0] ?? null);
  }, [item?.answer?.duration_seconds, moments, selectedIndex]);

  const seekTo = (seconds: number) => {
    playerRef.current?.seek(seconds);
    playerRef.current?.play();
    setCurrentTime(seconds);
  };

  const selectMoment = (moment: EvidenceMoment) => {
    setSelectedMoment(moment);
    seekTo(moment.time);
  };

  const readiness =
    report?.overall_score == null ? null : Math.round(report.overall_score);
  const topHabits = report?.top_habits?.slice(0, 3) ?? [];
  const playerDuration = Math.max(
    duration,
    item?.answer?.duration_seconds || 0,
    1,
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Evidence Room</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-5xl">
            APTLY interview report
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            {review.role_profile?.role_title || review.interview.title} /{" "}
            {review.total_answers_count} recorded{" "}
            {review.total_answers_count === 1 ? "answer" : "answers"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/interview/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New session
          </Link>
          <button
            type="button"
            onClick={() => setRepairOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-stone-100 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white"
          >
            Repair this answer
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-[1.75rem] border border-white/[0.075] bg-[#0d0f13] lg:grid-cols-[0.34fr_0.66fr]">
        <div className="flex items-center gap-6 border-b border-white/[0.07] p-7 sm:p-9 lg:border-b-0 lg:border-r">
          <div>
            <p className="eyebrow">Readiness</p>
            <p className="metric-number mt-4 text-6xl font-medium text-stone-100">
              {readiness == null ? "-" : readiness}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              {readiness == null
                ? "Insufficient reliable data"
                : "Composite evaluation / 100"}
            </p>
          </div>
        </div>

        <div className="p-7 sm:p-9">
          <p className="eyebrow">The things costing you offers</p>
          <div className="mt-5 divide-y divide-white/[0.065]">
            {topHabits.length > 0 ? (
              topHabits.map((habit, index) => (
                <div
                  key={habit.id}
                  className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[2rem_1fr_auto] sm:items-start"
                >
                  <span className="font-mono text-xs text-zinc-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {habit.title}
                    </p>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-600">
                      {habit.observation}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {habit.evidence_start_seconds != null && (
                      <button
                        type="button"
                        onClick={() => seekTo(habit.evidence_start_seconds || 0)}
                        className="text-[0.68rem] font-medium text-blue-300 hover:text-blue-200"
                      >
                        Replay
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRepairOpen(true)}
                      className="text-[0.68rem] font-medium text-violet-300 hover:text-violet-200"
                    >
                      Repair
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-zinc-600">
                No reliable coaching priorities were returned for this session.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="workspace-title">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Synchronized workspace</p>
            <h2
              id="workspace-title"
              className="mt-3 text-2xl font-medium tracking-[-0.03em] text-stone-100"
            >
              Recording, transcript, and evidence in one place.
            </h2>
          </div>
          <p className="font-mono text-[0.68rem] text-zinc-700">
            {formatTime(currentTime)} / {formatTime(playerDuration)}
          </p>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {review.questions_review.map((questionItem, index) => (
            <button
              key={questionItem.question.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-pressed={selectedIndex === index}
              className={`min-w-[11rem] rounded-xl border px-4 py-3 text-left transition ${
                selectedIndex === index
                  ? "border-white/[0.18] bg-white/[0.06]"
                  : "border-white/[0.065] bg-white/[0.018] hover:border-white/[0.12]"
              }`}
            >
              <span className="font-mono text-[0.62rem] text-zinc-700">
                TURN {String(questionItem.question.sequence_number).padStart(2, "0")}
              </span>
              <span className="mt-2 block truncate text-xs font-medium text-zinc-300">
                {questionItem.question.competency ||
                  questionItem.question.category}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4 px-1">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Question {item?.question.sequence_number}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
                  {item?.question.question_text}
                </p>
              </div>
              <span className="shrink-0 rounded-lg border border-white/[0.07] px-2 py-1 text-[0.62rem] capitalize text-zinc-600">
                {item?.question.category}
              </span>
            </div>
            <EvidencePlayer
              key={mediaUrl || `empty-${selectedIndex}`}
              ref={playerRef}
              src={mediaUrl}
              onTimeChange={setCurrentTime}
              onDurationChange={setDuration}
            />
          </div>

          <div className="grid min-h-[34rem] overflow-hidden rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] sm:grid-rows-[1.18fr_0.82fr]">
            <TranscriptPanel
              item={item}
              currentTime={currentTime}
              onSeek={seekTo}
            />
            <EvidenceInspector
              moment={selectedMoment}
              onRepair={() => setRepairOpen(true)}
            />
          </div>
        </div>

        <div className="mt-3">
          <EvidenceScrubber
            events={moments}
            duration={playerDuration}
            currentTime={currentTime}
            selectedId={selectedMoment?.id}
            onSelect={selectMoment}
          />
        </div>
      </section>

      <section aria-labelledby="metrics-title">
        <p className="eyebrow">Signals</p>
        <h2
          id="metrics-title"
          className="mt-3 text-2xl font-medium tracking-[-0.03em] text-stone-100"
        >
          Measured and evaluated are not the same thing.
        </h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MetricGroup
            title="Measured"
            description="Calculated directly from the recording or transcript."
            metrics={[
              ["Speaking pace", review.average_wpm > 0 ? metricValue(review.average_wpm, " wpm") : "Unavailable"],
              ["Filler count", String(review.total_fillers_count)],
              ["Pauses", String(review.total_pauses_count)],
              [
                "Camera attention",
                report?.delivery?.camera_attention_estimate == null
                  ? "Insufficient reliable frames"
                  : metricValue(report.delivery.camera_attention_estimate, "%"),
              ],
            ]}
          />
          <MetricGroup
            title="AI-evaluated"
            description="Judgement-based scores grounded in the answer transcript."
            metrics={[
              ["Relevance", content ? metricValue(content.relevance_score, "/100") : "Unavailable"],
              ["Technical depth", content ? metricValue(content.technical_depth_score, "/100") : "Unavailable"],
              ["Evidence quality", content ? metricValue(content.evidence_score, "/100") : "Unavailable"],
              ["Answer structure", content ? metricValue(content.structure_score, "/100") : "Unavailable"],
            ]}
          />
        </div>
      </section>

      <RepairModeModal
        isOpen={repairOpen}
        onClose={() => setRepairOpen(false)}
        interviewId={interviewId}
        questionId={item?.question.id || ""}
        questionText={item?.question.question_text || ""}
        weaknessTitle={report?.top_habits?.[0]?.title || "Evidence gap"}
        evidenceSnippet={
          selectedMoment?.quote ||
          item?.transcript?.full_text?.slice(0, 140) ||
          "No transcript excerpt is available."
        }
        explanation={
          selectedMoment?.detail ||
          report?.top_habits?.[0]?.observation ||
          "Add a baseline, your action, the result, and how it was validated."
        }
        initialBeforeEvidence={Math.round(content?.evidence_score ?? 0)}
        initialBeforeFillers={item?.speech_metrics?.filler_count ?? 0}
        initialBeforeStructure={Math.round(content?.structure_score ?? 0)}
      />
    </div>
  );
}

function TranscriptPanel({
  item,
  currentTime,
  onSeek,
}: {
  item?: QuestionReviewItem;
  currentTime: number;
  onSeek: (seconds: number) => void;
}) {
  const words = item?.transcript?.words ?? [];
  return (
    <section className="min-h-0 border-b border-white/[0.07] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-600" />
          <h3 className="text-sm font-medium text-zinc-200">Transcript</h3>
        </div>
        <span className="font-mono text-[0.62rem] text-zinc-700">
          {item?.transcript?.word_count || words.length || 0} words
        </span>
      </div>
      <div className="mt-4 max-h-[16rem] overflow-y-auto pr-2 text-sm leading-8">
        {words.length > 0 ? (
          words.map((word, index) => {
            const active =
              currentTime >= word.start_seconds &&
              currentTime <= word.end_seconds;
            const filler = ["um", "uh", "like", "basically", "actually"].includes(
              word.word.toLowerCase().replace(/[^a-z]/g, ""),
            );
            return (
              <button
                key={`${word.word}-${index}`}
                type="button"
                onClick={() => onSeek(word.start_seconds)}
                title={formatTime(word.start_seconds)}
                className={`mr-1 rounded px-1 py-0.5 transition ${
                  active
                    ? "bg-blue-300 text-zinc-950"
                    : filler
                      ? "bg-amber-300/[0.1] text-amber-200 hover:bg-amber-300/[0.16]"
                      : "text-zinc-400 hover:bg-white/[0.055] hover:text-zinc-200"
                }`}
              >
                {word.word}
              </button>
            );
          })
        ) : (
          <p className="text-sm leading-7 text-zinc-500">
            {item?.transcript?.full_text || "Transcript unavailable."}
          </p>
        )}
      </div>
    </section>
  );
}

function EvidenceInspector({
  moment,
  onRepair,
}: {
  moment: EvidenceMoment | null;
  onRepair: () => void;
}) {
  return (
    <section className="min-h-0 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-300" />
          <h3 className="text-sm font-medium text-zinc-200">
            Evidence inspector
          </h3>
        </div>
        {moment && (
          <span className="font-mono text-[0.62rem] text-zinc-700">
            {formatTime(moment.time)}
          </span>
        )}
      </div>
      {moment ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-200">{moment.title}</p>
          {moment.quote && (
            <blockquote className="mt-3 border-l border-blue-300/30 pl-3 text-xs italic leading-5 text-zinc-400">
              &ldquo;{moment.quote}&rdquo;
            </blockquote>
          )}
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            {moment.detail}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[0.65rem]">
            <span className="rounded-md border border-white/[0.07] px-2 py-1 text-zinc-500">
              {moment.source.replaceAll("_", " ").toLowerCase()}
            </span>
            <span className="rounded-md border border-white/[0.07] px-2 py-1 text-zinc-500">
              Reliability: {reliabilityLabel(moment.reliability)}
            </span>
          </div>
          {moment.tone !== "green" && (
            <button
              type="button"
              onClick={onRepair}
              className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              Repair this moment <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-zinc-600">
          Select a marker on the evidence timeline to inspect it.
        </p>
      )}
    </section>
  );
}

function MetricGroup({
  title,
  description,
  metrics,
}: {
  title: string;
  description: string;
  metrics: Array<[string, string]>;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
          <p className="mt-1 text-xs text-zinc-600">{description}</p>
        </div>
        {title === "Measured" ? (
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
        ) : (
          <Sparkles className="h-4 w-4 text-violet-300" />
        )}
      </div>
      <dl className="mt-6 divide-y divide-white/[0.065]">
        {metrics.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-5 py-3 first:pt-0 last:pb-0">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className={`text-right font-mono text-xs tabular-nums ${value === "Unavailable" || value.startsWith("Insufficient") ? "text-zinc-700" : "text-zinc-200"}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
