"use client";

import { SiriWave } from "./SiriWave";

export type InterviewerPresenceState =
  | "idle"
  | "speaking"
  | "listening"
  | "thinking"
  | "recovering";

const STATE_COPY: Record<
  InterviewerPresenceState,
  { label: string; detail: string }
> = {
  idle: { label: "Ready", detail: "Waiting to begin" },
  speaking: { label: "Speaking", detail: "Listen, then answer naturally" },
  listening: { label: "Listening", detail: "Take your time" },
  thinking: { label: "Thinking", detail: "Preparing the next question" },
  recovering: { label: "Reconnecting", detail: "Keeping your place" },
};

interface InterviewerPresenceProps {
  state: InterviewerPresenceState;
  persona?: string | null;
}

export function InterviewerPresence({
  state,
  persona,
}: InterviewerPresenceProps) {
  const copy = STATE_COPY[state];
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking" || state === "recovering";

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-white/[0.09] bg-black shadow-[0_0_5rem_rgba(139,124,246,0.12)] sm:h-40 sm:w-40"
        role="img"
        aria-label={`Interviewer is ${copy.label.toLowerCase()}`}
      >
        <div
          className={`absolute inset-4 rounded-full bg-violet-400/10 blur-2xl ${
            state !== "idle" ? "animate-[presence-breathe_2.4s_ease-in-out_infinite]" : ""
          }`}
        />
        <SiriWave
          variant={isThinking ? "fluid-dots" : "wave"}
          size={176}
          renderScale={0.64}
          className={`relative rounded-full transition-opacity duration-500 ${
            state === "idle" ? "opacity-45" : isSpeaking ? "opacity-100" : "opacity-70"
          }`}
          aria-hidden="true"
        />
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/[0.06]" />
      </div>

      <div className="mt-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {persona || "APTLY interviewer"}
        </p>
        <p className="mt-2 text-sm font-medium text-zinc-200">{copy.label}</p>
        <p className="mt-1 text-xs text-zinc-600">{copy.detail}</p>
      </div>
    </div>
  );
}
