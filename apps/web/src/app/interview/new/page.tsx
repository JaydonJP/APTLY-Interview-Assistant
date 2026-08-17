import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Mic } from "lucide-react";

export const metadata: Metadata = {
  title: "New Interview",
  description: "Start a new AI-powered practice interview",
};

export default function NewInterviewPage() {
  return (
    <AppShell>
      <PageHeader
        title="New Interview"
        description="Configure your AI interview session"
      />

      <Card id="new-interview-placeholder">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Mic className="h-8 w-8 text-slate-400" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-slate-900">Coming in Phase 1</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              The full interview engine — job description analysis, dynamic
              question generation, WebSocket realtime voice, and async
              processing — is coming in Phase 1.
            </p>
          </div>
          <div className="grid gap-3 text-left rounded-lg bg-slate-50 border border-slate-200 px-4 py-4 text-sm max-w-md w-full">
            <p className="font-semibold text-slate-900">Phase 1 will include:</p>
            <ul className="space-y-1.5 text-slate-600">
              <li>📋 Job description analysis → structured role profile</li>
              <li>🤔 Dynamic interview question generation</li>
              <li>🎙 WebSocket realtime AI interviewer (TTS)</li>
              <li>📝 Async Whisper transcription with word timing</li>
              <li>⚡ Speech metrics (WPM, fillers, pauses)</li>
              <li>📊 LLM content evaluation (STAR, depth, claims)</li>
            </ul>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
