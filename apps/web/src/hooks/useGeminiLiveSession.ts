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

interface WindowWithAudioContext extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function useGeminiLiveSession({
  interviewId,
  enabled = true,
  onInterruption,
  onTurnComplete,
}: UseGeminiLiveSessionOptions) {
  const [status, setStatus] = useState<LiveSessionStatus>("Connecting");
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [partialInputTranscript, setPartialInputTranscript] = useState("");
  const [partialOutputTranscript, setPartialOutputTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const playbackQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackCursorRef = useRef(0);
  const isMutedRef = useRef(false);
  const inputTranscriptRef = useRef("");
  const outputTranscriptRef = useRef("");
  const turnStartedAtRef = useRef<number | null>(null);
  const onTurnCompleteRef = useRef(onTurnComplete);
  const onInterruptionRef = useRef(onInterruption);
  const closedByEffectRef = useRef(false);

  useEffect(() => {
    onTurnCompleteRef.current = onTurnComplete;
    onInterruptionRef.current = onInterruption;
  }, [onInterruption, onTurnComplete]);

  const flushPlaybackQueue = useCallback(() => {
    playbackQueueRef.current.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // A source may already have completed.
      }
    });
    playbackQueueRef.current = [];
    playbackCursorRef.current = 0;
    onInterruptionRef.current?.();
  }, []);

  const playPcmAudio = useCallback(async (base64Audio: string) => {
    if (!base64Audio || closedByEffectRef.current) return;
    const bytes = base64ToBytes(base64Audio);
    if (bytes.byteLength < 2) return;

    const context = playbackContextRef.current ?? new AudioContext({ sampleRate: 24_000 });
    playbackContextRef.current = context;
    if (context.state === "suspended") await context.resume();

    const sampleCount = Math.floor(bytes.byteLength / 2);
    const audioBuffer = context.createBuffer(1, sampleCount, 24_000);
    const channel = audioBuffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = view.getInt16(index * 2, true) / 32_768;
    }

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime, playbackCursorRef.current);
    source.start(startAt);
    playbackCursorRef.current = startAt + audioBuffer.duration;
    playbackQueueRef.current.push(source);
    source.onended = () => {
      playbackQueueRef.current = playbackQueueRef.current.filter((item) => item !== source);
      source.disconnect();
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      isMutedRef.current = next;
      mediaStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const interruptInterviewer = useCallback(() => {
    flushPlaybackQueue();
    setStatus("Candidate speaking");
  }, [flushPlaybackQueue]);

  const connectLiveSession = useCallback(async () => {
    if (!enabled || !interviewId || closedByEffectRef.current) return;

    try {
      setStatus("Connecting");
      const tokenRes = await apiClient.post<GeminiLiveTokenResponse>(
        `/api/v1/interviews/${interviewId}/live-token`,
      );

      if (!tokenRes.enabled || !tokenRes.websocket_url || !tokenRes.ephemeral_token) {
        setIsFallback(true);
        setFallbackReason(tokenRes.fallback_reason || "Live feature unavailable");
        setStatus("Offline fallback");
        return;
      }

      const socketUrl = new URL(tokenRes.websocket_url);
      socketUrl.searchParams.set("access_token", tokenRes.ephemeral_token);
      const socket = new WebSocket(socketUrl.toString());
      socketRef.current = socket;

      socket.onopen = async () => {
        setStatus("Listening");
        setIsFallback(false);
        setFallbackReason(null);

        // Setup must be the first protocol message for Gemini's v1beta API.
        socket.send(
          JSON.stringify({
            setup: {
              model: tokenRes.model.startsWith("models/")
                ? tokenRes.model
                : `models/${tokenRes.model}`,
              responseModalities: ["AUDIO"],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction: {
                parts: [
                  {
                    text: "You are APTLY, a concise evidence-seeking interview coach. Ask one grounded question at a time and never infer emotion or personality.",
                  },
                ],
              },
            },
          }),
        );

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          const audioWindow = window as WindowWithAudioContext;
          const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
          if (!AudioContextConstructor) throw new Error("Web Audio is unavailable in this browser.");
          const audioContext = new AudioContextConstructor({
            sampleRate: 16_000,
          }) as AudioContext;
          audioContextRef.current = audioContext;
          await audioContext.audioWorklet.addModule("/audio-processor.js");
          const source = audioContext.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(audioContext, "aptly-audio-processor");
          workletNodeRef.current = workletNode;

          workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
            if (socket.readyState !== WebSocket.OPEN || isMutedRef.current) return;
            const bytes = new Uint8Array(event.data);
            let binary = "";
            for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
            socket.send(
              JSON.stringify({
                realtimeInput: {
                  audio: {
                    data: btoa(binary),
                    mimeType: "audio/pcm;rate=16000",
                  },
                },
              }),
            );
          };

          source.connect(workletNode);
          // Keep the worklet alive without routing microphone audio back to speakers.
          const silentGain = audioContext.createGain();
          silentGain.gain.value = 0;
          workletNode.connect(silentGain);
          silentGain.connect(audioContext.destination);
        } catch (error) {
          setFallbackReason(error instanceof Error ? error.message : "Microphone unavailable");
          setIsFallback(true);
          setStatus("Offline fallback");
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            serverContent?: {
              modelTurn?: { parts?: Array<{ text?: string; inlineData?: { data?: string } }> };
              inputTranscription?: { text?: string };
              outputTranscription?: { text?: string };
              turnComplete?: boolean;
              interrupted?: boolean;
            };
          };
          const serverContent = data.serverContent;
          if (!serverContent) return;

          const inputText = serverContent.inputTranscription?.text;
          if (inputText) {
            if (!turnStartedAtRef.current) turnStartedAtRef.current = Date.now();
            inputTranscriptRef.current += inputText;
            setPartialInputTranscript(inputTranscriptRef.current);
            const elapsedMinutes = Math.max(1 / 60, (Date.now() - turnStartedAtRef.current) / 60_000);
            setLiveWpm(Math.round(inputTranscriptRef.current.trim().split(/\s+/).filter(Boolean).length / elapsedMinutes));
            setStatus("Candidate speaking");
          }

          const outputText = serverContent.outputTranscription?.text;
          if (outputText) {
            outputTranscriptRef.current += outputText;
            setPartialOutputTranscript(outputTranscriptRef.current);
            setStatus("Interviewer speaking");
          }

          for (const part of serverContent.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) void playPcmAudio(part.inlineData.data);
            if (part.text) {
              outputTranscriptRef.current += part.text;
              setPartialOutputTranscript(outputTranscriptRef.current);
            }
          }

          if (serverContent.interrupted) {
            flushPlaybackQueue();
            setStatus("Candidate speaking");
          }

          if (serverContent.turnComplete) {
            const completedTranscript = inputTranscriptRef.current.trim();
            if (completedTranscript) onTurnCompleteRef.current?.(completedTranscript);
            inputTranscriptRef.current = "";
            outputTranscriptRef.current = "";
            turnStartedAtRef.current = null;
            setPartialInputTranscript("");
            setPartialOutputTranscript("");
            setLiveWpm(0);
            setStatus("Listening");
          }
        } catch {
          // Ignore non-JSON frames from the WebSocket transport.
        }
      };

      socket.onerror = () => {
        setIsFallback(true);
        setFallbackReason("Gemini Live connection failed");
        setStatus("Offline fallback");
      };
      socket.onclose = () => {
        if (!closedByEffectRef.current) {
          setIsFallback(true);
          setFallbackReason("Gemini Live connection closed");
          setStatus("Offline fallback");
        }
      };
    } catch (error) {
      setIsFallback(true);
      setFallbackReason(error instanceof Error ? error.message : "Live session unavailable");
      setStatus("Offline fallback");
    }
  }, [enabled, interviewId, flushPlaybackQueue, playPcmAudio]);

  useEffect(() => {
    closedByEffectRef.current = false;
    if (!enabled) {
      setStatus("Offline fallback");
      return;
    }
    void connectLiveSession();

    return () => {
      closedByEffectRef.current = true;
      flushPlaybackQueue();
      socketRef.current?.close();
      socketRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      workletNodeRef.current?.disconnect();
      workletNodeRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      void playbackContextRef.current?.close();
      playbackContextRef.current = null;
    };
  }, [connectLiveSession, enabled, flushPlaybackQueue]);

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
