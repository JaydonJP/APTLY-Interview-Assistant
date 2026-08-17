"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  stream: MediaStream | null;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingDuration: 0,
    audioBlob: null,
    audioUrl: null,
    stream: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    clearTimer();
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState((prev) => ({
        ...prev,
        error: "Your browser does not support audio recording (navigator.mediaDevices unavailable).",
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const combinedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(combinedBlob);
        setState((prev) => ({
          ...prev,
          isRecording: false,
          audioBlob: combinedBlob,
          audioUrl: url,
        }));
      };

      mediaRecorder.start(250); // Collect data chunks every 250ms
      startTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
        setState((prev) => ({
          ...prev,
          recordingDuration: Math.round(elapsedSeconds * 10) / 10,
        }));
      }, 100);

      setState({
        isRecording: true,
        isPaused: false,
        recordingDuration: 0,
        audioBlob: null,
        audioUrl: null,
        stream,
        error: null,
      });
    } catch (err: unknown) {
      const errMessage =
        err instanceof Error
          ? err.name === "NotAllowedError"
            ? "Microphone access was denied. Please grant microphone permissions in your browser settings to record answers."
            : err.message
          : "Could not access microphone.";

      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errMessage,
      }));
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    clearTimer();

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || "audio/webm";
          const combinedBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(combinedBlob);

          // Stop all stream audio tracks to turn off mic light
          if (state.stream) {
            state.stream.getTracks().forEach((track) => track.stop());
          }

          setState((prev) => ({
            ...prev,
            isRecording: false,
            audioBlob: combinedBlob,
            audioUrl: url,
            stream: null,
          }));

          resolve(combinedBlob);
        };
        recorder.stop();
      } else {
        resolve(null);
      }
    });
  }, [state.stream]);

  const resetRecording = useCallback(() => {
    clearTimer();
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    audioChunksRef.current = [];
    setState({
      isRecording: false,
      isPaused: false,
      recordingDuration: 0,
      audioBlob: null,
      audioUrl: null,
      stream: null,
      error: null,
    });
  }, [state.audioUrl, state.stream]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [state.audioUrl, state.stream]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
