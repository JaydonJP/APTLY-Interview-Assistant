"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseMediaCaptureOptions {
  enableVideo?: boolean;
  enableAudio?: boolean;
}

export interface MediaCaptureState {
  isRecording: boolean;
  isCameraReady: boolean;
  isMicReady: boolean;
  recordingDuration: number;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  stream: MediaStream | null;
  mimeType: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  resetRecording: () => void;
}

const MIME_PRIORITY = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/wav",
];

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export function useMediaCapture({
  enableVideo = true,
  enableAudio = true,
}: UseMediaCaptureOptions = {}): MediaCaptureState {
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mimeType, setMimeType] = useState<string>("video/webm");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect supported MIME type
  const getSupportedMimeType = useCallback(() => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "video/webm";
    }
    for (const mime of MIME_PRIORITY) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "";
  }, []);

  // Initialize Media Devices on Mount
  useEffect(() => {
    let mounted = true;

    async function setupStream() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera/Microphone capture is not supported by your browser.");
        }

        const constraints: MediaStreamConstraints = {
          video: enableVideo ? DEFAULT_CONSTRAINTS.video : false,
          audio: enableAudio ? DEFAULT_CONSTRAINTS.audio : false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        const hasVideo = mediaStream.getVideoTracks().length > 0;
        const hasAudio = mediaStream.getAudioTracks().length > 0;
        setIsCameraReady(hasVideo);
        setIsMicReady(hasAudio);
        setError(null);
      } catch (err: unknown) {
        if (!mounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Could not access camera or microphone. Please allow permissions in your browser.";
        setError(msg);
        setIsCameraReady(false);
        setIsMicReady(false);
      }
    }

    void setupStream();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enableVideo, enableAudio]);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    chunksRef.current = [];

    // Ensure active stream
    let activeStream = streamRef.current;
    if (!activeStream || !activeStream.active) {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: enableVideo ? DEFAULT_CONSTRAINTS.video : false,
          audio: enableAudio ? DEFAULT_CONSTRAINTS.audio : false,
        });
        streamRef.current = activeStream;
        setStream(activeStream);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to activate camera/microphone.",
        );
        return;
      }
    }

    try {
      const selectedMime = getSupportedMimeType();
      setMimeType(selectedMime);

      const options: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(activeStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(250); // Collect slices every 250ms
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to start MediaRecorder recording.",
      );
      setIsRecording(false);
    }
  }, [recordedUrl, enableVideo, enableAudio, getSupportedMimeType]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        resolve(recordedBlob);
        return;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      recorder.onstop = () => {
        const finalType = mimeType || "video/webm";
        const combinedBlob = new Blob(chunksRef.current, { type: finalType });
        const url = URL.createObjectURL(combinedBlob);

        setRecordedBlob(combinedBlob);
        setRecordedUrl(url);
        setIsRecording(false);
        resolve(combinedBlob);
      };

      recorder.stop();
    });
  }, [recordedBlob, mimeType]);

  const resetRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    chunksRef.current = [];
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setError(null);
  }, [recordedUrl]);

  return {
    isRecording,
    isCameraReady,
    isMicReady,
    recordingDuration,
    recordedBlob,
    recordedUrl,
    stream,
    mimeType,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
