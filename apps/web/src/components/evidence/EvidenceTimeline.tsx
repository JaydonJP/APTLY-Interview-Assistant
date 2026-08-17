"use client";

import React, { useState, useMemo } from "react";
import {
  EvidenceEvent,
  EvidenceEventType,
  EvidenceSource,
  formatEventTime,
  getEventTypeBadge,
} from "@/types/evidence";
import { EvidenceEventCard } from "./EvidenceEventCard";
import {
  Filter,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface EvidenceTimelineProps {
  events: EvidenceEvent[];
  totalDurationMs?: number;
  selectedEventId?: string | null;
  onSelectEvent?: (event: EvidenceEvent) => void;
  onSeek?: (seconds: number) => void;
}

export function EvidenceTimeline({
  events,
  totalDurationMs = 120000,
  selectedEventId,
  onSelectEvent,
  onSeek,
}: EvidenceTimelineProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const maxDurationMs = useMemo(() => {
    if (events.length === 0) return totalDurationMs || 60000;
    const lastEventEnd = Math.max(...events.map((e) => e.end_ms || (e.end_seconds ? e.end_seconds * 1000 : 0)));
    return Math.max(totalDurationMs || 0, lastEventEnd, 10000);
  }, [events, totalDurationMs]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Category filter
      if (selectedCategory === "DELIVERY") {
        if (!["filler", "pause", "pace_shift", "camera_attention", "voice_energy"].includes(e.type)) {
          return false;
        }
      } else if (selectedCategory === "CONTENT") {
        if (!["unsupported_claim", "star_gap", "ownership_gap", "consistency_issue", "strong_evidence"].includes(e.type)) {
          return false;
        }
      } else if (selectedCategory !== "ALL" && e.type !== selectedCategory) {
        return false;
      }

      // Source filter
      if (selectedSource !== "ALL" && e.source !== selectedSource) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(query);
        const matchExplanation = (e.explanation || e.description || "").toLowerCase().includes(query);
        const matchQuote = (e.payload?.quote || e.quote || "").toLowerCase().includes(query);
        if (!matchTitle && !matchExplanation && !matchQuote) return false;
      }

      return true;
    });
  }, [events, selectedCategory, selectedSource, searchQuery]);

  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || (filteredEvents.length > 0 ? filteredEvents[0] : null);
  }, [events, selectedEventId, filteredEvents]);

  const handleEventClick = (event: EvidenceEvent) => {
    onSelectEvent?.(event);
    const startSec = event.start_ms ? event.start_ms / 1000 : event.start_seconds || 0;
    onSeek?.(startSec);
  };

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              selectedCategory === "ALL"
                ? "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("DELIVERY")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              selectedCategory === "DELIVERY"
                ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Delivery & Pacing
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("CONTENT")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              selectedCategory === "CONTENT"
                ? "bg-rose-500/20 text-rose-200 border border-rose-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Content & Claims
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Interactive Visual Timeline Bar */}
      <div className="rounded-xl border border-white/8 bg-black/40 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-violet-400" /> Replay Timeline
          </span>
          <span className="font-mono text-[11px]">
            Total: {formatEventTime(maxDurationMs)}
          </span>
        </div>

        <div className="relative h-12 w-full rounded-lg bg-white/[0.03] border border-white/6 overflow-hidden flex items-center px-2">
          {/* Proportional Event Pins */}
          {events.map((evt) => {
            const startMs = evt.start_ms ?? (evt.start_seconds ? evt.start_seconds * 1000 : 0);
            const leftPercent = Math.min(98, Math.max(1, (startMs / maxDurationMs) * 100));
            const isSelected = evt.id === activeEvent?.id;
            const badge = getEventTypeBadge(evt.type);

            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => handleEventClick(evt)}
                title={`${evt.title} (${formatEventTime(startMs)})`}
                style={{ left: `${leftPercent}%` }}
                className={`absolute -translate-x-1/2 top-1/2 -translate-y-1/2 h-7 w-2 rounded-full transition-all duration-200 ${
                  isSelected
                    ? "h-9 w-3 bg-violet-400 ring-2 ring-violet-300 ring-offset-1 ring-offset-black z-20"
                    : `${badge.bg} hover:h-8 hover:w-2.5 z-10 border ${badge.border}`
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Filtered Event Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            No evidence events matched your filters.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <EvidenceEventCard
              key={evt.id}
              event={evt}
              isSelected={evt.id === activeEvent?.id}
              onSelect={handleEventClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
