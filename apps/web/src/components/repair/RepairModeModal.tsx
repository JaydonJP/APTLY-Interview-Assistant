"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { RepairModeView } from "./RepairModeView";

export interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewId: string;
  questionId: string;
  questionText: string;
  weaknessTitle?: string;
  evidenceSnippet?: string;
  explanation?: string;
  initialBeforeEvidence?: number;
  initialBeforeFillers?: number;
  initialBeforeStructure?: number;
}

interface DrillItem {
  id: string;
  name: string;
  target: string;
  formula: string;
  instructions: string;
}

const DRILL_CATALOG: DrillItem[] = [
  {
    id: "Metric-Baseline-Method",
    name: "Metric / Baseline / Method",
    target: "Evidence depth",
    formula:
      "Metric -> Baseline -> Action -> Result -> Validation",
    instructions:
      "State the starting baseline before the result, then name the measurement or validation method.",
  },
  {
    id: "Tradeoff drill",
    name: "Decision / Trade-off / Failure mode",
    target: "Technical depth",
    formula:
      "Decision -> Benefit -> Alternative rejected -> Downside -> Mitigation",
    instructions:
      "Explain why the chosen approach won and what risk or cost you accepted.",
  },
  {
    id: "Filler reduction drill",
    name: "Two-beat pause",
    target: "Filler control",
    formula: "Silent pause -> Headline -> Supporting detail",
    instructions:
      "Replace the first filler sound with two silent beats, then begin with the answer headline.",
  },
  {
    id: "Ownership drill",
    name: "Team / I / Impact",
    target: "Individual ownership",
    formula: "Team context -> My decision -> My action -> Shared result",
    instructions:
      "Separate the team's work from the decision and implementation you personally owned.",
  },
  {
    id: "STAR result drill",
    name: "Result-first STAR",
    target: "Structure and impact",
    formula: "Result -> Situation -> Action -> Reflection",
    instructions:
      "Lead with the outcome, then make the action and personal judgement easy to follow.",
  },
  {
    id: "Validation drill",
    name: "Hypothesis / Test / Telemetry",
    target: "Validation",
    formula: "Hypothesis -> Test setup -> Production signal -> Conclusion",
    instructions:
      "Name the test conditions and production telemetry used to verify the result.",
  },
];

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
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface RepairDelta {
  metric_name: string;
  before_value: number;
  after_value: number;
  delta: number;
  improved: boolean;
  display_text: string;
}

interface RepairEvaluationResult {
  improvement_verified?: boolean;
  summary_verdict?: string;
  deltas?: RepairDelta[];
}

export function RepairModeModal({
  isOpen,
  onClose,
  interviewId,
  questionId,
  questionText,
  weaknessTitle = "Unsupported result claim",
  evidenceSnippet = "No transcript excerpt is available.",
  explanation = "Add a baseline, your action, the result, and how it was validated.",
}: RepairModalProps) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDrill, setSelectedDrill] = useState<DrillItem>(
    DRILL_CATALOG[0],
  );
  const [retryText, setRetryText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] =
    useState<RepairEvaluationResult | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setLevel(1);
    setRetryText("");
    setEvaluationError(null);
    setEvaluationResult(null);
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, [isOpen]);

  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const browserWindow = window as WindowWithSpeech;
    const SpeechRecognition =
      browserWindow.SpeechRecognition ||
      browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setEvaluationError(
        "Voice recognition is unavailable in this browser. Type the retry instead.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0].transcript} `;
      }
      const normalized = transcript.trim();
      if (normalized) setRetryText(normalized);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setEvaluationError(
        "Voice recognition stopped before it produced a reliable transcript.",
      );
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const submitRetry = async () => {
    if (!retryText.trim() || isEvaluating) return;
    recognitionRef.current?.stop();
    setIsRecording(false);
    setEvaluationError(null);
    setIsEvaluating(true);

    try {
      const result = await apiClient.post<RepairEvaluationResult>(
        `/api/v1/interviews/${interviewId}/repair`,
        {
          question_id: questionId,
          retry_transcript: retryText.trim(),
          drill_type: selectedDrill.id,
        },
      );
      setEvaluationResult(result);
      setLevel(4);
    } catch {
      setEvaluationResult(null);
      setEvaluationError(
        "Comparison is unavailable right now. Your retry has been kept, but APTLY will not invent improvement scores without a reliable evaluation.",
      );
      setLevel(3);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <RepairModeView
      level={level}
      setLevel={setLevel}
      onClose={onClose}
      questionText={questionText}
      weaknessTitle={weaknessTitle}
      evidenceSnippet={evidenceSnippet}
      explanation={explanation}
      drills={DRILL_CATALOG}
      selectedDrill={selectedDrill}
      setSelectedDrill={setSelectedDrill}
      retryText={retryText}
      setRetryText={setRetryText}
      isRecording={isRecording}
      isEvaluating={isEvaluating}
      evaluationError={evaluationError}
      evaluationResult={evaluationResult}
      onToggleRecording={toggleSpeechRecognition}
      onSubmit={() => void submitRetry()}
    />
  );
}
