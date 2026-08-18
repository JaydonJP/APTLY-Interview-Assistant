"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RecordingConsentModal } from "@/components/interview/RecordingConsentModal";
import { InterviewRoomView } from "@/components/interview/InterviewRoomView";
import { useMediaCapture } from "@/hooks/useMediaCapture";
import { useInterviewWebSocket } from "@/hooks/useInterviewWebSocket";
import { apiClient, getApiBaseUrl } from "@/lib/api-client";
import type { Answer, InterviewDetail, Question } from "@/types/interview";

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
  const { isMuted, toggleMute, interruptInterviewer } = useGeminiLiveSession({
    interviewId,
    enabled: Boolean(interviewId && hasConsent === true && hasUserStarted),
  });

  // WebSocket hook for live session events & heartbeat
  const { sendEvent } = useInterviewWebSocket({
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
    interruptInterviewer();
    cancelInterviewerSpeech();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setHasUserStarted(true);
    setConvState("LISTENING");
    void startRecording();
  };

  // Auto-finish and submit turn
  const handleAutoFinishAnswer = useCallback(async () => {
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
  }, [
    currentAnswer,
    currentQuestion,
    interviewId,
    isSubmitting,
    liveTranscript,
    recordingDuration,
    resetRecording,
    router,
    sendEvent,
    stopRecording,
    visionMetrics,
  ]);

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
      <main className="flex min-h-[100svh] items-center justify-center bg-[#07080a] px-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-zinc-500">
            Preparing the interview room...
          </p>
        </div>
      </main>
    );
  }

  const useRedesignedRoom = Boolean(interview) as boolean;
  if (useRedesignedRoom && interview) {
    return (
      <>
        <RecordingConsentModal
          isOpen={isConsentModalOpen}
          onConsent={handleConsentDecision}
        />
        <InterviewRoomView
          title={interview.title || "Practice interview"}
          question={currentQuestion}
          currentQuestionNumber={currentQIndex}
          totalQuestions={totalQuestions}
          repairQuestion={repairQuestion}
          convState={convState}
          hasUserStarted={hasUserStarted}
          isMicReady={isMicReady}
          isCameraReady={isCameraReady}
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          isSubmitting={isSubmitting}
          isMuted={isMuted}
          voiceEnabled={voiceEnabled}
          micLevelPercent={micLevelPercent}
          recordingDuration={recordingDuration}
          stream={stream}
          recordedUrl={recordedUrl}
          errorMessage={errorMessage}
          mediaError={mediaError}
          doubt={doubt}
          explanation={explanation}
          isExplaining={isExplaining}
          setDoubt={setDoubt}
          onStart={handleStartSession}
          onFinishInterview={() => void handleFinishInterview()}
          onFinishTurn={() => void handleAutoFinishAnswer()}
          onReplay={handleReplayAudio}
          onStartAnswering={handleStartAnsweringNow}
          onToggleMute={toggleMute}
          onToggleVoice={() => setVoiceEnabled((enabled) => !enabled)}
          onExplain={() => void handleExplainQuestion()}
        />
      </>
    );
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#07080a] px-5 text-center">
      <div className="max-w-md">
        <p className="eyebrow">Interview unavailable</p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.04em] text-stone-100">
          This room could not be opened.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {errorMessage || "The interview session was not found."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-6 min-h-11 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950"
        >
          Return to Practice
        </button>
      </div>
    </main>
  );
}
