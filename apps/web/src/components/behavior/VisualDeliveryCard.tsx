"use client";

import React, { useState } from "react";
import {
  Activity,
  Award,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Gauge,
  HelpCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import type {
  ObservableBehaviorEvent,
  QuestionHeatmapBlock,
  QuestionVisualInsight,
  VisualDeliveryHabit,
  VisualDeliverySummary,
} from "@/types/behavior";
import { JudgeValidationModal } from "./JudgeValidationModal";

interface VisualDeliveryCardProps {
  summary: VisualDeliverySummary | null;
  onSeekVideo?: (seconds: number) => void;
}

export function VisualDeliveryCard({ summary, onSeekVideo }: VisualDeliveryCardProps) {
  const [selectedHabitIndex, setSelectedHabitIndex] = useState<number>(0);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);
  const [activeDrillModal, setActiveDrillModal] = useState<VisualDeliveryHabit | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<{ qIdx: number; block: QuestionHeatmapBlock } | null>(null);

  if (!summary) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#131923]/90 p-8 text-center backdrop-blur-xl">
        <Activity className="mx-auto h-8 w-8 text-slate-500 animate-pulse" />
        <p className="mt-3 text-sm text-slate-400">Loading observable visual delivery telemetry...</p>
      </div>
    );
  }

  const {
    on_camera_presence_score = 82,
    camera_attention_estimate = 80,
    framing_consistency_score = 92,
    face_visibility_score = 98,
    movement_stability_score = 75,
    look_away_count = 0,
    look_away_total_seconds = 0,
    movement_spike_count = 0,
    top_habits = [],
    question_insights = [],
    events = [],
    trend_observation = "",
  } = summary;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#131923]/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
            <Camera className="h-3.5 w-3.5 text-cyan-300" />
            <span>On-Camera Delivery Telemetry</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Visual Delivery & Presence
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Observable on-camera presentation signals analyzed from facial landmark geometry. Strictly physical delivery signals — zero psychological inference.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsValidationModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition shadow-sm"
          >
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <span>Judge Demo Validation</span>
          </button>
        </div>
      </div>

      {/* ── OVERALL SCORECARD & 4 OBSERVABLE BREAKDOWN TILES ─────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Main On-Camera Score */}
        <div className="lg:col-span-1 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 via-slate-900/60 to-slate-950/80 p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
              On-Camera Presence
            </span>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-bold text-white">{Math.round(on_camera_presence_score)}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10">
            <span className="text-[11px] text-slate-300 font-mono">
              {look_away_count} look-aways • {look_away_total_seconds}s total
            </span>
          </div>
        </div>

        {/* Metric 1: Camera-Directed Gaze Estimate */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Camera Attention</span>
            <Eye className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-white">{Math.round(camera_attention_estimate)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${camera_attention_estimate}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">Target: &gt;75% lens-directed gaze</p>
        </div>

        {/* Metric 2: Framing Consistency */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Framing Centering</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-white">{Math.round(framing_consistency_score)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${framing_consistency_score}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">Eye-level camera alignment</p>
        </div>

        {/* Metric 3: Face Visibility */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Face Visibility</span>
            <Camera className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-white">{Math.round(face_visibility_score)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${face_visibility_score}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">Continuous in-frame tracking</p>
        </div>

        {/* Metric 4: Movement Stability */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Movement Stability</span>
            <Gauge className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-white">{Math.round(movement_stability_score)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${movement_stability_score}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">{movement_spike_count} bursts vs. baseline</p>
        </div>
      </div>

      {/* ── VISUAL QUESTION-BY-QUESTION DELIVERY HEATMAP STRIP ───────── */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Visual Delivery Heatmap by Question</h3>
            </div>
            <p className="text-xs text-slate-400">
              Interactive timeline segments. Click any segment block to seek the video player to that exact time.
            </p>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Optimal Focus (&gt;80%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400" /> Head Motion (70–80%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-400 animate-pulse" /> Look-Away (&lt;70%)
            </span>
          </div>
        </div>

        {/* Question Heatmap Cards */}
        <div className="space-y-4">
          {question_insights.map((qi, qIdx) => (
            <div
              key={qIdx}
              className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 space-y-4 transition hover:border-cyan-500/30"
            >
              {/* Question Row Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 uppercase">
                    Question {qi.sequence_number}
                  </span>
                  <span className="rounded-lg bg-indigo-500/10 border border-indigo-400/20 px-2.5 py-1 text-xs font-medium text-indigo-300">
                    {qi.competency}
                  </span>
                  <p className="text-xs font-semibold text-white line-clamp-1 max-w-md">
                    {qi.question_text}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">
                    {Math.round(qi.duration_seconds)}s Answer
                  </span>
                  <span className={`font-bold ${qi.camera_attention >= 80 ? "text-emerald-300" : "text-amber-300"}`}>
                    {Math.round(qi.camera_attention)}% Gaze
                  </span>
                </div>
              </div>

              {/* Segmented Timeline Heatmap Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 h-6 w-full">
                  {(qi.heatmap_blocks || []).map((blk, bIdx) => {
                    const isLow = blk.attention_level === "LOW" || blk.has_look_away;
                    const isMed = blk.attention_level === "MEDIUM" || blk.has_movement_spike;

                    return (
                      <button
                        key={bIdx}
                        type="button"
                        onClick={() => onSeekVideo && onSeekVideo(blk.start_seconds)}
                        onMouseEnter={() => setHoveredBlock({ qIdx, block: blk })}
                        onMouseLeave={() => setHoveredBlock(null)}
                        className={`flex-1 h-full rounded-md transition-all duration-200 hover:scale-105 relative cursor-pointer ${
                          isLow
                            ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                            : isMed
                            ? "bg-indigo-500/80 hover:bg-indigo-400"
                            : "bg-emerald-500/80 hover:bg-emerald-400"
                        }`}
                        title={`[${blk.time_label}] ${blk.event_label} (${blk.intensity_score}%)`}
                      />
                    );
                  })}
                </div>

                {/* Timeline axis labels */}
                <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
                  <span>00:00</span>
                  <span>{qi.duration_seconds > 30 ? "00:30" : "00:15"}</span>
                  <span>{`${Math.floor(qi.duration_seconds / 60).toString().padStart(2, "0")}:${Math.floor(qi.duration_seconds % 60).toString().padStart(2, "0")}`}</span>
                </div>
              </div>

              {/* Hover Tooltip / Status Strip */}
              {hoveredBlock && hoveredBlock.qIdx === qIdx && (
                <div className="rounded-lg bg-slate-950 border border-cyan-500/40 p-2.5 text-xs flex items-center justify-between text-cyan-200 font-mono animate-in fade-in duration-150">
                  <span className="flex items-center gap-2">
                    <Play className="h-3 w-3 fill-cyan-300" />
                    <span>[{hoveredBlock.block.time_label}] {hoveredBlock.block.event_label}</span>
                  </span>
                  <span className="text-white font-bold">{hoveredBlock.block.intensity_score}% Stability</span>
                </div>
              )}

              {/* Observable delivery telemetry summary */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/5 font-mono">
                <span>{qi.observable_summary}</span>
                <span className="text-slate-400">{qi.look_away_count} look-aways • {qi.movement_spikes} bursts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOP 3 VISUAL DELIVERY HABITS & CONCRETE DRILLS ─────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Your 3 Most Impactful Visual Delivery Habits</h3>
            <p className="text-xs text-slate-400">Actionable, evidence-grounded delivery feedback paired with targeted drills</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {top_habits.map((habit, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                selectedHabitIndex === idx
                  ? "border-cyan-400/40 bg-gradient-to-b from-cyan-950/30 to-slate-950/80 shadow-lg shadow-cyan-500/10"
                  : "border-white/5 bg-slate-950/60 hover:border-white/20"
              }`}
              onClick={() => setSelectedHabitIndex(idx)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-cyan-500/20 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                    Habit #{idx + 1}
                  </span>
                  {habit.timestamp_display && onSeekVideo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const [m, s] = habit.timestamp_display.split(":").map(Number);
                        const sec = (m || 0) * 60 + (s || 0);
                        onSeekVideo(sec);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-mono font-semibold text-cyan-300 transition"
                    >
                      <Play className="h-2.5 w-2.5 fill-cyan-300" />
                      <span>Replay {habit.timestamp_display}</span>
                    </button>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white leading-snug">{habit.habit_title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{habit.observable_evidence}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Recommended Drill:</span>
                  <span className="font-semibold text-cyan-300">{habit.recommended_drill}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDrillModal(habit);
                  }}
                  className="w-full rounded-xl bg-cyan-500/10 border border-cyan-400/30 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Practice This Drill</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── INTERACTIVE BEHAVIOR REPLAY TIMELINE ─────────────────────── */}
      {events.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
              Observable Delivery Event Markers ({events.length} Detected)
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">Click marker to jump video player</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {events.map((evt, i) => {
              const startSec = evt.start_ms / 1000;
              const min = Math.floor(startSec / 60);
              const sec = Math.floor(startSec % 60);
              const timeFormatted = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSeekVideo && onSeekVideo(startSec)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition border ${
                    evt.event_type === "LOOK_AWAY"
                      ? "bg-amber-950/50 border-amber-500/30 text-amber-300 hover:bg-amber-900/60"
                      : evt.event_type === "MOVEMENT_SPIKE"
                      ? "bg-purple-950/50 border-purple-500/30 text-purple-300 hover:bg-purple-900/60"
                      : "bg-cyan-950/50 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60"
                  }`}
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span className="font-bold">[{timeFormatted}]</span>
                  <span>{evt.event_type.replace("_", " ")} ({Math.round(evt.duration_ms / 100) / 10}s)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Drill Modal */}
      {activeDrillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="max-w-md w-full rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">{activeDrillModal.recommended_drill}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrillModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{activeDrillModal.drill_instructions}</p>

            <div className="rounded-xl border border-white/5 bg-slate-900/80 p-3 space-y-1">
              <span className="text-[11px] font-mono font-semibold text-cyan-300">Habit Grounding:</span>
              <p className="text-xs text-slate-400">{activeDrillModal.observable_evidence}</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveDrillModal(null)}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 py-2.5 text-xs font-bold text-slate-950 hover:opacity-95 transition"
            >
              Understood • Close Drill
            </button>
          </div>
        </div>
      )}

      {/* Developer / Judge Validation Screen */}
      <JudgeValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        summary={summary}
        onSeekVideo={onSeekVideo}
      />
    </div>
  );
}
