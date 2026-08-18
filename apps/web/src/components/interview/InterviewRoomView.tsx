"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  Clock3,
  Mic,
  MicOff,
  Play,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { VideoPreview } from "@/components/camera/VideoPreview";
import type { Question } from "@/types/interview";
import {
  InterviewerPresence,
  type InterviewerPresenceState,
} from "./InterviewerPresence";

interface InterviewRoomViewProps {
  title: string;
  question?: Question;
  currentQuestionNumber: number;
  totalQuestions: number;
  repairQuestion: number;
  convState: string;
  hasUserStarted: boolean;
  isMicReady: boolean;
  isCameraReady: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  isSubmitting: boolean;
  isMuted: boolean;
  voiceEnabled: boolean;
  micLevelPercent: number;
  recordingDuration: number;
  stream: MediaStream | null;
  recordedUrl: string | null;
  errorMessage?: string | null;
  mediaError?: string | null;
  doubt: string;
  explanation: string | null;
  isExplaining: boolean;
  setDoubt: Dispatch<SetStateAction<string>>;
  onStart: () => void;
  onFinishInterview: () => void;
  onFinishTurn: () => void;
  onReplay: () => void;
  onStartAnswering: () => void;
  onToggleMute: () => void;
  onToggleVoice: () => void;
  onExplain: () => void;
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function presenceState(convState: string): InterviewerPresenceState {
  if (convState === "INTERVIEWER_SPEAKING") return "speaking";
  if (convState === "LISTENING") return "listening";
  if (
    convState === "PROCESSING" ||
    convState === "THINKING" ||
    convState === "FOLLOWING_UP" ||
    convState === "CHALLENGING" ||
    convState === "ADVANCING"
  ) {
    return "thinking";
  }
  if (convState === "RECOVERING") return "recovering";
  return "idle";
}

function interviewerLabel(persona?: string | null) {
  const normalized = String(persona || "").toUpperCase();
  if (normalized.includes("HR")) return "People interview";
  if (normalized.includes("TECH")) return "Technical interview";
  return "APTLY interviewer";
}

export function InterviewRoomView({
  title,
  question,
  currentQuestionNumber,
  totalQuestions,
  repairQuestion,
  convState,
  hasUserStarted,
  isMicReady,
  isCameraReady,
  isRecording,
  isSpeaking,
  isSubmitting,
  isMuted,
  voiceEnabled,
  micLevelPercent,
  recordingDuration,
  stream,
  recordedUrl,
  errorMessage,
  mediaError,
  doubt,
  explanation,
  isExplaining,
  setDoubt,
  onStart,
  onFinishInterview,
  onFinishTurn,
  onReplay,
  onStartAnswering,
  onToggleMute,
  onToggleVoice,
  onExplain,
}: InterviewRoomViewProps) {
  const state = presenceState(convState);
  const ready = isMicReady && isCameraReady;
  const notice = errorMessage || mediaError;

  return (
    <main className="min-h-[100svh] bg-[#07080a] text-stone-100">
      <header className="grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center border-b border-white/[0.065] px-4 sm:px-7">
        <BrandMark href="/dashboard" />
        <div className="min-w-0 text-center">
          <p className="max-w-[46vw] truncate text-xs font-medium text-zinc-300 sm:max-w-md">
            {title}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-zinc-600">
            Question {currentQuestionNumber} of {totalQuestions}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <span className="hidden items-center gap-1.5 font-mono text-xs tabular-nums text-zinc-500 sm:inline-flex">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDuration(recordingDuration)}
          </span>
          <button
            type="button"
            onClick={onFinishInterview}
            disabled={isSubmitting}
            className="min-h-9 rounded-lg border border-white/[0.09] px-3 text-xs font-medium text-zinc-500 transition hover:border-red-300/20 hover:text-red-200 disabled:opacity-40"
          >
            End interview
          </button>
        </div>
      </header>

      {repairQuestion > 0 && (
        <div className="border-b border-violet-300/10 bg-violet-300/[0.045] px-5 py-2 text-center text-[0.68rem] text-violet-200">
          Repair rep / Answer the same question with stronger proof and a clear validation method.
        </div>
      )}

      {notice && (
        <div className="mx-auto mt-4 flex w-[min(100%-2rem,84rem)] items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/[0.06] px-4 py-3 text-xs text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <p>{notice}</p>
        </div>
      )}

      <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] w-[min(100%-1.25rem,90rem)] gap-3 py-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <section className="relative min-h-[42svh] overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-[#0a0b0e] lg:min-h-0">
          <VideoPreview
            stream={stream}
            isCameraReady={isCameraReady}
            isMicReady={isMicReady}
            isRecording={isRecording}
            recordedUrl={recordedUrl}
            minimal
            className="absolute inset-0 rounded-none border-0"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 sm:inset-x-5 sm:bottom-5">
            <div className="flex flex-wrap items-center gap-2">
              <DevicePill
                icon={<Camera className="h-3.5 w-3.5" />}
                label="Camera"
                ready={isCameraReady}
              />
              <DevicePill
                icon={isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                label={isMuted ? "Mic muted" : "Mic"}
                ready={isMicReady && !isMuted}
                onClick={onToggleMute}
                disabled={!hasUserStarted}
              />
              <DevicePill
                label={isSpeaking ? `Voice ${micLevelPercent}%` : "Connection"}
                ready={ready && !notice}
              />
            </div>

            {state === "listening" && isRecording && (
              <button
                type="button"
                onClick={onFinishTurn}
                disabled={isSubmitting}
                className="pointer-events-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-stone-100 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? "Sending..." : "Finish answer"}
              </button>
            )}
          </div>

          {!hasUserStarted && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/58 p-5 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-[1.5rem] border border-white/[0.1] bg-[#0d0f13]/95 p-6 text-center shadow-2xl">
                <p className="eyebrow">Room ready</p>
                <h2 className="mt-4 text-2xl font-medium tracking-[-0.03em] text-stone-100">
                  Your interviewer is waiting.
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  The first question begins after your camera and microphone are ready.
                </p>
                <div className="mt-5 flex justify-center gap-2 text-[0.68rem]">
                  <span className={isCameraReady ? "text-emerald-300" : "text-amber-300"}>
                    Camera {isCameraReady ? "ready" : "checking"}
                  </span>
                  <span className="text-zinc-700">/</span>
                  <span className={isMicReady ? "text-emerald-300" : "text-amber-300"}>
                    Mic {isMicReady ? "ready" : "checking"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onStart}
                  disabled={!ready}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {ready ? "Begin interview" : "Preparing devices"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="flex min-h-[34rem] flex-col rounded-[1.7rem] border border-white/[0.07] bg-[#0d0f13] p-6 sm:p-8">
          <div className="flex flex-1 flex-col items-center justify-center">
            <InterviewerPresence
              state={state}
              persona={interviewerLabel(question?.interviewer_persona)}
            />

            <p className="mt-8 max-w-lg text-balance text-center text-xl font-medium leading-[1.45] tracking-[-0.025em] text-stone-100 sm:text-2xl">
              {question?.question_text || "Preparing your next question..."}
            </p>
          </div>

          <div className="mt-8 border-t border-white/[0.07] pt-5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onReplay}
                disabled={!question}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-xs text-zinc-500 transition hover:text-zinc-200 disabled:opacity-40"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Replay question
              </button>
              <button
                type="button"
                onClick={onToggleVoice}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-xs text-zinc-500 transition hover:text-zinc-200"
              >
                {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                Voice {voiceEnabled ? "on" : "off"}
              </button>
              {state === "speaking" && (
                <button
                  type="button"
                  onClick={onStartAnswering}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 text-xs text-emerald-200"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Answer now
                </button>
              )}
            </div>

            <details className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 text-xs text-zinc-700 transition hover:text-zinc-400">
                Need the question clarified?
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                <div className="flex gap-2">
                  <input
                    value={doubt}
                    onChange={(event) => setDoubt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onExplain();
                    }}
                    placeholder="What would you like clarified?"
                    className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-700 focus:border-violet-300/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={onExplain}
                    disabled={isExplaining || !doubt.trim()}
                    className="rounded-lg bg-white/[0.08] px-3 text-xs font-medium text-zinc-200 disabled:opacity-40"
                  >
                    {isExplaining ? "Asking..." : "Ask"}
                  </button>
                </div>
                {explanation && (
                  <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-5 text-zinc-400">
                    {explanation}
                  </p>
                )}
              </div>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}

function DevicePill({
  icon,
  label,
  ready,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  ready: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = `pointer-events-auto inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[0.68rem] backdrop-blur-md transition ${
    ready
      ? "border-emerald-300/20 bg-black/55 text-emerald-200"
      : "border-white/[0.1] bg-black/55 text-zinc-500"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {icon}
        {label}
      </button>
    );
  }

  return (
    <span className={className}>
      {icon}
      <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-emerald-300" : "bg-zinc-600"}`} />
      {label}
    </span>
  );
}
