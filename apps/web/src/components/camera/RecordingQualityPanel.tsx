"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Activity, CheckCircle2, ChevronDown, ChevronUp, Cpu, Database, Mic, Video, Volume2 } from "lucide-react";

export interface RecordingDiagnostics {
  micState: "CONNECTED" | "MUTED" | "DISCONNECTED";
  audioTrackState: "LIVE" | "ENDED" | "MUTED" | "NONE";
  cameraState: "CONNECTED" | "DISCONNECTED";
  videoTrackState: "LIVE" | "ENDED" | "MUTED" | "NONE";
  recordingState: "IDLE" | "READY" | "RECORDING" | "FINALIZING" | "UPLOADED" | "PROCESSING" | "PROCESSED";
  mimeType: string;
  codec: string;
  blobSizeBytes: number;
  durationSeconds: number;
  sha256Hash: string;
  micLevelPercent: number;
  audioStreamDetected: boolean;
  normalizedFormat: string;
  whisperStatus: "PENDING" | "TRANSCRIBING" | "COMPLETED" | "FAILED";
  transcriptWordCount: number;
  geminiStatus: "PENDING" | "EVALUATING" | "COMPLETED" | "FAILED";
}

interface RecordingQualityPanelProps {
  diagnostics: RecordingDiagnostics;
}

export function RecordingQualityPanel({ diagnostics }: RecordingQualityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-md w-full">
      <Card className="border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-2xl text-xs overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="font-semibold tracking-wide">Phase 3 Recording & Engine Diagnostics</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={diagnostics.recordingState === "RECORDING" ? "destructive" : "outline"} className="text-[10px]">
              {diagnostics.recordingState}
            </Badge>
            {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
          </div>
        </button>

        {isOpen && (
          <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
            {/* Live Audio & Video Hardware Tracks */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/50 p-2 rounded border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Mic className="h-3.5 w-3.5" />
                  <span className="font-medium">Microphone</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Track:</span>
                  <span className={diagnostics.audioTrackState === "LIVE" ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                    {diagnostics.audioTrackState}
                  </span>
                </div>
                {/* Live Volume Meter */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-75"
                    style={{ width: `${Math.min(100, diagnostics.micLevelPercent)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-950/50 p-2 rounded border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Video className="h-3.5 w-3.5" />
                  <span className="font-medium">Camera</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Track:</span>
                  <span className={diagnostics.videoTrackState === "LIVE" ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                    {diagnostics.videoTrackState}
                  </span>
                </div>
              </div>
            </div>

            {/* Media Container & Codec Specs */}
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">MIME Type:</span>
                <span className="text-slate-200 font-mono text-[10px]">{diagnostics.mimeType || "video/webm;codecs=vp9,opus"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Captured Size:</span>
                <span className="text-slate-200 font-mono text-[11px]">{(diagnostics.blobSizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="text-slate-200 font-mono text-[11px]">{diagnostics.durationSeconds.toFixed(1)}s</span>
              </div>
              {diagnostics.sha256Hash && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">SHA-256:</span>
                  <span className="text-slate-400 font-mono text-[9px] truncate max-w-[220px]" title={diagnostics.sha256Hash}>
                    {diagnostics.sha256Hash.slice(0, 16)}...{diagnostics.sha256Hash.slice(-8)}
                  </span>
                </div>
              )}
            </div>

            {/* Server Processing Engine Pipeline */}
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-slate-400 font-medium pb-1 border-b border-slate-800">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>Backend Pipeline Status</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">FFmpeg Audio:</span>
                <span className="text-cyan-400 font-mono text-[10px]">16kHz / Mono PCM WAV</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">WhisperX ASR:</span>
                <span className="text-emerald-400 font-mono text-[10px]">
                  {diagnostics.whisperStatus} ({diagnostics.transcriptWordCount} words)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Gemini LLM:</span>
                <span className="text-indigo-400 font-mono text-[10px]">
                  {diagnostics.geminiStatus} (gemini-2.5-flash)
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
