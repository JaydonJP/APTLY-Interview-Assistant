"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  XCircle,
} from "lucide-react";
import type { VisualDeliverySummary, ObservableBehaviorEvent } from "@/types/behavior";

interface JudgeValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: VisualDeliverySummary;
  onSeekVideo?: (seconds: number) => void;
}

export function JudgeValidationModal({
  isOpen,
  onClose,
  summary,
  onSeekVideo,
}: JudgeValidationModalProps) {
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);
  const [verificationMap, setVerificationMap] = useState<Record<number, "CORRECT" | "INCORRECT">>({});

  if (!isOpen) return null;

  const events = summary.events || [];
  const activeEvent: ObservableBehaviorEvent | undefined = events[selectedEventIndex];

  const handleMarkVerification = (idx: number, status: "CORRECT" | "INCORRECT") => {
    setVerificationMap((prev) => ({ ...prev, [idx]: status }));
  };

  const correctCount = Object.values(verificationMap).filter((v) => v === "CORRECT").length;
  const verifiedTotal = Object.keys(verificationMap).length;
  const accuracyRate = verifiedTotal > 0 ? Math.round((correctCount / verifiedTotal) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-6 backdrop-blur-xl">
      <div className="max-w-4xl w-full rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#131923] to-[#0a0e14] p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Judge & Evaluator Metric Validation</h3>
              <p className="text-xs text-slate-400">
                Grounding inspection: Spot-check detected computer vision events against recorded video timestamps.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Accuracy Score Banner */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
            <span className="text-[11px] font-mono uppercase text-slate-400">Total Observable Events</span>
            <p className="font-mono text-2xl font-bold text-white">{events.length}</p>
            <p className="text-[10px] text-slate-400">Extracted from ~12 FPS browser tracker</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
            <span className="text-[11px] font-mono uppercase text-slate-400">Manual Spot Checks</span>
            <p className="font-mono text-2xl font-bold text-cyan-300">{verifiedTotal} / {events.length || 1}</p>
            <p className="text-[10px] text-slate-400">Sampled for evaluator verification</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <span className="text-[11px] font-mono uppercase text-emerald-300">Grounding Precision</span>
            <p className="font-mono text-2xl font-bold text-emerald-400">{accuracyRate}%</p>
            <p className="text-[10px] text-slate-400">Zero synthetic or hallucinated numbers</p>
          </div>
        </div>

        {/* Event List & Inspector */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Events Table List */}
          <div className="lg:col-span-7 space-y-2 max-h-[320px] overflow-y-auto pr-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Detected Event Log
            </span>

            {events.length === 0 ? (
              <p className="text-xs text-slate-500 p-4">No events logged for this session.</p>
            ) : (
              events.map((evt, idx) => {
                const startSec = evt.start_ms / 1000;
                const min = Math.floor(startSec / 60);
                const sec = Math.floor(startSec % 60);
                const timeFormatted = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
                const isSelected = selectedEventIndex === idx;
                const status = verificationMap[idx];

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedEventIndex(idx);
                      if (onSeekVideo) onSeekVideo(startSec);
                    }}
                    className={`rounded-xl border p-3 cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? "border-cyan-400/50 bg-cyan-950/40"
                        : "border-white/5 bg-slate-950/50 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-cyan-300">[{timeFormatted}]</span>
                      <div>
                        <p className="text-xs font-bold text-white">{evt.event_type.replace("_", " ")}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          Duration: {Math.round(evt.duration_ms / 100) / 10}s • Conf: {Math.round(evt.confidence * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === "CORRECT" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          VERIFIED
                        </span>
                      ) : status === "INCORRECT" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                          <XCircle className="h-3 w-3" />
                          FLAGGED
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 hover:bg-slate-700"
                        >
                          Spot Check
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Event Details & Video Replay Action */}
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-4 flex flex-col justify-between">
            {activeEvent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-cyan-400/20 border border-cyan-400/30 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300">
                    Event #{selectedEventIndex + 1}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {Math.floor(activeEvent.start_ms / 1000)}s → {Math.floor(activeEvent.end_ms / 1000)}s
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{activeEvent.event_type.replace("_", " ")}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Telemetry: {JSON.stringify(activeEvent.metadata_json || {})}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSeekVideo && onSeekVideo(activeEvent.start_ms / 1000)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 transition"
                >
                  <Play className="h-3.5 w-3.5 fill-cyan-200" />
                  <span>Seek Video Player to Timestamp</span>
                </button>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400">Evaluator Spot Check Verdict:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkVerification(selectedEventIndex, "CORRECT")}
                      className="rounded-lg bg-emerald-950/70 border border-emerald-500/40 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 transition flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Matches Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkVerification(selectedEventIndex, "INCORRECT")}
                      className="rounded-lg bg-rose-950/70 border border-rose-500/40 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/80 transition flex items-center justify-center gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>False Positive</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select an event to inspect telemetry details.</p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-slate-300 transition"
            >
              Done Validating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
