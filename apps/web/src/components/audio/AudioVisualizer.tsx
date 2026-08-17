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
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream || !isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      // Render idle visual
      const canvas = canvasRef.current;
      if (canvas) {
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
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (canvas.height * 0.85);

          // Vibrant neon cyan to electric indigo gradient
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.2)");
          gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.8)");
          gradient.addColorStop(1, "rgba(99, 102, 241, 1)");

          ctx.fillStyle = gradient;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(6, 182, 212, 0.5)";

          // Rounded bar rendering
          const y = (canvas.height - barHeight) / 2;
          ctx.fillRect(x, y, barWidth - 2, Math.max(3, barHeight));

          x += barWidth;
        }
      };

      draw();
    } catch (err) {
      console.warn("AudioVisualizer AudioContext error:", err);
    }

    return () => {
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
    <div className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 shadow-inner ${className}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={80}
        className="w-full h-full max-h-20"
      />
      {!isRecording && (
        <span className="absolute text-xs font-mono uppercase tracking-wider text-slate-500">
          Audio Idle — Microphone Standby
        </span>
      )}
    </div>
  );
}
