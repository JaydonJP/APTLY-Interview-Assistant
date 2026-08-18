"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ObservableBehaviorEvent, BehaviorSnapshot } from "@/types/behavior";

export interface UseFaceBehaviorTrackingOptions {
  stream: MediaStream | null;
  enabled?: boolean;
  questionId?: string | null;
  answerId?: string | null;
  onCalibrationComplete?: () => void;
}

export interface FaceBehaviorState {
  calibrationState: "CALIBRATING" | "READY" | "INTERVIEWING";
  calibrationProgress: number; // 0 to 100%
  faceDetected: boolean;
  cameraAttentionEstimate: number; // 0 to 100%
  headPose: { yaw: number; pitch: number; roll: number };
  movementIntensity: number; // 0 to 1.0
  isMovementSpiking: boolean;
  isLookingAway: boolean;
  framingState: "CENTERED" | "TOO_LEFT" | "TOO_RIGHT" | "TOO_HIGH" | "TOO_LOW" | "TOO_CLOSE" | "TOO_FAR" | "NO_FACE";
  events: ObservableBehaviorEvent[];
  snapshots: BehaviorSnapshot[];
  getRecordedEventsAndReset: () => ObservableBehaviorEvent[];
}

export function useFaceBehaviorTracking({
  stream,
  enabled = true,
  questionId,
  answerId,
  onCalibrationComplete,
}: UseFaceBehaviorTrackingOptions): FaceBehaviorState {
  const [calibrationState, setCalibrationState] = useState<"CALIBRATING" | "READY" | "INTERVIEWING">("CALIBRATING");
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [faceDetected, setFaceDetected] = useState<boolean>(true);
  const [cameraAttentionEstimate, setCameraAttentionEstimate] = useState<number>(92);
  const [headPose, setHeadPose] = useState<{ yaw: number; pitch: number; roll: number }>({ yaw: 0, pitch: 0, roll: 0 });
  const [movementIntensity, setMovementIntensity] = useState<number>(0.08);
  const [isMovementSpiking, setIsMovementSpiking] = useState<boolean>(false);
  const [isLookingAway, setIsLookingAway] = useState<boolean>(false);
  const [framingState, setFramingState] = useState<
    "CENTERED" | "TOO_LEFT" | "TOO_RIGHT" | "TOO_HIGH" | "TOO_LOW" | "TOO_CLOSE" | "TOO_FAR" | "NO_FACE"
  >("CENTERED");

  const eventsRef = useRef<ObservableBehaviorEvent[]>([]);
  const snapshotsRef = useRef<BehaviorSnapshot[]>([]);

  // Internal calibration baselines
  const baselineYawRef = useRef<number>(0);
  const baselinePitchRef = useRef<number>(0);
  const baselineMovementRef = useRef<number>(0.08);
  const baselineSamplesRef = useRef<number>(0);

  // Look-away debouncing & hysteresis
  const lookAwayStartTimeRef = useRef<number | null>(null);
  const isLookingAwayStateRef = useRef<boolean>(false);

  // Movement spike debouncing
  const movementSpikeStartTimeRef = useRef<number | null>(null);
  const isMovementSpikeStateRef = useRef<boolean>(false);

  // Framing debouncing
  const poorFramingStartTimeRef = useRef<number | null>(null);

  // Video & Canvas processing refs
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSampleTimeRef = useRef<number>(0);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const prevCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Cumulative gaze duration
  const totalSamplesRef = useRef<number>(0);
  const onCameraSamplesRef = useRef<number>(0);

  // 1. Initialize hidden video element for sampling
  useEffect(() => {
    if (!enabled || !stream) return;

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    videoElementRef.current = video;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    canvasRef.current = canvas;

    void video.play().catch(() => {});

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      video.srcObject = null;
    };
  }, [enabled, stream]);

  // 2. High-performance ~12 FPS lightweight observable computer vision loop
  useEffect(() => {
    if (!enabled || !stream) return;

    let isSubscribed = true;
    const calibrationStartTime = Date.now();

    const processFrame = () => {
      if (!isSubscribed) return;

      const now = Date.now();
      // Target ~12 samples/second (every ~80ms) to avoid CPU load
      if (now - lastSampleTimeRef.current >= 80) {
        lastSampleTimeRef.current = now;

        const video = videoElementRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState >= 2) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = frame.data;

            // Optical Center-of-Mass & Spatial Luminance Geometry Proxy
            let totalWeight = 0;
            let sumX = 0;
            let sumY = 0;
            let totalDiff = 0;
            let skinPixelCount = 0;

            const prevData = prevFrameDataRef.current;

            for (let i = 0; i < data.length; i += 16) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Natural Face/Skin tone chrominance proxy
              const isSkin = r > 45 && g > 30 && b > 20 && r > g && r > b && Math.abs(r - g) >= 8;
              const weight = isSkin ? 2.5 : 0.5;

              const pxIndex = i / 4;
              const pxX = pxIndex % canvas.width;
              const pxY = Math.floor(pxIndex / canvas.width);

              if (isSkin) {
                skinPixelCount++;
                sumX += pxX * weight;
                sumY += pxY * weight;
                totalWeight += weight;
              }

              if (prevData) {
                const diff = Math.abs(r - prevData[i]) + Math.abs(g - prevData[i + 1]);
                totalDiff += diff;
              }
            }

            prevFrameDataRef.current = new Uint8ClampedArray(data);

            const hasFace = skinPixelCount > 60;
            setFaceDetected(hasFace);

            if (hasFace && totalWeight > 0) {
              const centerX = sumX / totalWeight / canvas.width; // 0.0 to 1.0
              const centerY = sumY / totalWeight / canvas.height; // 0.0 to 1.0

              // Calculate movement delta
              let moveDelta = 0;
              if (prevCenterRef.current) {
                const dx = Math.abs(centerX - prevCenterRef.current.x);
                const dy = Math.abs(centerY - prevCenterRef.current.y);
                moveDelta = Math.sqrt(dx * dx + dy * dy) * 4.0;
              }
              prevCenterRef.current = { x: centerX, y: centerY };

              const smoothedMovement = Math.min(1.0, Math.max(0.02, moveDelta + (totalDiff / (data.length / 4)) * 0.005));
              setMovementIntensity(Math.round(smoothedMovement * 100) / 100);

              // ── A. CALIBRATION PHASE (3 SECONDS) ───────────────────
              if (calibrationState === "CALIBRATING") {
                const elapsed = now - calibrationStartTime;
                const progress = Math.min(100, Math.round((elapsed / 3000) * 100));
                setCalibrationProgress(progress);

                baselineYawRef.current += (centerX - 0.5) * 0.1;
                baselinePitchRef.current += (centerY - 0.45) * 0.1;
                baselineMovementRef.current = Math.max(0.04, (baselineMovementRef.current + smoothedMovement) / 2);
                baselineSamplesRef.current++;

                if (elapsed >= 3000) {
                  setCalibrationState("READY");
                  if (onCalibrationComplete) onCalibrationComplete();
                }
              }

              // ── B. INTERVIEWING TRACKING ────────────────────────────
              // Head Pose relative to personal baseline
              const normYaw = (centerX - 0.5 - baselineYawRef.current) * 1.8;
              const normPitch = (centerY - 0.45 - baselinePitchRef.current) * 1.6;
              const normRoll = 0.02;

              setHeadPose({
                yaw: Math.round(normYaw * 100) / 100,
                pitch: Math.round(normPitch * 100) / 100,
                roll: normRoll,
              });

              // Camera-directed gaze estimate
              const gazeDeviation = Math.sqrt(normYaw * normYaw + normPitch * normPitch);
              const isLookingAwayFrame = gazeDeviation > 0.28;

              totalSamplesRef.current++;
              if (!isLookingAwayFrame) {
                onCameraSamplesRef.current++;
              }

              const runningAttention = Math.round((onCameraSamplesRef.current / totalSamplesRef.current) * 100);
              setCameraAttentionEstimate(Math.max(40, Math.min(99, runningAttention)));

              // Debounced Look-Away Event (Requires sustained deviation > 1.2s)
              if (isLookingAwayFrame) {
                if (!lookAwayStartTimeRef.current) {
                  lookAwayStartTimeRef.current = now;
                } else if (now - lookAwayStartTimeRef.current >= 1200 && !isLookingAwayStateRef.current) {
                  isLookingAwayStateRef.current = true;
                  setIsLookingAway(true);
                  // Emit LOOK_AWAY_START
                }
              } else {
                if (isLookingAwayStateRef.current && lookAwayStartTimeRef.current) {
                  const duration = now - lookAwayStartTimeRef.current;
                  eventsRef.current.push({
                    event_type: "LOOK_AWAY",
                    start_ms: lookAwayStartTimeRef.current - calibrationStartTime,
                    end_ms: now - calibrationStartTime,
                    duration_ms: duration,
                    confidence: 0.95,
                    value: Math.round(gazeDeviation * 100) / 100,
                    metadata_json: { yaw: normYaw, pitch: normPitch },
                    question_id: questionId || null,
                    answer_id: answerId || null,
                  });
                  isLookingAwayStateRef.current = false;
                  setIsLookingAway(false);
                }
                lookAwayStartTimeRef.current = null;
              }

              // Movement Spike relative to candidate's personal baseline
              const isSpike = smoothedMovement > baselineMovementRef.current * 2.2 && smoothedMovement > 0.25;
              if (isSpike) {
                if (!movementSpikeStartTimeRef.current) {
                  movementSpikeStartTimeRef.current = now;
                } else if (now - movementSpikeStartTimeRef.current >= 1400 && !isMovementSpikeStateRef.current) {
                  isMovementSpikeStateRef.current = true;
                  setIsMovementSpiking(true);
                }
              } else {
                if (isMovementSpikeStateRef.current && movementSpikeStartTimeRef.current) {
                  const duration = now - movementSpikeStartTimeRef.current;
                  eventsRef.current.push({
                    event_type: "MOVEMENT_SPIKE",
                    start_ms: movementSpikeStartTimeRef.current - calibrationStartTime,
                    end_ms: now - calibrationStartTime,
                    duration_ms: duration,
                    confidence: 0.92,
                    value: Math.round(smoothedMovement * 100) / 100,
                    metadata_json: { variance: Math.round((smoothedMovement / baselineMovementRef.current) * 10) / 10 },
                    question_id: questionId || null,
                    answer_id: answerId || null,
                  });
                  isMovementSpikeStateRef.current = false;
                  setIsMovementSpiking(false);
                }
                movementSpikeStartTimeRef.current = null;
              }

              // Framing Evaluation
              let currentFraming: "CENTERED" | "TOO_LEFT" | "TOO_RIGHT" | "TOO_HIGH" | "TOO_LOW" | "TOO_CLOSE" | "TOO_FAR" = "CENTERED";
              if (centerX < 0.28) currentFraming = "TOO_LEFT";
              else if (centerX > 0.72) currentFraming = "TOO_RIGHT";
              else if (centerY < 0.22) currentFraming = "TOO_HIGH";
              else if (centerY > 0.78) currentFraming = "TOO_LOW";
              else if (skinPixelCount > 400) currentFraming = "TOO_CLOSE";
              else if (skinPixelCount < 90) currentFraming = "TOO_FAR";

              setFramingState(currentFraming);

              // Periodic Snapshot Record (Every 1.5s)
              if (snapshotsRef.current.length === 0 || now - snapshotsRef.current[snapshotsRef.current.length - 1].timestamp_ms >= 1500) {
                snapshotsRef.current.push({
                  timestamp_ms: now - calibrationStartTime,
                  camera_attention: runningAttention,
                  head_movement: smoothedMovement,
                  face_present: true,
                  framing_state: currentFraming === "TOO_CLOSE" || currentFraming === "TOO_FAR" ? "CENTERED" : currentFraming,
                });
              }
            } else {
              setFramingState("NO_FACE");
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled, stream, calibrationState, onCalibrationComplete, questionId, answerId]);

  const getRecordedEventsAndReset = useCallback(() => {
    const recorded = [...eventsRef.current];
    eventsRef.current = [];
    return recorded;
  }, []);

  return {
    calibrationState,
    calibrationProgress,
    faceDetected,
    cameraAttentionEstimate,
    headPose,
    movementIntensity,
    isMovementSpiking,
    isLookingAway,
    framingState,
    events: eventsRef.current,
    snapshots: snapshotsRef.current,
    getRecordedEventsAndReset,
  };
}
