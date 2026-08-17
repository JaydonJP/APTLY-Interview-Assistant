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
  audioTrackState: "LIVE" | "ENDED" | "MUTED" | "NONE";
  videoTrackState: "LIVE" | "ENDED" | "MUTED" | "NONE";
  micLevelPercent: number;
  recordingDuration: number;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  sha256Hash: string;
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
  const [audioTrackState, setAudioTrackState] = useState<"LIVE" | "ENDED" | "MUTED" | "NONE">("NONE");
  const [videoTrackState, setVideoTrackState] = useState<"LIVE" | "ENDED" | "MUTED" | "NONE">("NONE");
  const [micLevelPercent, setMicLevelPercent] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [sha256Hash, setSha256Hash] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mimeType, setMimeType] = useState<string>("video/webm");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Detect supported MIME type dynamically
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

  // Compute SHA-256 Checksum in browser
  const computeChecksum = async (blob: Blob): Promise<string> => {
    try {
      const buffer = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return "";
    }
  };

  // Setup Web Audio API volume monitor
  const setupAudioMonitoring = (mediaStream: MediaStream) => {
    try {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevelPercent(normalized);
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {
      // Audio context might fail in background tabs; gracefully ignore
    }
  };

  // Initialize Media Devices on Mount
  useEffect(() => {
    let mounted = true;

    async function setupStream() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera/Microphone capture is not supported by your browser.");
        }

        let mediaStream: MediaStream;
        try {
          const constraints: MediaStreamConstraints = {
            video: enableVideo ? DEFAULT_CONSTRAINTS.video : false,
            audio: enableAudio ? DEFAULT_CONSTRAINTS.audio : false,
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (vidErr) {
          // If video requested but failed (e.g. no camera, camera in use, permission denied), fallback to audio-only
          if (enableVideo && enableAudio) {
            console.warn("Camera access failed, falling back to audio-only capture:", vidErr);
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: DEFAULT_CONSTRAINTS.audio,
            });
          } else {
            throw vidErr;
          }
        }

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        const vTracks = mediaStream.getVideoTracks();
        const aTracks = mediaStream.getAudioTracks();

        setIsCameraReady(vTracks.length > 0);
        setIsMicReady(aTracks.length > 0);

        setVideoTrackState(vTracks.length > 0 ? (vTracks[0].readyState === "live" ? "LIVE" : "ENDED") : "NONE");
        setAudioTrackState(aTracks.length > 0 ? (aTracks[0].readyState === "live" ? "LIVE" : "ENDED") : "NONE");

        setupAudioMonitoring(mediaStream);
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
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
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
    setSha256Hash("");
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
        setupAudioMonitoring(activeStream);
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

      recorder.start(1000); // Timeslice 1000ms
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

      recorder.onstop = async () => {
        const finalType = mimeType || "video/webm";
        const combinedBlob = new Blob(chunksRef.current, { type: finalType });
        const url = URL.createObjectURL(combinedBlob);
        const hash = await computeChecksum(combinedBlob);

        setRecordedBlob(combinedBlob);
        setRecordedUrl(url);
        setSha256Hash(hash);
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
    setSha256Hash("");
    setIsRecording(false);
    setRecordingDuration(0);
    setError(null);
  }, [recordedUrl]);

  return {
    isRecording,
    isCameraReady,
    isMicReady,
    audioTrackState,
    videoTrackState,
    micLevelPercent,
    recordingDuration,
    recordedBlob,
    recordedUrl,
    sha256Hash,
    stream,
    mimeType,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
