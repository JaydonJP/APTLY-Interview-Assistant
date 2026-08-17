"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Camera, CheckCircle2, Mic, ShieldAlert, Sparkles, Video } from "lucide-react";

interface RecordingConsentModalProps {
  isOpen: boolean;
  onConsent: (granted: boolean) => void;
}

export function RecordingConsentModal({ isOpen, onConsent }: RecordingConsentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg border-indigo-500/30 bg-slate-900 shadow-2xl p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="rounded-xl bg-indigo-500/20 p-3 text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Interview Media & Recording Consent</h2>
            <p className="text-xs text-slate-400">APTLY AI Multimodal Performance Engine</p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg bg-slate-950/60 p-4 text-xs text-slate-300 border border-slate-800 leading-relaxed">
          <p>
            APTLY uses your <strong>microphone</strong> and <strong>camera</strong> to record each answer so it can provide:
          </p>
          <ul className="space-y-2 pl-1">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Word-level timestamped transcripts aligned to your speech</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Deterministic speech metrics (WPM, filler words, pauses)</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Gemini-powered semantic scoring and adaptive follow-up questions</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Post-interview answer playback with synchronized video seeking</span>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => onConsent(true)}
            className="w-full justify-center py-2.5 font-semibold space-x-2 bg-indigo-600 hover:bg-indigo-500"
          >
            <Camera className="h-4 w-4" />
            <span>Enable Recording & AI Analysis (Recommended)</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => onConsent(false)}
            className="w-full justify-center py-2 text-xs text-slate-400 hover:text-slate-200"
          >
            Continue Without Recording (Text Mode Only)
          </Button>
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          Recordings are stored securely in your private Supabase media bucket and can be reviewed or deleted anytime.
        </p>
      </Card>
    </div>
  );
}
