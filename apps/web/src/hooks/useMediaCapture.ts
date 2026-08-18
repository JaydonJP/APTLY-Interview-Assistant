"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseMediaCaptureOptions {
  captureEnabled?: boolean;
  enableVideo?: boolean;
  enableAudio?: boolean;
  enableVAD?: boolean;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface VisionFrameEvent {
  timestamp_seconds: number;
  face_count: number;
  face_x: number;
  face_y: number;
  face_width: number;
  face_height: number;
  eye_contact: boolean;
  confidence: number;
}

export interface VisionMetrics {
  provider: string;
  model_version: string;
  capability_status: "ready" | "partial" | "unavailable";
  frame_count: number;
  valid_frame_count: number;
  analysis_duration_seconds: number;
  face_detected_ratio: number | null;
  multiple_people_ratio: number | null;
  eye_contact_ratio: number | null;
  face_centering_score: number | null;
  tracking_confidence: number | null;
  face_presence_events: VisionFrameEvent[];
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
  visionMetrics: VisionMetrics;
  sha256Hash: string;
  stream: MediaStream | null;
  mimeType: string;
  liveTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{
    blob: Blob | null;
    transcript: string;
    visionMetrics: VisionMetrics;
  }>;
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

// Typed helpers for browser SpeechRecognition
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  length: number;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
  eyeContact?: boolean;
}

interface BrowserFaceDetector {
  detect(video: HTMLVideoElement): Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
}

interface IWindowWithVision extends Window {
  FaceDetector?: new (options?: {
    fastMode?: boolean;
    maxDetectedFaces?: number;
  }) => BrowserFaceDetector;
  aptlyVisionProvider?: {
    modelVersion?: string;
    detect: (video: HTMLVideoElement) => Promise<{ faces: FaceBox[] }>;
  };
  __aptlySetVisionProvider?: (provider: IWindowWithVision["aptlyVisionProvider"] | null) => void;
}

const EMPTY_VISION_METRICS: VisionMetrics = {
  provider: "browser",
  model_version: "unavailable",
  capability_status: "unavailable",
  frame_count: 0,
  valid_frame_count: 0,
  analysis_duration_seconds: 0,
  face_detected_ratio: null,
  multiple_people_ratio: null,
  eye_contact_ratio: null,
  face_centering_score: null,
  tracking_confidence: null,
  face_presence_events: [],
};

