"use client";

import { useMemo } from "react";
import { Clock3, MessageSquareQuote, Pause, Volume2 } from "lucide-react";
import type { ContentMetrics, SpeechMetrics, Transcript } from "@/types/interview";

interface TextTimelineProps {
  transcript?: Transcript | null;
  speechMetrics?: SpeechMetrics | null;
  contentMetrics?: ContentMetrics | null;
  durationSeconds: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

interface TimelineEvent {
  id: string;
  start: number;
  end: number;
  label: string;
  detail: string;
  tone: "amber" | "cyan" | "violet";
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

export function TextTimeline({
  transcript,
  speechMetrics,
  contentMetrics,
  durationSeconds,
  currentTime,
  onSeek,
}: TextTimelineProps) {
  const events = useMemo<TimelineEvent[]>(() => {
    const fillers = (speechMetrics?.filler_words ?? []).map((filler, index) => ({
      id: `filler-${index}`,
      start: filler.timestamp_seconds,
      end: filler.timestamp_seconds + filler.duration_seconds,
      label: "Filler word",
      detail: `“${filler.word}”`,
      tone: "amber" as const,
    }));
    const pauses = (speechMetrics?.pauses ?? []).map((pause, index) => ({
      id: `pause-${index}`,
      start: pause.start_seconds,
      end: pause.end_seconds,
      label: "Extended pause",
      detail: `${pause.duration_seconds.toFixed(1)}s of silence`,
      tone: "violet" as const,
    }));
    const evidence = (contentMetrics?.evidence ?? []).map((item) => ({
      id: `evidence-${item.id}`,
      start: item.start_seconds,
      end: item.end_seconds,
      label: "Evidence anchor",
      detail: item.text,
      tone: "cyan" as const,
    }));

    return [...fillers, ...pauses, ...evidence].sort((a, b) => a.start - b.start);
  }, [contentMetrics?.evidence, speechMetrics?.filler_words, speechMetrics?.pauses]);

  const wordCount = transcript?.words?.length ?? transcript?.word_count ?? 0;
  const safeDuration = Math.max(durationSeconds, transcript?.words?.at(-1)?.end_seconds ?? 0, 1);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#131923]/90 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Evidence map</p>
          <h3 className="mt-1 text-base font-bold text-white">Answer timeline</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[10px] font-mono text-slate-400">
          {wordCount} words · {events.length} events
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="relative h-2 rounded-full bg-slate-800" aria-label="Answer playback timeline">
          <div
            className="absolute top-0 h-2 rounded-full bg-cyan-400/70"
            style={{ width: `${Math.min(100, (currentTime / safeDuration) * 100)}%` }}
          />
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              title={`${event.label}: ${event.detail}`}
              aria-label={`${event.label} at ${formatTime(event.start)}`}
              onClick={() => onSeek(event.start)}
              className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 transition hover:scale-125 ${
                event.tone === "amber"
                  ? "bg-amber-400"
                  : event.tone === "violet"
                    ? "bg-violet-400"
                    : "bg-cyan-400"
              }`}
              style={{ left: `${Math.min(100, (event.start / safeDuration) * 100)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>00:00</span>
          <span>{formatTime(safeDuration)}</span>
        </div>
      </div>

      <div className="mt-5 max-h-64 space-y-2 overflow-y-auto pr-1">
        {events.length > 0 ? (
          events.map((event) => (
            <button
              key={`row-${event.id}`}
              type="button"
              onClick={() => onSeek(event.start)}
              className={`flex w-full items-start gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3 text-left transition hover:border-white/20 ${
                currentTime >= event.start && currentTime <= event.end ? "ring-1 ring-cyan-400/50" : ""
              }`}
            >
              <span className="mt-0.5 rounded-lg bg-white/5 p-1.5 text-slate-300">
                {event.tone === "amber" ? <Volume2 className="h-3.5 w-3.5" /> : event.tone === "violet" ? <Pause className="h-3.5 w-3.5" /> : <MessageSquareQuote className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">{event.label}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
                    <Clock3 className="h-3 w-3" /> {formatTime(event.start)}
                  </span>
                </span>
                <span className="mt-1 block truncate text-[11px] leading-4 text-slate-400">{event.detail}</span>
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-slate-500">
            No timestamped coaching events were found for this answer.
          </p>
        )}
      </div>
    </section>
  );
}
