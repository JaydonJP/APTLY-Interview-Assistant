"use client";

import { useEffect, useRef } from "react";
import { Camera, Mic, VideoOff } from "lucide-react";

interface VideoPreviewProps {
  stream: MediaStream | null;
  recordedUrl: string | null;
  isRecording: boolean;
  isCameraReady: boolean;
  isMicReady: boolean;
  faceDetected?: boolean;
  calibrationProgress?: number;
  calibrationState?: "CALIBRATING" | "READY" | "INTERVIEWING";
  framingState?: string;
  className?: string;
}

export function VideoPreview({
  stream,
  recordedUrl,
  isRecording,
  isCameraReady,
  isMicReady,
  faceDetected = true,
  calibrationProgress = 100,
  calibrationState = "READY",
  framingState = "CENTERED",
  className = "",
}: VideoPreviewProps) {
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordedVideoRef = useRef<HTMLVideoElement | null>(null);

  // Directly attach live stream to video element whenever stream changes
  useEffect(() => {
    const video = liveVideoRef.current;
    if (!video) return;

    if (stream && !recordedUrl) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch(() => {
        // Autoplay may need user gesture
      });
    }
  }, [stream, recordedUrl]);

  return (
    <div
      className={`relative w-full h-full min-h-[360px] overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950 shadow-2xl backdrop-blur-xl flex items-center justify-center ${
        isRecording ? "border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.25)]" : ""
      } ${className}`}
    >
      {/* Live Webcam Feed */}
      <video
        ref={liveVideoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover -scale-x-100 transition-opacity duration-300 ${
          !recordedUrl && stream && isCameraReady ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Recorded Playback Video */}
      {recordedUrl && (
        <video
          ref={recordedVideoRef}
          src={recordedUrl}
          controls
          playsInline
          className="absolute inset-0 h-full w-full object-cover z-20"
        />
      )}

      {/* Fallback Audio-Only Placeholder */}
      {!recordedUrl && (!isCameraReady || !stream) && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 text-center z-0">
          {isMicReady ? (
            <>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-950/40 text-indigo-300 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Mic className="h-8 w-8 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Audio Stream Active</p>
                <p className="mt-1 text-xs text-slate-400 font-mono">
                  Camera connecting • Speech metrics & live VAD active
                </p>
              </div>
            </>
          ) : (
            <>
              <VideoOff className="h-10 w-10 text-slate-600 animate-pulse" />
              <p className="text-xs font-mono text-slate-500">Connecting Camera & Microphone Devices...</p>
            </>
          )}
        </div>
      )}

      {/* Top HUD Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium backdrop-blur-md shadow-sm ${
              isCameraReady
                ? "bg-emerald-950/85 text-emerald-300 border border-emerald-500/50"
                : "bg-slate-900/85 text-slate-400 border border-slate-700"
            }`}
          >
            <Camera className="h-3 w-3" />
            <span>{isCameraReady ? "CAM READY" : "CONNECTING CAM"}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium backdrop-blur-md shadow-sm ${
              isMicReady
                ? "bg-emerald-950/85 text-emerald-300 border border-emerald-500/50"
                : "bg-slate-900/85 text-slate-400 border border-slate-700"
            }`}
          >
            <Mic className="h-3 w-3" />
            <span>{isMicReady ? "MIC LIVE" : "CONNECTING MIC"}</span>
          </div>

          {calibrationState === "CALIBRATING" && (
            <div className="flex items-center gap-1.5 rounded-lg bg-indigo-950/90 border border-indigo-500/60 px-2.5 py-1 text-[11px] font-mono font-bold text-indigo-200 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
              <span>CALIBRATING {calibrationProgress}%</span>
            </div>
          )}

          {calibrationState !== "CALIBRATING" && framingState !== "CENTERED" && framingState !== "NO_FACE" && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-950/90 border border-amber-500/60 px-2.5 py-1 text-[10px] font-mono font-bold text-amber-200 backdrop-blur-md">
              <span>FRAMING: {framingState.replace("_", " ")}</span>
            </div>
          )}
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 rounded-lg bg-red-950/90 border border-red-500/60 px-3 py-1 text-xs font-bold text-red-300 animate-pulse backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span>REC 720p</span>
          </div>
        )}
      </div>

      {/* Bottom HUD Mode Label */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none z-30">
        <span className="bg-slate-950/85 px-2.5 py-1 rounded-md border border-slate-800 backdrop-blur-md">
          {recordedUrl ? "RECORDED PLAYBACK" : "LIVE CAMERA FEED"}
        </span>
        <span className="bg-slate-950/85 px-2.5 py-1 rounded-md border border-slate-800 backdrop-blur-md">
          Vision Telemetry Active
        </span>
      </div>
    </div>
  );
}
