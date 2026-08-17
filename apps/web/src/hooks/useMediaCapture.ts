"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseMediaCaptureOptions {
  enableVideo?: boolean;
  enableAudio?: boolean;
  enableVAD?: boolean;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface MediaCaptureState {
  isRecording: boolean;
  isCameraReady: boolean;
  isMicReady: boolean;
  isSpeaking: boolean;
  audioTrackState: "LIVE" | "ENDED" | "MUTED" | "NONE";
  videoTrackState: "LIVE" | "ENDED" | "MUTED" | "NONE";
  micLevelPercent: number;
  recordingDuration: number;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  sha256Hash: string;
  stream: MediaStream | null;
  mimeType: string;
  liveTranscript: string;
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

// Typed helper for browser SpeechRecognition
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useMediaCapture({
  enableVideo = true,
  enableAudio = true,
  enableVAD = true,
  onSpeechStart,
  onSpeechEnd,
}: UseMediaCaptureOptions = {}): MediaCaptureState {
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioTrackState, setAudioTrackState] = useState<"LIVE" | "ENDED" | "MUTED" | "NONE">("NONE");
  const [videoTrackState, setVideoTrackState] = useState<"LIVE" | "ENDED" | "MUTED" | "NONE">("NONE");
  const [micLevelPercent, setMicLevelPercent] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [sha256Hash, setSha256Hash] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mimeType, setMimeType] = useState<string>("video/webm");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // VAD & Speech Recognition Refs
  const isSpeakingRef = useRef<boolean>(false);
  const speechStartTimeRef = useRef<number>(0);
  const silenceStartTimeRef = useRef<number>(0);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechStartRef.current = onSpeechStart;
  onSpeechEndRef.current = onSpeechEnd;

  const recognitionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>("");

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

  // Setup Web Audio API volume monitor & Voice Activity Detection (VAD)
  const setupAudioMonitoring = (mediaStream: MediaStream) => {
    try {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

        // VAD Logic when recording is active
        if (enableVAD && mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          const now = Date.now();
          const isVoiceActive = normalized >= 8;

          if (isVoiceActive) {
            silenceStartTimeRef.current = 0;
            if (!isSpeakingRef.current) {
              isSpeakingRef.current = true;
              speechStartTimeRef.current = now;
              setIsSpeaking(true);
              if (onSpeechStartRef.current) {
                onSpeechStartRef.current();
              }
            }
          } else {
            // Voice inactive (silence)
            if (isSpeakingRef.current) {
              if (!silenceStartTimeRef.current) {
                silenceStartTimeRef.current = now;
              } else {
                const silenceDuration = now - silenceStartTimeRef.current;
                const speechDuration = now - speechStartTimeRef.current;

                // If candidate spoke for at least 2.5s and silence has lasted > 2.0s, trigger end of turn
                if (speechDuration >= 2500 && silenceDuration >= 2000) {
                  isSpeakingRef.current = false;
                  setIsSpeaking(false);
                  silenceStartTimeRef.current = 0;
                  if (onSpeechEndRef.current) {
                    onSpeechEndRef.current();
                  }
                }
              }
            }
          }
        }

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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [enableVideo, enableAudio]);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecordedBlob(null);
    setSha256Hash("");
    setLiveTranscript("");
    transcriptBufferRef.current = "";
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    chunksRef.current = [];
    isSpeakingRef.current = false;
    silenceStartTimeRef.current = 0;
    speechStartTimeRef.current = 0;
    setIsSpeaking(false);

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

      // Start Browser Speech Recognition for Live Accurate Transcripts
      if (typeof window !== "undefined") {
        const win = window as IWindowWithSpeech;
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onresult = (event: any) => {
              let fullText = "";
              for (let i = 0; i < event.results.length; i++) {
                fullText += event.results[i][0].transcript + " ";
              }
              const clean = fullText.trim();
              transcriptBufferRef.current = clean;
              setLiveTranscript(clean);
            };

            recognition.onerror = () => {
              // Ignore background speech recognition errors
            };

            recognition.onend = () => {
              // Auto-restart if still recording
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                try {
                  recognition.start();
                } catch {}
              }
            };

            recognition.start();
            recognitionRef.current = recognition;
          } catch {}
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to start MediaRecorder recording.",
      );
    }
  }, [enableAudio, enableVideo, getSupportedMimeType, recordedUrl]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        setIsSpeaking(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        resolve(recordedBlob);
        return;
      }

      recorder.onstop = async () => {
        setIsRecording(false);
        setIsSpeaking(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const type = mimeType || "video/webm";
        const finalBlob = new Blob(chunksRef.current, { type });
        setRecordedBlob(finalBlob);

        const url = URL.createObjectURL(finalBlob);
        setRecordedUrl(url);

        const hash = await computeChecksum(finalBlob);
        setSha256Hash(hash);

        resolve(finalBlob);
      };

      recorder.stop();
    });
  }, [mimeType, recordedBlob]);

  const resetRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    chunksRef.current = [];
    isSpeakingRef.current = false;
    silenceStartTimeRef.current = 0;
    speechStartTimeRef.current = 0;
    setIsRecording(false);
    setIsSpeaking(false);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingDuration(0);
    setSha256Hash("");
    setLiveTranscript("");
    transcriptBufferRef.current = "";
  }, [recordedUrl]);

  return {
    isRecording,
    isCameraReady,
    isMicReady,
    isSpeaking,
    audioTrackState,
    videoTrackState,
    micLevelPercent,
    recordingDuration,
    recordedBlob,
    recordedUrl,
    sha256Hash,
    stream,
    mimeType,
    liveTranscript,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
