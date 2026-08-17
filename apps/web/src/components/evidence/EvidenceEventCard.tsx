"use client";

import React from "react";
import {
  EvidenceEvent,
  formatEventTime,
  getEventTypeBadge,
  getSourceBadge,
} from "@/types/evidence";
import { Quote, AlertCircle, Sparkles, CheckCircle2, Waves, Eye, Mic } from "lucide-react";

interface EvidenceEventCardProps {
  event: EvidenceEvent;
  isSelected?: boolean;
  onSelect?: (event: EvidenceEvent) => void;
  compact?: boolean;
}

export function EvidenceEventCard({
  event,
  isSelected = false,
  onSelect,
  compact = false,
}: EvidenceEventCardProps) {
  const typeBadge = getEventTypeBadge(event.type);
  const sourceBadge = getSourceBadge(event.source);
  const startMs = event.start_ms ?? (event.start_seconds ? event.start_seconds * 1000 : 0);
  const endMs = event.end_ms ?? (event.end_seconds ? event.end_seconds * 1000 : startMs);
  const quote = event.payload?.quote || event.quote || event.payload?.word;

  const getIcon = () => {
    switch (event.type) {
      case "camera_attention":
        return <Eye className="h-3.5 w-3.5" />;
      case "voice_energy":
        return <Mic className="h-3.5 w-3.5" />;
      case "strong_evidence":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "unsupported_claim":
      case "star_gap":
      case "ownership_gap":
        return <AlertCircle className="h-3.5 w-3.5 text-rose-400" />;
      case "filler":
      case "pause":
      case "pace_shift":
        return <Waves className="h-3.5 w-3.5 text-indigo-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div
      onClick={() => onSelect?.(event)}
      className={`group relative rounded-xl border p-4 transition cursor-pointer text-left ${
        isSelected
          ? "border-violet-400/50 bg-violet-500/10 shadow-lg shadow-violet-500/5 ring-1 ring-violet-400/30"
          : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}
          >
            {getIcon()}
            {typeBadge.label}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${sourceBadge.bg} ${sourceBadge.text}`}
          >
            {sourceBadge.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-[11px] text-slate-400">
            {formatEventTime(startMs)} – {formatEventTime(endMs)}
          </span>
          <div className="flex gap-0.5" title={`Severity ${event.severity}/5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i < event.severity
                    ? event.severity >= 4
                      ? "bg-rose-400"
                      : event.severity >= 3
                      ? "bg-amber-400"
                      : "bg-indigo-400"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <h4 className="mt-2.5 text-sm font-semibold text-white tracking-tight">
        {event.title}
      </h4>

      <p className="mt-1 text-xs leading-relaxed text-slate-300">
        {event.explanation || event.description}
      </p>

      {quote && (
        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-white/6 bg-black/25 px-3 py-2 text-xs text-slate-300">
          <Quote className="h-3 w-3 shrink-0 text-slate-500 mt-0.5" />
          <span className="italic line-clamp-2">"{quote}"</span>
        </div>
      )}
    </div>
  );
}
