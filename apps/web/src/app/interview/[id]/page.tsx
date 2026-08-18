"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { VideoPreview } from "@/components/camera/VideoPreview";
import { AudioVisualizer } from "@/components/audio/AudioVisualizer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RecordingConsentModal } from "@/components/interview/RecordingConsentModal";
import { PanelInterviewerDeck } from "@/components/panel/PanelInterviewerDeck";
import { useMediaCapture } from "@/hooks/useMediaCapture";
import { useInterviewWebSocket } from "@/hooks/useInterviewWebSocket";
import { apiClient, getApiBaseUrl } from "@/lib/api-client";
import type { Answer, InterviewDetail, Question } from "@/types/interview";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Cpu,
  Mic,
  MicOff,
  Play,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

type ConversationalState =
  | "IDLE"
  | "INTERVIEWER_SPEAKING"
  | "LISTENING"
  | "PROCESSING"
  | "THINKING"
  | "FOLLOWING_UP"
  | "CHALLENGING"
  | "RECOVERING"
  | "ADVANCING"
  | "ENDING";

import { useGeminiLiveSession } from "@/hooks/useGeminiLiveSession";

export default function LiveInterviewRoomPage() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const repairQuestion = Number(searchParams.get("repair") ?? "0");

  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<Answer | null>(null);
  const [convState, setConvState] = useState<ConversationalState>("IDLE");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [hasUserStarted, setHasUserStarted] = useState(false);
  const [doubt, setDoubt] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const spokenQuestionIdsRef = useRef<Set<string>>(new Set());
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Consent Modal State
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  // Cancel interviewer speech (Barge-in Interruption)
  const cancelInterviewerSpeech = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Web Speech Fallback helper
  const speakWithWebSpeech = useCallback(
    (text: string, persona?: string | null, onComplete?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        if (onComplete) onComplete();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const isHr = String(persona || "").toUpperCase().includes("HR");
        utterance.pitch = isHr ? 1.12 : 0.94;
        utterance.rate = 1.05;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferred = isHr
            ? voices.find(
                (v) =>
                  v.name.includes("Female") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Zira") ||
                  v.name.includes("Google UK English Female"),
              )
            : voices.find(
                (v) =>
                  v.name.includes("Male") ||
                  v.name.includes("David") ||
                  v.name.includes("Google US English"),
              );
          if (preferred) utterance.voice = preferred;
        }

        utterance.onend = () => {
          if (onComplete) onComplete();
        };
        utterance.onerror = () => {
          if (onComplete) onComplete();
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        if (onComplete) onComplete();
      }
    },
    [],
  );

  // Primary Question Audio Playback (ElevenLabs with WebSpeech fallback)
  const speakQuestionAudio = useCallback(
    async (text: string, persona?: string | null, onComplete?: () => void) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          if (onComplete) onComplete();
        }
      };

      try {
        const isHr = String(persona || "").toUpperCase().includes("HR");
        const resp = await fetch(`${getApiBaseUrl()}/api/v1/tts/synthesize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            persona: isHr ? "friendly_hr" : "skeptical_tech_lead",
          }),
        });

        if (resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 200) {
            const url = URL.createObjectURL(blob);
            if (!audioPlayerRef.current) {
              audioPlayerRef.current = new Audio();
            }
            const audio = audioPlayerRef.current;
            audio.src = url;
            audio.onended = () => {
              URL.revokeObjectURL(url);
              finish();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              speakWithWebSpeech(text, persona, finish);
            };
            await audio.play();
            return;
          }
        }
      } catch {
        // Fallback to browser WebSpeech on network/ElevenLabs error
      }

      speakWithWebSpeech(text, persona, finish);
    },
    [speakWithWebSpeech],
  );

  // Gemini Live Session Hook
  const {
    status: liveStatus,
    isFallback,
    fallbackReason,
    partialInputTranscript,
    partialOutputTranscript,
    liveWpm,
    isMuted,
    toggleMute,
    interruptInterviewer,
  } = useGeminiLiveSession({
    interviewId,
    enabled: Boolean(interviewId && hasConsent === true && hasUserStarted),
  });

  // WebSocket hook for live session events & heartbeat
  const { status: wsStatus, sendEvent } = useInterviewWebSocket({
    interviewId,
    enabled: Boolean(interviewId),
  });

  // Current Question helper
  const currentQuestion: Question | undefined = useMemo(() => {
    if (!interview || !interview.questions.length) return undefined;
    return interview.questions[interview.current_question_index];
  }, [interview]);

  const totalQuestions = interview?.questions.length || 0;
  const currentQIndex = (interview?.current_question_index || 0) + 1;
  const isLastQuestion = currentQIndex >= totalQuestions;

  // Auto-Submit ref to avoid duplicate submissions
  const isAutoSubmittingRef = useRef<boolean>(false);
  const autoFinishAnswerRef = useRef<(() => Promise<void>) | null>(null);

  // Unified Media Capture Hook with VAD Callbacks
  const {
    isRecording,
    isCameraReady,
    isMicReady,
    isSpeaking,
    micLevelPercent,
    recordingDuration,
    recordedUrl,
    liveTranscript,
    stream,
    error: mediaError,
    startRecording,
    stopRecording,
    visionMetrics,
    resetRecording,
  } = useMediaCapture({
    captureEnabled: hasConsent === true,
    enableVideo: true,
    enableAudio: true,
    enableVAD: true,
    onSpeechStart: () => {
      cancelInterviewerSpeech();
      sendEvent("candidate.speaking", { question_id: currentQuestion?.id });
      setConvState("LISTENING");
    },
    onSpeechEnd: () => {
      sendEvent("candidate.stopped", { question_id: currentQuestion?.id });
      if (!isAutoSubmittingRef.current && !isSubmitting && isRecording) {
        void autoFinishAnswerRef.current?.();
      }
    },
  });

  // Fetch or initialize interview session
  const fetchInterview = useCallback(async () => {
    try {
      let data = await apiClient.get<InterviewDetail>(
        `/api/v1/interviews/${interviewId}`,
      );

      // If created/ready, start the session automatically
      if (data.status === "created" || data.status === "ready") {
        data = await apiClient.post<InterviewDetail>(
          `/api/v1/interviews/${interviewId}/start`,
        );
      }

      if (repairQuestion > 0 && repairQuestion <= data.questions.length) {
        data = { ...data, current_question_index: repairQuestion - 1 };
      }
      setInterview(data);

      // Check if current question already has an answer
      const activeQ = data.questions[data.current_question_index];
      if (activeQ) {
        const existingAns = data.answers.find((a) => a.question_id === activeQ.id);
        setCurrentAnswer(existingAns || null);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load interview session.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [interviewId, repairQuestion]);

  useEffect(() => {
    if (interviewId) {
      void fetchInterview();
    }
  }, [interviewId, fetchInterview]);

  // Check consent preference on initial mount
  useEffect(() => {
    const saved = localStorage.getItem("aptly_recording_consent");
    if (saved === null) {
      setIsConsentModalOpen(true);
    } else {
      const granted = saved === "true";
      setHasConsent(granted);
      // Consent is not the same as a user gesture. Keep the explicit start
      // step so device readiness and interviewer narration are sequenced.
      setHasUserStarted(false);
    }
  }, []);

  const handleConsentDecision = (granted: boolean) => {
    setHasConsent(granted);
    localStorage.setItem("aptly_recording_consent", String(granted));
    setIsConsentModalOpen(false);
    if (granted) {
      setHasUserStarted(false);
    }
  };

  // Conversational Audio Loop: Speak question, then enter LISTENING mode
  useEffect(() => {
    // The first interviewer turn is gated on a live microphone and camera so
    // the user gets a truthful readiness check before narration begins.
    if (!hasConsent || !currentQuestion || isLoading || isSubmitting || !hasUserStarted || !isMicReady || !isCameraReady) return;
    const qId = currentQuestion.id;

    if (spokenQuestionIdsRef.current.has(qId) || currentAnswer) {
      return;
    }

    spokenQuestionIdsRef.current.add(qId);
    let isCancelled = false;

    const beginListening = () => {
      if (isCancelled) return;
      setConvState("LISTENING");
      void startRecording();
    };

    if (voiceEnabled) {
      setConvState("INTERVIEWER_SPEAKING");

      // Auto-fallback timeout in case browser pauses speech or tab is throttled
      const maxSpeechWait = Math.min(10000, Math.max(3500, currentQuestion.question_text.length * 60));
      const fallbackTimer = setTimeout(() => {
        if (!isCancelled && convState === "INTERVIEWER_SPEAKING") {
          beginListening();
        }
      }, maxSpeechWait);

      speakQuestionAudio(
        currentQuestion.question_text,
        currentQuestion.interviewer_persona,
        () => {
          clearTimeout(fallbackTimer);
          beginListening();
        },
      );

      return () => {
        isCancelled = true;
        clearTimeout(fallbackTimer);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      };
    } else {
      beginListening();
    }
  }, [currentQuestion, hasConsent, isLoading, isSubmitting, currentAnswer, voiceEnabled, hasUserStarted, isMicReady, isCameraReady, startRecording, speakQuestionAudio, convState]);

  // Start Session manually (unlocks browser audio gesture)
  const handleStartSession = () => {
    if (!isMicReady || !isCameraReady) {
      setErrorMessage("Checking your microphone and camera. Start becomes available when both are ready.");
      return;
    }
    setHasUserStarted(true);
    if (currentQuestion) {
      setConvState("INTERVIEWER_SPEAKING");
      speakQuestionAudio(
        currentQuestion.question_text,
        currentQuestion.interviewer_persona,
        () => {
          setConvState("LISTENING");
          void startRecording();
        },
      );
    } else {
      setConvState("LISTENING");
      void startRecording();
    }
  };

  // Replay Question Audio
  const handleReplayAudio = () => {
    if (!currentQuestion) return;
    setConvState("INTERVIEWER_SPEAKING");
    speakQuestionAudio(
      currentQuestion.question_text,
      currentQuestion.interviewer_persona,
      () => {
        setConvState("LISTENING");
        if (!isRecording) {
          void startRecording();
        }
      },
    );
  };

  const handleExplainQuestion = async () => {
    if (!currentQuestion || !doubt.trim() || isExplaining) return;
    setIsExplaining(true);
    setExplanation(null);
    try {
      const result = await apiClient.post<{ answer: string }>(
        `/api/v1/interviews/${interviewId}/questions/${currentQuestion.id}/explain`,
        { doubt: doubt.trim() },
      );
      setExplanation(result.answer);
      if (voiceEnabled) {
        speakQuestionAudio(result.answer, currentQuestion.interviewer_persona);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "The interviewer could not explain that yet.");
    } finally {
      setIsExplaining(false);
    }
  };

  // Jump straight to answering
  const handleStartAnsweringNow = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setHasUserStarted(true);
    setConvState("LISTENING");
    void startRecording();
  };

  // Auto-finish and submit turn
  const handleAutoFinishAnswer = async () => {
    if (isAutoSubmittingRef.current || isSubmitting || !currentQuestion) return;
    isAutoSubmittingRef.current = true;
    setIsSubmitting(true);
    setConvState("PROCESSING");

    try {
      const { blob, transcript } = await stopRecording();
      if (!blob || blob.size === 0) {
        setIsSubmitting(false);
        isAutoSubmittingRef.current = false;
        setConvState("LISTENING");
        return;
      }

      // Step 1: Create Answer record
      let answerId = currentAnswer?.id;
      if (!answerId) {
        const createdAns = await apiClient.post<Answer>(
          `/api/v1/interviews/${interviewId}/answers`,
          { question_id: currentQuestion.id },
        );
        answerId = createdAns.id;
        setCurrentAnswer(createdAns);
      }

      // Step 2: Upload recording with exact candidate transcript
      const finalTranscript = (transcript || liveTranscript || "").trim();
      const formData = new FormData();
      formData.append(
        "audio_file",
        blob,
        `recording_${currentQuestion.id}.webm`,
      );
      formData.append("duration_seconds", String(recordingDuration || 5.0));
      if (finalTranscript.length > 0) {
        formData.append("transcript_text", finalTranscript);
      }
      formData.append("vision_metrics_json", JSON.stringify(visionMetrics));

      setConvState("THINKING");
      sendEvent("interview.thinking", { question_id: currentQuestion.id });

      const processedAns = await apiClient.upload<Answer>(
        `/api/v1/interviews/${interviewId}/answers/${answerId}/upload`,
        formData,
      );
      setCurrentAnswer(processedAns);

      // Step 3: Advance to next question / follow-up
      const updated = await apiClient.post<InterviewDetail>(
        `/api/v1/interviews/${interviewId}/next-question`,
      );
      setInterview(updated);
      setCurrentAnswer(null);
      resetRecording();

      // Check if session completed
      if (updated.status === "completed") {
        setConvState("ENDING");
        router.push(`/interview/${interviewId}/review`);
      } else {
        const nextQ = updated.questions[updated.current_question_index];
        if (nextQ && nextQ.question_source === "follow_up") {
          setConvState("FOLLOWING_UP");
        } else {
          setConvState("ADVANCING");
        }
      }
    } catch (err: unknown) {
      console.error("Answer submission failed:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Error processing answer.",
      );
      setConvState("LISTENING");
    } finally {
      setIsSubmitting(false);
      isAutoSubmittingRef.current = false;
    }
  };

  useEffect(() => {
    autoFinishAnswerRef.current = handleAutoFinishAnswer;
    return () => {
      autoFinishAnswerRef.current = null;
    };
  }, [handleAutoFinishAnswer]);

  // Enforce Maximum Answer Duration (180s)
  useEffect(() => {
    if (isRecording && recordingDuration >= 180) {
      void autoFinishAnswerRef.current?.();
    }
  }, [isRecording, recordingDuration]);

  // Complete Interview Early
  const handleFinishInterview = async () => {
    setIsSubmitting(true);
    setConvState("ENDING");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    try {
      await apiClient.post<InterviewDetail>(
        `/api/v1/interviews/${interviewId}/finish`,
      );
      router.push(`/interview/${interviewId}/review`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to finish interview.",
      );
      setIsSubmitting(false);
      setConvState("LISTENING");
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-mono text-slate-400">
            Connecting Realtime Conversational Engine...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* ── CONSENT MODAL ──────────────────────────────────────────── */}
      <RecordingConsentModal
        isOpen={isConsentModalOpen}
        onConsent={handleConsentDecision}
      />

      {/* ── LIVE HEADER BAR ────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl glass-panel px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 items-center justify-center">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">
              {interview?.title || "Live Practice Session"}
            </h1>
            <p className="text-xs text-slate-400">
              {interview?.difficulty_level?.toUpperCase()} • {interview?.interview_type?.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Dynamic State Indicator & Voice Toggle */}
        <div className="flex items-center gap-3">
          {/* Voice Mute Toggle */}
          <button
            type="button"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>AI Voice On</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                <span>Muted</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            disabled={!hasUserStarted}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Mute the Gemini Live microphone stream"
          >
            {isMuted ? <MicOff className="h-3.5 w-3.5 text-rose-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
            <span>{isMuted ? "Live Mic Muted" : "Live Mic On"}</span>
          </button>

          {/* Progress Tracker */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300">
            <span>
              Turn {currentQIndex} of {totalQuestions}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-mono ${
              liveStatus === "Interviewer speaking" || liveStatus === "Listening" || liveStatus === "Candidate speaking"
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                : liveStatus === "Connecting" || liveStatus === "Processing turn"
                ? "border-violet-500/30 bg-violet-950/30 text-violet-300"
                : "border-amber-500/30 bg-amber-950/30 text-amber-300"
            }`}
          >
            <Radio className="h-3 w-3 animate-pulse" />
            <span title={fallbackReason ?? `Event channel: ${wsStatus}`}>
              {isFallback ? "Offline fallback" : liveStatus}
            </span>
          </div>
        </div>
      </div>

      {repairQuestion > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/8 p-4 text-sm text-violet-100">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />
          <div>
            <p className="font-semibold">Repair Mode · Question {repairQuestion}</p>
            <p className="mt-1 text-xs leading-5 text-violet-100/70">
              Lead with the headline, ground your claims with concrete baselines, and explain the architectural trade-offs.
            </p>
          </div>
        </div>
      )}

      {(errorMessage || mediaError) && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 backdrop-blur-md">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Notice</p>
            <p className="text-xs text-red-300/90 mt-0.5">{errorMessage || mediaError}</p>
          </div>
        </div>
      )}

      {/* ── START PROMPT BANNER (Gestures unlock browser speech synthesis) ── */}
      {!hasUserStarted && (
        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-slate-900/60 p-6 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <Volume2 className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ready for your practice interview?</h3>
              <p className="text-xs text-slate-300">We’ll check your devices, play the interviewer’s question, then open your answer turn.</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono">
                <span className={`rounded-full border px-2 py-1 ${isMicReady ? "border-emerald-400/30 bg-emerald-950/30 text-emerald-300" : "border-amber-400/30 bg-amber-950/30 text-amber-300"}`}>
                  Mic {isMicReady ? "ready" : "checking"}
                </span>
                <span className={`rounded-full border px-2 py-1 ${isCameraReady ? "border-emerald-400/30 bg-emerald-950/30 text-emerald-300" : "border-amber-400/30 bg-amber-950/30 text-amber-300"}`}>
                  Camera {isCameraReady ? "ready" : "checking"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleStartSession}
              disabled={!isMicReady || !isCameraReady}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-400 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>{isMicReady && isCameraReady ? "Start Interview (Hear Question)" : "Preparing devices…"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN INTERVIEW CONSOLE ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Interviewer Persona & Spoken Question */}
        <div className="lg:col-span-6 space-y-6">
          <PanelInterviewerDeck
            activePersona={currentQuestion?.interviewer_persona}
            isTtsPlaying={convState === "INTERVIEWER_SPEAKING"}
          />

          <Card className="glass-panel-glow p-8 min-h-[360px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {currentQuestion?.interviewer_persona && (
                    <span
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                        String(currentQuestion.interviewer_persona).toUpperCase().includes("HR")
                          ? "border-violet-500/40 bg-violet-950/60 text-violet-300"
                          : "border-cyan-500/40 bg-cyan-950/60 text-cyan-300"
                      }`}
                    >
                      {String(currentQuestion.interviewer_persona).toUpperCase().includes("HR")
                        ? "Sarah Chen · HR"
                        : "Alex Rivera · Tech"}
                    </span>
                  )}
                  <span className="rounded-md border border-indigo-500/40 bg-indigo-950/60 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    {currentQuestion?.category || "Technical"}
                  </span>
                  {currentQuestion?.question_source === "follow_up" && (
                    <Badge variant="purple" className="text-xs">
                      ClaimChaser Follow-Up
                    </Badge>
                  )}
                </div>

                {/* State Pill */}
                <div className="flex items-center gap-2">
                  {convState === "INTERVIEWER_SPEAKING" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 animate-pulse">
                      <Volume2 className="h-3.5 w-3.5" />
                      Interviewer Speaking
                    </span>
                  )}
                  {convState === "LISTENING" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      Listening to you...
                    </span>
                  )}
                  {convState === "PROCESSING" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-amber-300">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Transcribing speech...
                    </span>
                  )}
                  {convState === "THINKING" && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-violet-300">
                      <Cpu className="h-3.5 w-3.5 animate-pulse" />
                      Analyzing claims...
                    </span>
                  )}
                </div>
              </div>

              {/* Active Question Text */}
              <div className="mt-4">
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-relaxed">
                  &ldquo;{currentQuestion?.question_text}&rdquo;
                </p>
                {currentQuestion?.target_competency && (
                  <p className="mt-3 text-xs font-mono text-slate-400">
                    Probing: <span className="text-slate-200">{currentQuestion.target_competency}</span>
                  </p>
                )}
              </div>

              {/* Live Transcript Preview */}
              {liveTranscript && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs text-slate-300 flex items-start gap-2.5 backdrop-blur-md">
                  <Mic className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-mono text-[11px] text-emerald-400 font-bold tracking-wider uppercase block mb-0.5">Live Spoken Transcript:</span>
                    <p className="italic text-slate-100 leading-relaxed">&ldquo;{liveTranscript}&rdquo;</p>
                  </div>
                </div>
              )}

              {(partialInputTranscript || partialOutputTranscript || liveWpm > 0) && (
                <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-950/20 p-3.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-violet-300">
                      Gemini Live Stream
                    </span>
                    {liveWpm > 0 && <span className="font-mono text-[11px] text-violet-200">{liveWpm} live WPM</span>}
                  </div>
                  {partialInputTranscript && <p className="mt-2 text-slate-100">You: {partialInputTranscript}</p>}
                  {partialOutputTranscript && <p className="mt-1 text-violet-100">Interviewer: {partialOutputTranscript}</p>}
                  {partialOutputTranscript && (
                    <button
                      type="button"
                      onClick={interruptInterviewer}
                      className="mt-3 rounded-lg border border-violet-400/30 px-2.5 py-1.5 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-500/20"
                    >
                      Interrupt interviewer
                    </button>
                  )}
                </div>
              )}

              {/* Question Action Controls */}
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReplayAudio}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 transition"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Hear Question Aloud</span>
                </button>
                {convState === "INTERVIEWER_SPEAKING" && (
                  <button
                    type="button"
                    onClick={handleStartAnsweringNow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                  >
                    <Mic className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Skip to Answer</span>
                  </button>
                )}
              </div>

              {/* Candidate clarification loop: real interviewers explain the
                  prompt, then let the candidate continue without losing the turn. */}
              <div className="mt-5 rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-indigo-200">Need a clarification?</span>
                  <span className="text-[11px] text-slate-500">You can ask before answering</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={doubt}
                    onChange={(event) => setDoubt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleExplainQuestion();
                    }}
                    placeholder="e.g. What trade-off should I focus on?"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-400"
                    disabled={isExplaining}
                  />
                  <button
                    type="button"
                    onClick={() => void handleExplainQuestion()}
                    disabled={isExplaining || !doubt.trim()}
                    className="rounded-lg bg-indigo-500/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isExplaining ? "Explaining…" : "Explain"}
                  </button>
                </div>
                {explanation && (
                  <p className="mt-3 rounded-lg border border-indigo-400/20 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-200">
                    {explanation}
                  </p>
                )}
              </div>
            </div>

            {/* Conversational Prompt Helper */}
            <div className="mt-8 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                VAD auto-detects when you finish speaking
              </span>
              {convState === "LISTENING" && (
                <button
                  type="button"
                  onClick={handleAutoFinishAnswer}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-sm"
                >
                  <Send className="h-3 w-3" />
                  <span>Finish Turn</span>
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Candidate Video & Microphone Waveform */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <VideoPreview
              stream={stream}
              isCameraReady={isCameraReady}
              isMicReady={isMicReady}
              isRecording={isRecording}
              recordedUrl={recordedUrl}
            />

            {/* Speaking Indicator Badge */}
            {isSpeaking && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono backdrop-blur-md z-40">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Speaking ({micLevelPercent}%)</span>
              </div>
            )}

            {/* Timer Pill */}
            {isRecording && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 border border-white/15 text-xs font-mono text-white backdrop-blur-md z-40">
                <Clock className="h-3.5 w-3.5 text-rose-400" />
                <span>
                  {Math.floor(recordingDuration / 60)}:
                  {Math.floor(recordingDuration % 60)
                    .toString()
                    .padStart(2, "0")}
                </span>
              </div>
            )}
          </div>

          {/* Microphone Waveform Visualizer */}
          <Card className="glass-panel p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Mic className={`h-4 w-4 ${isMicReady ? "text-emerald-400" : "text-slate-600"}`} />
              <span>{isMicReady ? "Microphone Live" : "Mic Off"}</span>
            </div>
            <div className="flex-1 max-w-[260px]">
              <AudioVisualizer isRecording={isRecording} stream={stream} />
            </div>
          </Card>
        </div>
      </div>

      {/* ── FOOTER NAVIGATION ─────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-6">
        <button
          type="button"
          onClick={handleFinishInterview}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          Finish Session Early
        </button>

        {isLastQuestion ? (
          <button
            type="button"
            onClick={handleFinishInterview}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400"
          >
            <Sparkles className="h-4 w-4 text-slate-950" />
            <span>Complete & View Evidence Report</span>
            <ArrowRight className="h-4 w-4 text-slate-950" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAutoFinishAnswer}
            disabled={isSubmitting || !isRecording}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-cyan-500 disabled:opacity-50"
          >
            <span>{isSubmitting ? "Analyzing..." : "Submit Answer & Continue"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </AppShell>
  );
}
