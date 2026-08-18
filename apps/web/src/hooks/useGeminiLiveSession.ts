"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { GeminiLiveTokenResponse, LiveSessionStatus } from "@/types/realtime";

interface UseGeminiLiveSessionOptions {
  interviewId: string;
  enabled?: boolean;
  onInterruption?: () => void;
  onTurnComplete?: (transcript: string) => void;
}

export function useGeminiLiveSession({
  interviewId,
  enabled = true,
  onInterruption,
  onTurnComplete,
}: UseGeminiLiveSessionOptions) {
  const [status, setStatus] = useState<LiveSessionStatus>("Connecting");
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [partialInputTranscript, setPartialInputTranscript] = useState<string>("");
  const [partialOutputTranscript, setPartialOutputTranscript] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveWpm, setLiveWpm] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const playbackQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const isInterruptedRef = useRef<boolean>(false);

  // Instantly flush any queued interviewer playback audio
  const flushPlaybackQueue = useCallback(() => {
    isInterruptedRef.current = true;
    playbackQueueRef.current.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore stopped sources
      }
    });
    playbackQueueRef.current = [];
    if (onInterruption) {
      onInterruption();
    }
  }, [onInterruption]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const interruptInterviewer = useCallback(() => {
    flushPlaybackQueue();
    setStatus("Candidate speaking");
  }, [flushPlaybackQueue]);

  // Connect to Gemini Live
  const connectLiveSession = useCallback(async () => {
    if (!enabled || !interviewId) return;

    try {
      setStatus("Connecting");
      const tokenRes = await apiClient.post<GeminiLiveTokenResponse>(
        `/api/v1/interviews/${interviewId}/live-token`,
      );

      if (!tokenRes.enabled || !tokenRes.websocket_url) {
        setIsFallback(true);
        setFallbackReason(tokenRes.fallback_reason || "Live feature unavailable");
        setStatus("Offline fallback");
        return;
      }

      // Live mode enabled — establish stateful WebSocket
      const socket = new WebSocket(tokenRes.websocket_url);
      socketRef.current = socket;

      socket.onopen = async () => {
        setStatus("Listening");
        setIsFallback(false);

        // Initialize AudioWorklet for 16kHz PCM mic capture
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000,
          });
          audioContextRef.current = audioCtx;

          await audioCtx.audioWorklet.addModule("/audio-processor.js");
          const source = audioCtx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(audioCtx, "aptly-audio-processor");
          workletNodeRef.current = workletNode;

          workletNode.port.onmessage = (event) => {
            if (socket.readyState === WebSocket.OPEN && !isMuted) {
              const pcmBuffer = event.data as ArrayBuffer;
              const base64Audio = btoa(
                String.fromCharCode(...new Uint8Array(pcmBuffer)),
              );

              // Send real-time 16kHz PCM audio chunk to Gemini Live API
              socket.send(
                JSON.stringify({
                  realtime_input: {
                    media_chunks: [
                      {
                        mime_type: "audio/pcm",
                        data: base64Audio,
                      },
                    ],
                  },
                }),
              );
            }
          };

          source.connect(workletNode);
          workletNode.connect(audioCtx.destination);
        } catch (err) {
          console.warn("AudioWorklet initialization fallback:", err);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Model output text / audio chunk
          if (data.serverContent?.modelTurn?.parts) {
            setStatus("Interviewer speaking");
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.text) {
                setPartialOutputTranscript((prev) => prev + part.text);
              }
            }
          }

          // User input turn transcript & live WPM estimation
          if (data.serverContent?.turnComplete) {
            setStatus("Processing turn");
            if (onTurnComplete) {
              onTurnComplete(partialInputTranscript);
            }
          }

          // Interruption event from Gemini Live
          if (data.serverContent?.interrupted) {
            flushPlaybackQueue();
            setStatus("Candidate speaking");
          }
        } catch {
          // Non-json frame
        }
      };

      socket.onclose = () => {
        setStatus("Offline fallback");
        setIsFallback(true);
      };

      socket.onerror = () => {
        setStatus("Offline fallback");
        setIsFallback(true);
      };
    } catch (err) {
      console.warn("Gemini Live session error:", err);
      setIsFallback(true);
      setStatus("Offline fallback");
    }
  }, [enabled, interviewId, isMuted, flushPlaybackQueue, onTurnComplete, partialInputTranscript]);

  useEffect(() => {
    connectLiveSession();

    return () => {
      flushPlaybackQueue();
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [connectLiveSession, flushPlaybackQueue]);

  return {
    status,
    isFallback,
    fallbackReason,
    partialInputTranscript,
    partialOutputTranscript,
    liveWpm,
    isMuted,
    toggleMute,
    interruptInterviewer,
    reconnect: connectLiveSession,
  };
}
