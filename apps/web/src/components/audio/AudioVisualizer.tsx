"use client";

import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  className?: string;
}

export function AudioVisualizer({
  stream,
  isRecording,
  className = "",
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Always draw idle baseline first
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.strokeStyle = "rgba(71, 85, 105, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (!stream || !isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      return;
    }

    let isMounted = true;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        void audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isMounted) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const rawVal = dataArray[i] || 0;
          const barHeight = Math.max(4, (rawVal / 255) * (canvas.height * 0.8));

          const gradient = ctx.createLinearGradient(
            0,
            canvas.height,
            0,
            canvas.height - barHeight,
          );
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.2)");
          gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.8)");
          gradient.addColorStop(1, "rgba(99, 102, 241, 1)");

          ctx.fillStyle = gradient;
          const y = (canvas.height - barHeight) / 2;
          ctx.fillRect(x, y, barWidth - 3, barHeight);

          x += barWidth;
        }
      };

      draw();
    } catch (err) {
      console.warn("AudioVisualizer AudioContext error:", err);
    }

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [stream, isRecording]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 shadow-inner ${className}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Audio Frequency Spectrum (Mic)
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isRecording ? "bg-cyan-400 animate-ping" : "bg-slate-600"
          }`}
        />
      </div>
      <canvas
        ref={canvasRef}
        width={480}
        height={48}
        className="h-12 w-full rounded"
      />
    </div>
  );
}
