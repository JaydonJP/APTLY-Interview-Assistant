"use client";

import { useMemo, useState } from "react";

export type EvidenceMomentTone =
  | "amber"
  | "red"
  | "blue"
  | "green"
  | "violet";

export interface EvidenceMoment {
  id: string;
  time: number;
  end: number;
  type: string;
  title: string;
  detail: string;
  source: string;
  reliability?: number | null;
  severity: number;
  quote?: string | null;
  tone: EvidenceMomentTone;
}

interface EvidenceScrubberProps {
  events: EvidenceMoment[];
  duration: number;
  currentTime: number;
  selectedId?: string | null;
  onSelect: (event: EvidenceMoment) => void;
}

const TONE_CLASS: Record<EvidenceMomentTone, string> = {
  amber: "bg-amber-300",
  red: "bg-red-300",
  blue: "bg-blue-300",
  green: "bg-emerald-300",
  violet: "bg-violet-300",
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function categoryFor(event: EvidenceMoment) {
  if (["filler", "pause", "pace_shift", "camera_attention", "voice_energy"].includes(event.type)) {
    return "delivery";
  }
  if (event.type === "strong_evidence") return "strong";
  return "content";
}

export function EvidenceScrubber({
  events,
  duration,
  currentTime,
  selectedId,
  onSelect,
}: EvidenceScrubberProps) {
  const [filter, setFilter] = useState<"all" | "content" | "delivery" | "strong">("all");
  const safeDuration = Math.max(
    duration,
    ...events.map((event) => event.end || event.time),
    1,
  );
  const visibleEvents = useMemo(
    () =>
      filter === "all"
        ? events
        : events.filter((event) => categoryFor(event) === filter),
    [events, filter],
  );

  return (
    <section className="rounded-[1.5rem] border border-white/[0.075] bg-[#0d0f13] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Evidence timeline</p>
          <p className="mt-2 text-xs text-zinc-600">
            Select a marker to align playback, transcript, and explanation.
          </p>
        </div>
        <div className="flex rounded-lg border border-white/[0.07] bg-black/20 p-1">
          {([
            ["all", "All"],
            ["content", "Content"],
            ["delivery", "Delivery"],
            ["strong", "Strong"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-md px-2.5 py-1.5 text-[0.68rem] font-medium transition ${
                filter === value
                  ? "bg-white/[0.09] text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <div className="relative h-16" aria-label="Timestamped evidence rail">
          <div className="absolute inset-x-0 top-8 h-px bg-white/[0.09]" />
          <div
            className="absolute left-0 top-8 h-px bg-stone-200 transition-[width] duration-100"
            style={{ width: `${Math.min(100, (currentTime / safeDuration) * 100)}%` }}
          />
          <span
            className="absolute top-[1.62rem] h-3 w-px bg-white shadow-[0_0_0.65rem_rgba(255,255,255,0.5)] transition-[left] duration-100"
            style={{ left: `${Math.min(100, (currentTime / safeDuration) * 100)}%` }}
          />

          {visibleEvents.map((event) => {
            const left = Math.min(100, (event.time / safeDuration) * 100);
            const selected = selectedId === event.id;
            const height = 10 + Math.min(4, Math.max(1, event.severity)) * 4;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect(event)}
                title={`${event.title} at ${formatTime(event.time)}`}
                aria-label={`${event.title} at ${formatTime(event.time)}`}
                className="group absolute top-8 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${left}%` }}
              >
                <span
                  className={`block w-1 rounded-full transition-all duration-200 group-hover:w-2 group-hover:scale-y-125 ${
                    TONE_CLASS[event.tone]
                  } ${selected ? "w-2 scale-y-125 ring-4 ring-white/[0.06]" : "opacity-85"}`}
                  style={{ height }}
                />
              </button>
            );
          })}
        </div>
        <div className="flex justify-between font-mono text-[0.62rem] tabular-nums text-zinc-700">
          <span>00:00</span>
          <span>{formatTime(safeDuration)}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <button
              key={`chapter-${event.id}`}
              type="button"
              onClick={() => onSelect(event)}
              className={`min-w-[13rem] rounded-xl border p-3 text-left transition ${
                selectedId === event.id
                  ? "border-white/[0.18] bg-white/[0.055]"
                  : "border-white/[0.065] bg-white/[0.018] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`h-1.5 w-1.5 rounded-full ${TONE_CLASS[event.tone]}`} />
                <span className="font-mono text-[0.62rem] tabular-nums text-zinc-600">
                  {formatTime(event.time)}
                </span>
              </div>
              <p className="mt-3 truncate text-xs font-medium text-zinc-300">
                {event.title}
              </p>
              <p className="mt-1 truncate text-[0.68rem] text-zinc-600">
                {event.type.replaceAll("_", " ")}
              </p>
            </button>
          ))
        ) : (
          <p className="py-5 text-xs text-zinc-600">
            No evidence of this type was detected.
          </p>
        )}
      </div>
    </section>
  );
}
