"""Truthful normalization for transcript and browser telemetry signals.

The API treats model output as interpretation, not as a measurement source.
Transcript quality is derived from the provider payload and visual coaching is
derived only from observable, candidate-owned framing signals. No emotion,
personality, identity, or hiring suitability inference is produced here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class TranscriptQuality:
    """Quality metadata attached to a persisted transcript."""

    quality_score: float
    provider_confidence: float
    source_agreement_score: float | None
    quality_label: str
    quality_notes: str


def _clamp(value: Any, low: float, high: float) -> float | None:
    """Convert an untrusted numeric value to a bounded float."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return max(low, min(high, number))


def calculate_transcript_quality(
    *,
    provider: str,
    text: str,
    words: list[Any],
    live_transcript: str | None = None,
    used_live_fallback: bool = False,
) -> TranscriptQuality:
    """Calculate a conservative transcript-quality estimate."""
    clean_text = (text or "").strip()
    valid_words = [word for word in words if getattr(word, "word", "").strip()]
    confidences = [
        confidence
        for confidence in (
            _clamp(getattr(word, "confidence", None), 0.0, 1.0)
            for word in valid_words
        )
        if confidence is not None
    ]
    provider_confidence = (
        round(sum(confidences) / len(confidences), 3) if confidences else 0.0
    )

    source_agreement: float | None = None
    notes: list[str] = []
    if live_transcript and clean_text:
        source_words = set(live_transcript.lower().split())
        result_words = set(clean_text.lower().split())
        union = source_words | result_words
        source_agreement = round(
            len(source_words & result_words) / len(union), 3
        ) if union else None
        notes.append("Compared with the browser live transcript.")

    if not clean_text or not valid_words:
        return TranscriptQuality(
            quality_score=0.0,
            provider_confidence=provider_confidence,
            source_agreement_score=source_agreement,
            quality_label="low",
            quality_notes="No reliable word-level speech was available.",
        )

    score = 0.45
    if provider not in {"vad_silence_detector", "live_browser_speech"}:
        score += 0.25
    if confidences:
        score += 0.25 * provider_confidence
    if source_agreement is not None:
        score += 0.05 * source_agreement
    score = round(max(0.0, min(1.0, score)), 3)

    if used_live_fallback or provider == "live_browser_speech":
        notes.append("Browser live transcript used as a fallback; verify wording before relying on it.")
    if not confidences:
        notes.append("The transcription provider did not return per-word confidence.")
    label = "high" if score >= 0.8 else "medium" if score >= 0.55 else "low"
    return TranscriptQuality(
        quality_score=score,
        provider_confidence=provider_confidence,
        source_agreement_score=source_agreement,
        quality_label=label,
        quality_notes=" ".join(notes) or "Provider transcript contains timestamped words.",
    )


def normalize_vision_metrics(metrics: dict[str, Any] | None) -> dict[str, Any]:
    """Validate browser telemetry and discard non-observable inference fields."""
    source = metrics if isinstance(metrics, dict) else {}
    frame_count = int(_clamp(source.get("frame_count", 0), 0.0, 100_000.0) or 0)
    valid_frame_count = int(
        min(
            frame_count,
            _clamp(source.get("valid_frame_count", 0), 0.0, 100_000.0) or 0,
        )
    )

    def ratio(key: str) -> float | None:
        return _clamp(source.get(key), 0.0, 1.0)

    capability = str(source.get("capability_status", "unavailable"))
    if capability not in {"ready", "partial", "unavailable"}:
        capability = "unavailable"
    if frame_count == 0 or valid_frame_count == 0:
        capability = "unavailable"

    events = source.get("face_presence_events")
    safe_events: list[dict[str, Any]] = []
    if isinstance(events, list):
        for event in events[-2000:]:
            if not isinstance(event, dict):
                continue
            safe_events.append(
                {
                    "timestamp_seconds": round(
                        _clamp(event.get("timestamp_seconds", 0), 0.0, 86_400.0)
                        or 0.0,
                        3,
                    ),
                    "face_count": int(
                        _clamp(event.get("face_count", 0), 0.0, 10.0) or 0
                    ),
                    "face_x": _clamp(event.get("face_x", 0), 0.0, 1.0) or 0.0,
                    "face_y": _clamp(event.get("face_y", 0), 0.0, 1.0) or 0.0,
                    "face_width": _clamp(event.get("face_width", 0), 0.0, 1.0) or 0.0,
                    "face_height": _clamp(event.get("face_height", 0), 0.0, 1.0) or 0.0,
                    "eye_contact": bool(event.get("eye_contact", False)),
                    "confidence": _clamp(event.get("confidence", 0), 0.0, 1.0) or 0.0,
                }
            )

    return {
        "provider": str(source.get("provider", "browser"))[:50] or "browser",
        "model_version": str(source.get("model_version", "unavailable"))[:100] or "unavailable",
        "capability_status": capability,
        "frame_count": frame_count,
        "valid_frame_count": valid_frame_count,
        "analysis_duration_seconds": _clamp(
            source.get("analysis_duration_seconds", 0), 0.0, 86_400.0
        ) or 0.0,
        "face_detected_ratio": ratio("face_detected_ratio"),
        "multiple_people_ratio": ratio("multiple_people_ratio"),
        "eye_contact_ratio": ratio("eye_contact_ratio"),
        "face_centering_score": ratio("face_centering_score"),
        "tracking_confidence": ratio("tracking_confidence"),
        "expression_signal": "unavailable",
        "expression_confidence": None,
        "face_presence_events": safe_events,
    }


def build_vision_coaching(
    metrics: dict[str, Any],
) -> tuple[float | None, list[str], list[str]]:
    """Create candidate coaching from observable framing signals only."""
    if metrics.get("capability_status") == "unavailable" or not metrics.get(
        "valid_frame_count"
    ):
        return None, [], ["Camera framing feedback was unavailable for this answer."]

    face_ratio = metrics.get("face_detected_ratio")
    eye_ratio = metrics.get("eye_contact_ratio")
    centering = metrics.get("face_centering_score")
    tracking = metrics.get("tracking_confidence")
    components = [
        value
        for value in (face_ratio, eye_ratio, centering, tracking)
        if value is not None
    ]
    if not components:
        return None, [], ["The browser could not produce reliable framing signals."]

    score = round(sum(components) / len(components) * 100.0, 1)
    strengths: list[str] = []
    improvements: list[str] = []
    if face_ratio is not None and face_ratio >= 0.85:
        strengths.append("Your face stayed in frame for most of the answer.")
    elif face_ratio is not None:
        improvements.append("Keep your face in frame more consistently.")
    if centering is not None and centering >= 0.8:
        strengths.append("Your camera framing stayed centered.")
    elif centering is not None:
        improvements.append("Move the camera or seat position so your face is centered.")
    if eye_ratio is not None and eye_ratio >= 0.7:
        strengths.append("Your head orientation was usually toward the camera.")
    elif eye_ratio is not None:
        improvements.append("Practice looking toward the camera while speaking.")
    if metrics.get("multiple_people_ratio") is not None and metrics["multiple_people_ratio"] > 0.05:
        improvements.append("Only one person should be visible if you want clean framing feedback.")
    return score, strengths[:3], improvements[:4]