export function useMediaCapture({
  captureEnabled = true,
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
  const [visionMetrics, setVisionMetrics] = useState<VisionMetrics>(EMPTY_VISION_METRICS);
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
  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd, onSpeechStart]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptBufferRef = useRef<string>("");

  // Optional browser vision capability. FaceDetector supplies multi-face and
  // framing signals; an installed landmark adapter can additionally provide
  // observable head-orientation signals through aptlyVisionProvider.
  const visionVideoRef = useRef<HTMLVideoElement | null>(null);
  const visionDetectorRef = useRef<BrowserFaceDetector | null>(null);
  const visionProviderRef = useRef<IWindowWithVision["aptlyVisionProvider"]>(null);
  const visionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visionStartedAtRef = useRef<number>(0);
  const visionSamplesRef = useRef<VisionFrameEvent[]>([]);
  const visionBusyRef = useRef(false);
  const visionProviderLoadRef = useRef<Promise<IWindowWithVision["aptlyVisionProvider"] | null> | null>(null);

  const loadOptionalLandmarkProvider = useCallback(async (): Promise<IWindowWithVision["aptlyVisionProvider"] | null> => {
    if (typeof window === "undefined") return null;
    const visionWindow = window as IWindowWithVision;
    if (visionWindow.aptlyVisionProvider) return visionWindow.aptlyVisionProvider;
    if (visionProviderLoadRef.current) return visionProviderLoadRef.current;

    visionProviderLoadRef.current = new Promise((resolve) => {
      let settled = false;
      const finish = (provider: IWindowWithVision["aptlyVisionProvider"] | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        script.remove();
        resolve(provider);
      };
      const script = document.createElement("script");
      const timeoutId = window.setTimeout(() => finish(null), 9000);
      visionWindow.__aptlySetVisionProvider = (provider) => {
        visionWindow.aptlyVisionProvider = provider || undefined;
        finish(provider);
      };
      script.type = "module";
      script.textContent = `
        import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs";
        try {
          const fileset = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
          const landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numFaces: 4,
            outputFaceBlendshapes: false
          });
          const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
          const point = (landmarks, index) => landmarks[index] || { x: 0, y: 0, z: 0 };
          const makeFace = (landmarks) => {
            const xs = landmarks.map((item) => item.x);
            const ys = landmarks.map((item) => item.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
            const leftEye = [point(landmarks, 33), point(landmarks, 133)];
            const rightEye = [point(landmarks, 362), point(landmarks, 263)];
            const leftIris = point(landmarks, 468), rightIris = point(landmarks, 473);
            const leftEyeCenter = { x: average(leftEye.map((item) => item.x)), y: average(leftEye.map((item) => item.y)) };
            const rightEyeCenter = { x: average(rightEye.map((item) => item.x)), y: average(rightEye.map((item) => item.y)) };
            const eyeOffset = Math.abs(leftIris.x - leftEyeCenter.x) / Math.max(0.01, Math.abs(leftEye[1].x - leftEye[0].x)) + Math.abs(rightIris.x - rightEyeCenter.x) / Math.max(0.01, Math.abs(rightEye[1].x - rightEye[0].x));
            const nose = point(landmarks, 1);
            const faceCenter = (minX + maxX) / 2;
            const facingCamera = eyeOffset < 0.9 && Math.abs(nose.x - faceCenter) < (maxX - minX) * 0.22;
            return {
              x: minX, y: minY, width: maxX - minX, height: maxY - minY,
              confidence: 0.9, eyeContact: facingCamera
            };
          };
          window.__aptlySetVisionProvider({
            modelVersion: "MediaPipe Face Landmarker 0.10.22",
            detect: async (video) => {
              const result = landmarker.detectForVideo(video, performance.now());
              return { faces: (result.faceLandmarks || []).map((landmarks) => makeFace(landmarks)) };
            }
          });
        } catch (error) {
          window.__aptlySetVisionProvider(null);
        }
      `;
      script.onerror = () => finish(null);
      document.head.appendChild(script);
    });
    return visionProviderLoadRef.current;
  }, []);

  const aggregateVisionMetrics = useCallback((): VisionMetrics => {
    const samples = visionSamplesRef.current;
    const validSamples = samples.filter((sample) => sample.face_count > 0);
    const faceSamples = samples.filter((sample) => sample.face_count > 0);
    const multiSamples = samples.filter((sample) => sample.face_count > 1);
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const ratio = (count: number) => (samples.length > 0 ? count / samples.length : null);
    const average = (values: number[]) => (values.length > 0 ? sum(values) / values.length : null);

    return {
      provider: visionProviderRef.current ? "browser-face-landmarker" : visionDetectorRef.current ? "browser-face-box" : "browser",
      model_version:
        visionProviderRef.current?.modelVersion ||
        (visionDetectorRef.current ? "FaceDetector API" : "unavailable"),
      capability_status: visionProviderRef.current
        ? "ready"
        : visionDetectorRef.current
        ? "partial"
        : "unavailable",
      frame_count: samples.length,
      valid_frame_count: validSamples.length,
      analysis_duration_seconds: visionStartedAtRef.current
        ? Math.max(0, (Date.now() - visionStartedAtRef.current) / 1000)
        : 0,
      face_detected_ratio: ratio(faceSamples.length),
      multiple_people_ratio: ratio(multiSamples.length),
      eye_contact_ratio: samples.length > 0 ? sum(samples.map((sample) => (sample.eye_contact ? 1 : 0))) / samples.length : null,
      face_centering_score: average(validSamples.map((sample) => sample.face_x + sample.face_width / 2).map((center) => Math.max(0, 1 - Math.abs(0.5 - center) * 2))),
      tracking_confidence: average(validSamples.map((sample) => sample.confidence)),
      face_presence_events: samples.slice(-2000),
    };
  }, []);

  const sampleVisionFrame = useCallback(async () => {
    const video = visionVideoRef.current;
    if (!video || visionBusyRef.current || video.readyState < 2) return;
    visionBusyRef.current = true;
    try {
      let faces: FaceBox[] = [];
      if (visionProviderRef.current) {
        const result = await visionProviderRef.current.detect(video);
        faces = Array.isArray(result?.faces) ? result.faces : [];
      } else if (visionDetectorRef.current) {
        const detections = await visionDetectorRef.current.detect(video);
        const width = video.videoWidth || 1;
        const height = video.videoHeight || 1;
        faces = detections.map((detection) => ({
          x: detection.boundingBox.x / width,
          y: detection.boundingBox.y / height,
          width: detection.boundingBox.width / width,
          height: detection.boundingBox.height / height,
          confidence: 0.72,
        }));
      }

      const primaryFace = faces
        .slice()
        .sort((left, right) => right.width * right.height - left.width * left.height)[0];
      const faceCenter = primaryFace ? primaryFace.x + primaryFace.width / 2 : 0;
      const centered = primaryFace ? Math.abs(faceCenter - 0.5) <= 0.18 : false;
      visionSamplesRef.current.push({
        timestamp_seconds: visionStartedAtRef.current ? (Date.now() - visionStartedAtRef.current) / 1000 : 0,
        face_count: Math.min(10, faces.length),
        face_x: primaryFace?.x ?? 0,
        face_y: primaryFace?.y ?? 0,
        face_width: primaryFace?.width ?? 0,
        face_height: primaryFace?.height ?? 0,
        // FaceDetector has no iris landmarks, so this is explicitly a
        // camera-facing opportunity proxy. A landmark adapter can replace it.
        eye_contact: primaryFace?.eyeContact ?? centered,
        confidence: Math.max(0, Math.min(1, primaryFace?.confidence ?? 0)),
      });
    } catch {
      // A camera frame can be unavailable during tab switches or device sleep.
    } finally {
      visionBusyRef.current = false;
    }
  }, []);

  const startVisionSampling = useCallback(async (activeStream: MediaStream) => {
    if (!enableVideo || activeStream.getVideoTracks().length === 0 || typeof document === "undefined") {
      setVisionMetrics({ ...EMPTY_VISION_METRICS });
      return;
    }
    const visionWindow = window as IWindowWithVision;
    visionSamplesRef.current = [];
    visionStartedAtRef.current = Date.now();
    visionProviderRef.current = await loadOptionalLandmarkProvider();
    visionDetectorRef.current = null;
    if (!visionProviderRef.current && visionWindow.FaceDetector) {
      try {
        visionDetectorRef.current = new visionWindow.FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
      } catch {
        visionDetectorRef.current = null;
      }
    }

    if (!visionProviderRef.current && !visionDetectorRef.current) {
      setVisionMetrics({ ...EMPTY_VISION_METRICS });
      return;
    }

    if (!visionVideoRef.current) {
      visionVideoRef.current = document.createElement("video");
      visionVideoRef.current.muted = true;
      visionVideoRef.current.playsInline = true;
    }
    visionVideoRef.current.srcObject = activeStream;
    try {
      await visionVideoRef.current.play();
    } catch {
      // The MediaRecorder stream is still valid even if the hidden analyzer
      // video cannot autoplay.
    }
    if (visionTimerRef.current) clearInterval(visionTimerRef.current);
    visionTimerRef.current = setInterval(() => void sampleVisionFrame(), 500);
    void sampleVisionFrame();
  }, [enableVideo, loadOptionalLandmarkProvider, sampleVisionFrame]);

  const stopVisionSampling = useCallback((): VisionMetrics => {
    if (visionTimerRef.current) {
      clearInterval(visionTimerRef.current);
      visionTimerRef.current = null;
    }
    const aggregated = aggregateVisionMetrics();
    setVisionMetrics(aggregated);
    return aggregated;
  }, [aggregateVisionMetrics]);

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

    if (!captureEnabled) {
      setIsCameraReady(false);
      setIsMicReady(false);
      setStream(null);
      setVideoTrackState("NONE");
      setAudioTrackState("NONE");
      return () => {
        mounted = false;
      };
    }

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
      if (visionTimerRef.current) {
        clearInterval(visionTimerRef.current);
        visionTimerRef.current = null;
      }
      if (visionVideoRef.current) {
        visionVideoRef.current.srcObject = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [captureEnabled, enableVideo, enableAudio]);

  const startRecording = useCallback(async () => {
    if (!captureEnabled) {
      setError("Recording is disabled until media consent is granted.");
      return;
    }
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
      void startVisionSampling(activeStream);
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

            recognition.onresult = (event: SpeechRecognitionEventLike) => {
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
  }, [captureEnabled, enableAudio, enableVideo, getSupportedMimeType, recordedUrl, startVisionSampling]);

  const stopRecording = useCallback((): Promise<{
    blob: Blob | null;
    transcript: string;
    visionMetrics: VisionMetrics;
  }> => {
    return new Promise((resolve) => {
      // Get finalized transcript from buffer
      const finalTranscript = (transcriptBufferRef.current || liveTranscript || "").trim();

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
        resolve({ blob: recordedBlob, transcript: finalTranscript, visionMetrics: stopVisionSampling() });
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

        resolve({ blob: finalBlob, transcript: finalTranscript, visionMetrics: stopVisionSampling() });
      };

      recorder.stop();
    });
  }, [liveTranscript, mimeType, recordedBlob, stopVisionSampling]);

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
    stopVisionSampling();
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
  }, [recordedUrl, stopVisionSampling]);

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
    visionMetrics,
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
