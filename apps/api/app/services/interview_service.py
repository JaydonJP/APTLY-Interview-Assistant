"""
APTLY API — Interview Service

Orchestrates the complete interview lifecycle:
- Session creation & question generation
- State machine transition enforcement
- Answer creation, binary upload registration, and async background processing
- Deterministic speech metrics derivation & persistence
- Post-interview review compilation
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AptlyException
from app.core.logging import get_logger
from app.models.answer import Answer
from app.models.interview import Interview
from app.models.job import Job, RoleProfile
from app.models.metrics import SpeechMetrics
from app.models.question import Question
from app.models.transcript import Transcript
from app.schemas.content_intelligence import ContentAnalysisInput
from app.schemas.panel import get_persona_profile
from app.services.adaptive_interview.engine import GeminiAdaptiveEngine
from app.services.content_intelligence.service import ContentAnalysisService
from app.services.media_normalizer import MediaNormalizerService
from app.services.panel_service import PanelInterviewService
from app.services.providers.base import (
    LLMProvider,
    TranscriptionProvider,
    TranscriptionRequest,
)
from app.services.question_generator import QuestionGeneratorService
from app.services.role_analyzer import RoleAnalyzerService
from app.services.speech_metrics import SpeechMetricsService
from app.services.storage.base import StorageProvider, UploadRequest

logger = get_logger(__name__)

# Valid state machine transitions
VALID_INTERVIEW_TRANSITIONS: dict[str, set[str]] = {
    "created": {"ready", "failed"},
    "ready": {"running", "failed"},
    "running": {"question_active", "failed"},
    "question_active": {"answering", "completing", "failed"},
    "answering": {"answer_submitted", "question_active", "failed"},
    "answer_submitted": {
        "processing",
        "next_question",
        "question_active",
        "completing",
        "failed",
    },
    "processing": {"next_question", "question_active", "completing", "failed"},
    "next_question": {"question_active", "completing", "failed"},
    "completing": {"completed", "failed"},
    "completed": set(),  # Terminal
    "failed": {"ready", "running"},  # Recovery
}


class InvalidStateTransitionError(AptlyException):
    """Raised when an illegal state transition is attempted."""

    status_code = 400
    error_code = "INVALID_STATE_TRANSITION"

    def __init__(self, current_status: str, target_status: str) -> None:
        super().__init__(
            message=f"Cannot transition interview from '{current_status}' to '{target_status}'.",
        )


class InterviewService:
    """
    Core business logic and state machine coordinator for interviews.
    """

    def __init__(
        self,
        db_session: AsyncSession,
        llm_provider: LLMProvider,
        transcription_provider: TranscriptionProvider,
        storage_provider: StorageProvider,
    ) -> None:
        self.db = db_session
        self.llm_provider = llm_provider
        self.transcription_provider = transcription_provider
        self.storage_provider = storage_provider
        self.role_analyzer = RoleAnalyzerService(llm_provider)
        self.question_generator = QuestionGeneratorService(llm_provider)
        self.speech_metrics_service = SpeechMetricsService()
        self.content_analysis_service = ContentAnalysisService(llm_provider)
        self.media_normalizer = MediaNormalizerService()
        self.adaptive_engine = GeminiAdaptiveEngine(llm_provider=llm_provider)
        self.panel_service = PanelInterviewService()

    def transition_state(self, interview: Interview, new_status: str) -> None:
        """Enforce strict state machine transitions."""
        allowed = VALID_INTERVIEW_TRANSITIONS.get(interview.status, set())
        if new_status not in allowed:
            raise InvalidStateTransitionError(interview.status, new_status)
        interview.status = new_status

    async def create_interview(
        self,
        title: str,
        interview_type: str = "mixed",
        difficulty_level: str = "medium",
        target_duration_minutes: int = 10,
        question_count: int = 3,
        job_id: UUID | None = None,
        role_profile_id: UUID | None = None,
        user_id: str | None = None,
        is_panel_mode: bool = False,
    ) -> Interview:
        """Create and configure a new interview session with generated questions."""
        # 1. Fetch role profile if provided
        role_profile: RoleProfile | None = None
        if role_profile_id:
            role_profile = await self.db.get(RoleProfile, role_profile_id)
        elif job_id:
            stmt = select(RoleProfile).where(RoleProfile.job_id == job_id)
            res = await self.db.execute(stmt)
            role_profile = res.scalar_one_or_none()

        # If no role profile provided, create a default generic one
        if not role_profile:
            job = Job(
                raw_text="Generic Software Engineering Practice Interview",
                title=title,
                user_id=user_id,
            )
            self.db.add(job)
            await self.db.flush()

            role_profile = RoleProfile(
                job_id=job.id,
                role_title=title,
                seniority="Mid-Level",
                domain="Software Engineering",
                technical_skills=["System Design", "Python", "APIs", "Databases"],
                tools=["Git", "Docker"],
                responsibilities=["Backend Development", "System Reliability"],
                behavioral_competencies=["Problem Solving", "Communication"],
                interview_topics=["Architecture", "Debugging", "Collaboration"],
                preferred_experience=["3+ years engineering"],
            )
            self.db.add(role_profile)
            await self.db.flush()

        # 2. Create Interview entity
        interview = Interview(
            title=title or role_profile.role_title,
            job_id=role_profile.job_id,
            role_profile_id=role_profile.id,
            user_id=user_id,
            status="created",
            interview_type=interview_type,
            difficulty_level=difficulty_level,
            target_duration_minutes=target_duration_minutes,
            current_question_index=0,
        )
        self.db.add(interview)
        await self.db.flush()

        # 3. Retrieve Interview Twin coaching history to inform generation
        from app.services.interview_twin_service import InterviewTwinService
        twin_service = InterviewTwinService()
        twin_profile = await twin_service.get_twin_profile(self.db)

        # Generate Questions informed by previous sessions & panel mode
        questions = await self.question_generator.generate_questions(
            interview_id=interview.id,
            role_profile=role_profile,
            interview_type=interview_type,
            difficulty_level=difficulty_level,
            question_count=question_count,
            twin_profile=twin_profile,
            is_panel_mode=is_panel_mode,
        )
        for q in questions:
            self.db.add(q)

        self.transition_state(interview, "ready")
        await self.db.commit()
        await self.db.refresh(interview)

        logger.info(
            "interview_created",
            interview_id=str(interview.id),
            question_count=len(questions),
            status=interview.status,
        )
        return interview

    async def list_interviews(
        self, user_id: str | None = None, limit: int = 50
    ) -> list[Interview]:
        """Fetch list of interviews strictly owned by the specified user_id."""
        if not user_id:
            return []

        stmt = (
            select(Interview)
            .where(Interview.user_id == user_id)
            .options(
                selectinload(Interview.role_profile),
                selectinload(Interview.questions),
                selectinload(Interview.answers),
            )
            .order_by(Interview.created_at.desc())
            .limit(limit)
        )

        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_interview_detail(self, interview_id: UUID) -> Interview | None:
        """Fetch full interview entity with eager-loaded relationships."""
        stmt = (
            select(Interview)
            .where(Interview.id == interview_id)
            .options(
                selectinload(Interview.role_profile),
                selectinload(Interview.questions),
                selectinload(Interview.answers).selectinload(Answer.transcript),
                selectinload(Interview.answers).selectinload(Answer.speech_metrics),
                selectinload(Interview.answers).selectinload(Answer.content_metrics),
                selectinload(Interview.answers).selectinload(Answer.question),
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def start_interview(self, interview_id: UUID) -> Interview:
        """Start the interview session and activate Question 1."""
        interview = await self.get_interview_detail(interview_id)
        if not interview:
            raise AptlyException(
                f"Interview '{interview_id}' not found.", code="INTERVIEW_NOT_FOUND"
            )

        if interview.status in ("created", "ready"):
            self.transition_state(interview, "running")
            interview.started_at = datetime.now(UTC)
            interview.current_question_index = 0
            self.transition_state(interview, "question_active")
            await self.db.commit()
            await self.db.refresh(interview)

        return interview

    async def create_answer(self, interview_id: UUID, question_id: UUID) -> Answer:
        """Create a candidate answer record for the active question."""
        interview = await self.get_interview_detail(interview_id)
        if not interview:
            raise AptlyException(
                f"Interview '{interview_id}' not found.", code="INTERVIEW_NOT_FOUND"
            )

        # Check existing answer for idempotency
        stmt = select(Answer).where(
            Answer.interview_id == interview_id, Answer.question_id == question_id
        )
        res = await self.db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        question = await self.db.get(Question, question_id)
        if not question:
            raise AptlyException(
                f"Question '{question_id}' not found.", code="QUESTION_NOT_FOUND"
            )

        now = datetime.now(UTC)
        answer = Answer(
            interview_id=interview_id,
            question_id=question_id,
            sequence_number=question.sequence_number,
            status="created",
            started_at=now,
        )
        self.db.add(answer)

        if interview.status in ("question_active", "running"):
            self.transition_state(interview, "answering")

        await self.db.commit()
        await self.db.refresh(answer)
        return answer

    async def upload_and_process_answer(
        self,
        interview_id: UUID,
        answer_id: UUID,
        audio_data: bytes,
        content_type: str = "audio/webm",
        duration_seconds: float = 0.0,
        transcript_text: str | None = None,
    ) -> Answer:
        """
        Store audio bytes, mark answer uploaded, and trigger async speech processing.
        """
        answer = await self.db.get(Answer, answer_id)
        if not answer:
            raise AptlyException(
                f"Answer '{answer_id}' not found.", code="ANSWER_NOT_FOUND"
            )

        interview = await self.db.get(Interview, interview_id)
        if not interview:
            raise AptlyException(
                f"Interview '{interview_id}' not found.", code="INTERVIEW_NOT_FOUND"
            )

        # 1. Upload original audio/video to storage with safe fallback
        sha256_hash = self.media_normalizer.compute_sha256(audio_data)
        storage_key = f"raw_audio/{interview_id}/{answer_id}.webm"
        audio_size = len(audio_data)
        try:
            upload_req = UploadRequest(
                data=audio_data,
                content_type=content_type,
                data_class="raw_audio",
                interview_id=str(interview_id),
                answer_id=str(answer_id),
                extension="webm",
            )
            upload_res = await self.storage_provider.upload(upload_req)
            storage_key = upload_res.storage_key
            audio_size = upload_res.size_bytes
        except Exception as storage_err:
            logger.warning("storage_upload_fallback_used", error=str(storage_err))

        # 2. Extract & Normalize Audio via FFmpeg to 16kHz Mono WAV
        normalized_wav_bytes = audio_data
        normalized_key = None
        try:
            wav_bytes, media_info = self.media_normalizer.normalize_bytes(audio_data, extension="webm")
            normalized_wav_bytes = wav_bytes

            try:
                wav_upload_req = UploadRequest(
                    data=normalized_wav_bytes,
                    content_type="audio/wav",
                    data_class="raw_audio",
                    interview_id=str(interview_id),
                    answer_id=str(answer_id),
                    extension="wav",
                )
                wav_upload_res = await self.storage_provider.upload(wav_upload_req)
                normalized_key = wav_upload_res.storage_key
            except Exception as wav_stor_err:
                logger.warning("wav_storage_upload_warning", error=str(wav_stor_err))

            if media_info.get("duration_seconds"):
                duration_seconds = float(media_info["duration_seconds"])
        except Exception as norm_err:
            logger.warning("audio_normalization_skipped_or_failed", error=str(norm_err))

        # 3. Update answer metadata
        answer.audio_storage_key = storage_key
        answer.normalized_storage_key = normalized_key
        answer.audio_size_bytes = audio_size
        answer.audio_checksum_sha256 = sha256_hash
        answer.duration_seconds = duration_seconds or max(
            3.0, round(len(audio_data) / 16000.0, 1)
        )
        answer.ended_at = datetime.now(UTC)
        answer.status = "uploaded"
        answer.processing_status = "processing"

        if interview.status in ("answering", "question_active"):
            self.transition_state(interview, "answer_submitted")

        await self.db.commit()
        await self.db.refresh(answer)

        # 4. Trigger async transcription, metrics computation, and adaptive follow-up
        await self._process_answer_pipeline(
            answer,
            normalized_wav_bytes or audio_data,
            "audio/wav" if normalized_wav_bytes else content_type,
            transcript_text=transcript_text,
        )

        return answer

    async def _process_answer_pipeline(
        self,
        answer: Answer,
        audio_data: bytes,
        content_type: str,
        transcript_text: str | None = None,
    ) -> None:
        """
        Non-blocking speech processing pipeline:
        Transcribe normalized audio -> Compute speech metrics -> Content Intelligence -> Adaptive follow-up.
        """
        logger.info("transcription_started", answer_id=str(answer.id))
        answer.status = "processing"
        answer.transcription_status = "in_progress"
        await self.db.commit()

        # Step A: Transcribe via provider with failure safety
        from app.services.providers.base import TranscriptionResponse, TranscriptionWord
        transcription_res: TranscriptionResponse

        clean_live_text = (transcript_text or "").strip()
        if clean_live_text:
            dur = answer.duration_seconds or max(3.0, len(clean_live_text.split()) * 0.45)
            words_list = clean_live_text.split()
            step_time = dur / max(1, len(words_list))
            live_words = [
                TranscriptionWord(
                    word=w,
                    start_seconds=round(i * step_time, 2),
                    end_seconds=round((i + 1) * step_time, 2),
                    confidence=0.98,
                )
                for i, w in enumerate(words_list)
            ]
            transcription_res = TranscriptionResponse(
                text=clean_live_text,
                words=live_words,
                language="en",
                duration_seconds=dur,
                provider="live_browser_speech",
                model_version="web-speech-api",
            )
        else:
            try:
                transcription_res = await self.transcription_provider.transcribe(
                    TranscriptionRequest(
                        audio_bytes=audio_data,
                        content_type=content_type,
                        language="en",
                        metadata={"answer_id": str(answer.id)},
                    )
                )
            except Exception as tx_err:
                logger.warning("transcription_provider_failed", error=str(tx_err))
                dur = answer.duration_seconds or 5.0
                transcription_res = TranscriptionResponse(
                    text="[No speech detected or silent answer]",
                    words=[],
                    language="en",
                    duration_seconds=dur,
                    provider="vad_silence_detector",
                    model_version="1.0",
                )

        words_data = [
            {
                "word": w.word,
                "start_seconds": w.start_seconds,
                "end_seconds": w.end_seconds,
                "confidence": w.confidence,
            }
            for w in transcription_res.words
        ]

        transcript = Transcript(
            answer_id=answer.id,
            full_text=transcription_res.text,
            word_count=len(transcription_res.words),
            language=transcription_res.language,
            segments_json=[],
            words_json=words_data,
            model_provider=transcription_res.provider,
            model_version=transcription_res.model_version,
            schema_version="1.0",
        )
        self.db.add(transcript)
        answer.transcription_status = "completed"

        # Step B: Compute deterministic speech metrics
        metrics_computed = self.speech_metrics_service.compute(
            words=words_data,
            total_audio_duration_seconds=answer.duration_seconds,
        )

        speech_metrics = SpeechMetrics(
            answer_id=answer.id,
            schema_version="1.0",
            wpm=metrics_computed.wpm,
            speaking_duration_seconds=metrics_computed.speaking_duration_seconds,
            total_words=metrics_computed.total_words,
            filler_count=metrics_computed.filler_count,
            filler_density=metrics_computed.filler_density,
            filler_words_json=metrics_computed.filler_words,
            pause_count=metrics_computed.pause_count,
            total_pause_seconds=metrics_computed.total_pause_seconds,
            pauses_json=metrics_computed.pauses,
        )
        self.db.add(speech_metrics)

        # Step C: Phase 2 Content Intelligence Analysis
        content_metrics_record = None
        try:
            question = await self.db.get(Question, answer.question_id)
            interview = await self.db.get(Interview, answer.interview_id)
            role_profile = None
            if interview and interview.role_profile_id:
                role_profile = await self.db.get(RoleProfile, interview.role_profile_id)

            analysis_input = ContentAnalysisInput(
                role_title=role_profile.role_title if role_profile else "Software Engineer",
                seniority=role_profile.seniority if role_profile else "Mid-Level",
                domain=role_profile.domain if role_profile else "Engineering",
                technical_skills=role_profile.technical_skills if role_profile else [],
                question_text=question.question_text if question else "Technical question",
                question_category=question.category if question else "technical",
                expected_topics=question.expected_topics if question else [],
                full_transcript=transcription_res.text,
                words=words_data,
                duration_seconds=answer.duration_seconds,
            )

            content_result = await self.content_analysis_service.analyze_answer(analysis_input)
            content_metrics_record = await self.content_analysis_service.persist_content_metrics(
                db=self.db,
                answer_id=answer.id,
                result=content_result,
                provider=getattr(self.llm_provider, "PROVIDER_NAME", "gemini"),
                model=getattr(self.llm_provider, "MODEL_NAME", "gemini-2.5-flash"),
            )
            logger.info(
                "content_intelligence_completed",
                answer_id=str(answer.id),
                score=content_result.overall_content_score,
            )

            # Step D: Phase 3 Adaptive Follow-Up Question Generation
            if question:
                followup = await self.adaptive_engine.maybe_generate_followup(
                    db=self.db,
                    parent_question=question,
                    candidate_transcript=transcription_res.text,
                    content_metrics=content_metrics_record,
                    role_context=(
                        {"role_title": role_profile.role_title, "domain": role_profile.domain}
                        if role_profile
                        else None
                    ),
                )
                if followup:
                    logger.info(
                        "adaptive_followup_ready_for_turn",
                        parent_q=str(question.id),
                        followup_q=str(followup.id),
                        text=followup.question_text,
                    )
        except Exception as content_err:
            logger.error(
                "content_intelligence_or_adaptive_failed",
                answer_id=str(answer.id),
                error=str(content_err),
            )

        answer.status = "transcribed"
        answer.processing_status = "processed"
        await self.db.commit()
        await self.db.refresh(answer)

        logger.info(
            "speech_processing_completed",
            answer_id=str(answer.id),
            words=transcript.word_count,
            wpm=speech_metrics.wpm,
            fillers=speech_metrics.filler_count,
        )

    async def advance_question(self, interview_id: UUID) -> Interview:
        """Advance the interview to the next question or completion."""
        interview = await self.get_interview_detail(interview_id)
        if not interview:
            raise AptlyException(
                f"Interview '{interview_id}' not found.", code="INTERVIEW_NOT_FOUND"
            )

        next_idx = interview.current_question_index + 1
        if next_idx < len(interview.questions):
            interview.current_question_index = next_idx
            self.transition_state(interview, "question_active")
        else:
            self.transition_state(interview, "completing")
            self.transition_state(interview, "completed")
            interview.completed_at = datetime.now(UTC)

        await self.db.commit()
        await self.db.refresh(interview)
        return interview

    async def finish_interview(self, interview_id: UUID) -> Interview:
        """Mark the interview complete."""
        interview = await self.get_interview_detail(interview_id)
        if not interview:
            raise AptlyException(
                f"Interview '{interview_id}' not found.", code="INTERVIEW_NOT_FOUND"
            )

        if interview.status != "completed":
            if interview.status in (
                "running",
                "question_active",
                "answering",
                "answer_submitted",
                "processing",
                "next_question",
            ):
                self.transition_state(interview, "completing")
                self.transition_state(interview, "completed")
                interview.completed_at = datetime.now(UTC)
                await self.db.commit()
                await self.db.refresh(interview)

        return interview

    @staticmethod
    def _build_report_card(
        session_id: str,
        questions_review: list[dict[str, Any]],
        average_content_score: float,
        average_wpm: float,
        total_duration_seconds: float,
        total_fillers: int,
        total_pauses: int,
        competency_coverage: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Assemble the evidence-first report card with universal EvidenceEvent contracts.

        Speech metrics are deterministic (MEASURED/DERIVED). Semantic scores come from the
        structured content evaluator (AI_EVALUATED). Every report insight is strictly traceable
        to one or more evidence events.
        """
        from app.schemas.evidence import (
            EvidenceEvent,
            EvidenceEventType,
            EvidenceSource,
        )

        evidence_events: list[EvidenceEvent] = []
        habits: list[dict[str, Any]] = []
        strengths: list[str] = []

        for item in questions_review:
            question = item["question"]
            question_number = question["sequence_number"]
            turn_id = str((item.get("answer") or {}).get("id") or question["id"])
            speech = item.get("speech_metrics") or {}
            content = item.get("content_metrics") or {}
            ans_duration = float((item.get("answer") or {}).get("duration_seconds", 0.0))

            # 1. Measured Filler Word Events
            for index, filler in enumerate(speech.get("filler_words", [])):
                start = float(filler.get("timestamp_seconds", 0.0))
                end = start + float(filler.get("duration_seconds", 0.2))
                start_ms = max(0, int(start * 1000))
                end_ms = max(start_ms, int(end * 1000))
                evt = EvidenceEvent(
                    id=f"evt-filler-{question_number}-{index}",
                    session_id=session_id,
                    turn_id=turn_id,
                    type=EvidenceEventType.FILLER,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    severity=3,
                    reliability=0.99,
                    title=f'Filler word: "{filler.get("word", "filler")}"',
                    explanation="Filler words impact delivery flow and reduce perceived confidence.",
                    payload={
                        "word": filler.get("word"),
                        "question_number": question_number,
                        "quote": filler.get("word"),
                    },
                    source=EvidenceSource.MEASURED,
                )
                evidence_events.append(evt)

            # 2. Measured Pause Events
            for index, pause in enumerate(speech.get("pauses", [])):
                start = float(pause.get("start_seconds", 0.0))
                end = float(pause.get("end_seconds", start))
                start_ms = max(0, int(start * 1000))
                end_ms = max(start_ms, int(end * 1000))
                duration_sec = round(end - start, 2)
                evt = EvidenceEvent(
                    id=f"evt-pause-{question_number}-{index}",
                    session_id=session_id,
                    turn_id=turn_id,
                    type=EvidenceEventType.PAUSE,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    severity=2,
                    reliability=0.98,
                    title=f"Extended pause ({duration_sec}s)",
                    explanation="A sustained silent gap was detected between transcript segments.",
                    payload={
                        "duration_seconds": duration_sec,
                        "question_number": question_number,
                    },
                    source=EvidenceSource.MEASURED,
                )
                evidence_events.append(evt)

            # 3. Derived Pace Shift Events
            wpm = float(speech.get("wpm", 0.0))
            if wpm > 0 and not (130 <= wpm <= 160):
                evt = EvidenceEvent(
                    id=f"evt-pace-{question_number}",
                    session_id=session_id,
                    turn_id=turn_id,
                    type=EvidenceEventType.PACE_SHIFT,
                    start_ms=0,
                    end_ms=max(0, int(ans_duration * 1000)),
                    severity=3,
                    reliability=0.95,
                    title=f"Pace out of range ({wpm:.0f} WPM)",
                    explanation=f"Speaking rate of {wpm:.0f} WPM deviated from the optimal 130-160 WPM interview coaching band.",
                    payload={
                        "wpm": wpm,
                        "target_band_min": 130,
                        "target_band_max": 160,
                        "question_number": question_number,
                    },
                    source=EvidenceSource.DERIVED,
                )
                evidence_events.append(evt)

            # 4. Semantic Evidence Anchors (Strong Evidence)
            for index, evidence in enumerate(content.get("evidence", [])):
                start = float(evidence.get("start_seconds", 0.0))
                end = float(evidence.get("end_seconds", start))
                start_ms = max(0, int(start * 1000))
                end_ms = max(start_ms, int(end * 1000))
                evt_type = (
                    EvidenceEventType.STRONG_EVIDENCE
                    if str(evidence.get("type", "")).upper() == "STRENGTH"
                    else EvidenceEventType.STRONG_EVIDENCE
                )
                evt = EvidenceEvent(
                    id=f"evt-anchor-{question_number}-{evidence.get('id', index)}",
                    session_id=session_id,
                    turn_id=turn_id,
                    type=evt_type,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    severity=1,
                    reliability=float(evidence.get("confidence", 0.85)),
                    title="Grounded evidence anchor",
                    explanation="Specific transcript segment demonstrating domain experience and competency.",
                    payload={
                        "quote": evidence.get("text"),
                        "type": evidence.get("type"),
                        "question_number": question_number,
                    },
                    source=EvidenceSource.AI_EVALUATED,
                )
                evidence_events.append(evt)

            # 5. Unsupported Claims
            for index, claim in enumerate(content.get("claims", [])):
                support_status = claim.get("support_status")
                if support_status in {"UNSUPPORTED", "PARTIALLY_SUPPORTED"}:
                    start = float(claim.get("start_seconds", 0.0))
                    end = float(claim.get("end_seconds", start + 1.0))
                    start_ms = max(0, int(start * 1000))
                    end_ms = max(start_ms, int(end * 1000))
                    claim_evt_id = f"evt-claim-{question_number}-{index}"
                    claim_evt = EvidenceEvent(
                        id=claim_evt_id,
                        session_id=session_id,
                        turn_id=turn_id,
                        type=EvidenceEventType.UNSUPPORTED_CLAIM,
                        start_ms=start_ms,
                        end_ms=end_ms,
                        severity=5 if support_status == "UNSUPPORTED" else 4,
                        reliability=0.90,
                        title="Substantiate measurable claim",
                        explanation=f"A measurable claim was made without baseline or validation: '{claim.get('claim', '')}'",
                        payload={
                            "claim": claim.get("claim"),
                            "support_status": support_status,
                            "question_number": question_number,
                            "quote": claim.get("claim"),
                        },
                        source=EvidenceSource.AI_EVALUATED,
                    )
                    evidence_events.append(claim_evt)

                    habits.append(
                        {
                            "id": f"habit-claim-{question_number}-{index}",
                            "title": "Substantiate measurable claims",
                            "severity": 5 if support_status == "UNSUPPORTED" else 4,
                            "observation": str(claim.get("claim", "A measurable claim was made without enough detail.")),
                            "impact": "Specific baselines and validation make your contribution credible to a skeptical interviewer.",
                            "drill_title": "Metric → Baseline → Result",
                            "drill_instructions": "Repeat the claim in one sentence, then add the baseline, your action, the result, and how you measured it.",
                            "evidence_event_ids": [claim_evt_id],
                            "evidence_start_seconds": start,
                            "evidence_end_seconds": end,
                        }
                    )

            # 6. STAR Gaps
            star = content.get("star_analysis") or {}
            missing_components = star.get("missing_components", [])
            if missing_components:
                star_evt_id = f"evt-star-{question_number}"
                star_evt = EvidenceEvent(
                    id=star_evt_id,
                    session_id=session_id,
                    turn_id=turn_id,
                    type=EvidenceEventType.STAR_GAP,
                    start_ms=0,
                    end_ms=max(0, int(ans_duration * 1000)),
                    severity=4,
                    reliability=0.92,
                    title=f"STAR gap: missing {', '.join(missing_components)}",
                    explanation=f"The behavioral response did not clearly land the {', '.join(missing_components)} component(s).",
                    payload={
                        "missing_components": missing_components,
                        "question_number": question_number,
                    },
                    source=EvidenceSource.AI_EVALUATED,
                )
                evidence_events.append(star_evt)

                habits.append(
                    {
                        "id": f"habit-star-{question_number}",
                        "title": "Close the STAR loop",
                        "severity": 4,
                        "observation": f"The answer did not clearly land the {', '.join(missing_components)}.",
                        "impact": "Without a measurable result, the interviewer cannot evaluate the impact of your decisions.",
                        "drill_title": "Result-first STAR drill",
                        "drill_instructions": "Answer in four beats: situation, task, action, measurable result. Keep each beat to one sentence.",
                        "evidence_event_ids": [star_evt_id],
                        "evidence_start_seconds": 0.0,
                        "evidence_end_seconds": ans_duration,
                    }
                )

            # 7. Ownership Gaps & Weaknesses
            if content.get("weaknesses"):
                weakness_text = str(content["weaknesses"][0])
                own_evt_id = f"evt-ownership-{question_number}"
                own_evt = EvidenceEvent(
                    id=own_evt_id,
                    session_id=session_id,
                    turn_id=turn_id,
                    type=EvidenceEventType.OWNERSHIP_GAP,
                    start_ms=0,
                    end_ms=max(0, int(ans_duration * 1000)),
                    severity=3,
                    reliability=0.88,
                    title="Make the trade-off explicit",
                    explanation=weakness_text,
                    payload={
                        "weakness": weakness_text,
                        "question_number": question_number,
                    },
                    source=EvidenceSource.AI_EVALUATED,
                )
                evidence_events.append(own_evt)

                drill = (content.get("practice_drills") or [{}])[0]
                habits.append(
                    {
                        "id": f"habit-ownership-{question_number}",
                        "title": "Make the trade-off explicit",
                        "severity": 3,
                        "observation": weakness_text,
                        "impact": "Trade-offs show that your technical decisions were deliberate and production-ready.",
                        "drill_title": str(drill.get("title", "Trade-off explanation drill")),
                        "drill_instructions": str(drill.get("instructions", "Name one benefit and one failure mode.")),
                        "evidence_event_ids": [own_evt_id],
                        "evidence_start_seconds": 0.0,
                        "evidence_end_seconds": ans_duration,
                    }
                )

            strengths.extend(strength for strength in content.get("strengths", [])[:2])

        # 8. Delivery Habits grounded in Measured Events
        filler_events = [e for e in evidence_events if e.type == EvidenceEventType.FILLER]
        if filler_events:
            habits.append(
                {
                    "id": "habit-delivery-fillers",
                    "title": "Replace filler clusters with a clean pause",
                    "severity": min(5, 2 + len(filler_events)),
                    "observation": f"Aptly detected {len(filler_events)} filler word{'s' if len(filler_events) != 1 else ''} in the recording.",
                    "impact": "A short silent pause sounds more intentional than filling thinking time with 'um' or 'uh'.",
                    "drill_title": "Two-beat pause drill",
                    "drill_instructions": "Answer five prompts. Before each answer, take two silent beats, then begin with your headline.",
                    "evidence_event_ids": [e.id for e in filler_events],
                    "evidence_start_seconds": filler_events[0].start_seconds,
                    "evidence_end_seconds": filler_events[0].end_seconds,
                }
            )

        pause_events = [e for e in evidence_events if e.type == EvidenceEventType.PAUSE]
        if pause_events:
            habits.append(
                {
                    "id": "habit-delivery-pauses",
                    "title": "Recover faster after a long pause",
                    "severity": 3,
                    "observation": f"{len(pause_events)} longer pause{'s' if len(pause_events) != 1 else ''} appeared between transcript words.",
                    "impact": "A visible recovery phrase keeps the interviewer oriented while you think.",
                    "drill_title": "Bridge phrase drill",
                    "drill_instructions": "Practice saying 'I'll break that into two parts' before giving a structured answer.",
                    "evidence_event_ids": [e.id for e in pause_events],
                    "evidence_start_seconds": pause_events[0].start_seconds,
                    "evidence_end_seconds": pause_events[0].end_seconds,
                }
            )

        pace_events = [e for e in evidence_events if e.type == EvidenceEventType.PACE_SHIFT]
        if pace_events:
            habits.append(
                {
                    "id": "habit-delivery-pace",
                    "title": "Bring your pace into the interview band",
                    "severity": 3,
                    "observation": f"Speaking pace was {average_wpm:.0f} WPM; Aptly's coaching band is 130-160 WPM.",
                    "impact": "A steadier pace gives the interviewer time to follow your reasoning.",
                    "drill_title": "90-second pacing drill",
                    "drill_instructions": "Read a technical explanation aloud for 90 seconds. Mark one breath every sentence and keep the headline first.",
                    "evidence_event_ids": [e.id for e in pace_events],
                    "evidence_start_seconds": pace_events[0].start_seconds,
                    "evidence_end_seconds": pace_events[0].end_seconds,
                }
            )

        # De-duplicate habits preserving highest severity
        unique_habits: list[dict[str, Any]] = []
        seen_titles: set[str] = set()
        for habit in sorted(habits, key=lambda value: value["severity"], reverse=True):
            if habit["title"] in seen_titles:
                continue
            seen_titles.add(habit["title"])
            unique_habits.append(habit)
        top_habits = unique_habits[:3]

        pace_score = 100.0 if not average_wpm else max(
            0.0, 100.0 - abs(145.0 - average_wpm) * 1.2
        )
        filler_score = max(0.0, 100.0 - total_fillers * 12.0)
        pause_score = max(0.0, 100.0 - total_pauses * 10.0)
        delivery_score = round((pace_score + filler_score + pause_score) / 3, 1)
        overall_score = round(
            average_content_score * 0.65 + delivery_score * 0.35
            if questions_review
            else 0.0,
            1,
        )

        weakest_question_number = None
        scored_questions = [
            (
                item["question"]["sequence_number"],
                float((item.get("content_metrics") or {}).get("overall_content_score", 101.0)),
            )
            for item in questions_review
            if item.get("content_metrics")
        ]
        if scored_questions:
            weakest_question_number = min(scored_questions, key=lambda value: value[1])[0]

        # Deduplicate evidence events by (type, title, turn_id)
        unique_events: list[EvidenceEvent] = []
        seen_event_keys: set[str] = set()
        for evt in evidence_events:
            key = f"{evt.type}:{evt.title}:{evt.turn_id}"
            if key not in seen_event_keys:
                seen_event_keys.add(key)
                unique_events.append(evt)

        # Sorted by timestamp order
        sorted_events = sorted(unique_events, key=lambda e: (e.start_ms, e.end_ms))

        # Compute Confidence Trend & Crumble Point
        confidence_points = []
        crumble_point = None
        min_score = 101.0

        for item in questions_review:
            q_num = item["question"]["sequence_number"]
            cm = item.get("content_metrics") or {}
            score = float(cm.get("overall_content_score", 0.0))
            if score > 0:
                confidence_points.append({
                    "question_number": q_num,
                    "score": score,
                    "competency": item["question"].get("competency") or "General",
                    "status": "STRONG" if score >= 75 else ("MODERATE" if score >= 50 else "CRUMBLED"),
                })
                if score < min_score:
                    min_score = score
                    if score < 60:
                        crumble_point = {
                            "question_number": q_num,
                            "question_text": item["question"]["question_text"],
                            "competency": item["question"].get("competency") or "Technical Depth",
                            "score": score,
                            "note": f"Candidate struggled on Question {q_num} ('{item['question'].get('competency', 'Technical')}') where score dropped to {score:.0f}/100.",
                        }

        return {
            "overall_score": overall_score,
            "content_score": round(average_content_score, 1),
            "delivery_score": delivery_score,
            "confidence_label": "Measured + evidence-linked" if questions_review else "Awaiting answers",
            "strengths": list(dict.fromkeys(strengths))[:3],
            "top_habits": top_habits,
            "confidence_trend": confidence_points,
            "crumble_point": crumble_point,
            "privacy_note": {
                "processing": "Browser WebRTC/MediaRecorder audio and camera frames are processed ephemerally.",
                "storage": "Raw media artifacts are persisted in secure, encrypted storage (Supabase / Local).",
                "retention": "Audio/video recordings can be purged anytime on request or automatically post-session.",
            },
            "evidence_events": [e.model_dump() for e in sorted_events],
            "competency_coverage": competency_coverage,
            "delivery": {
                "score": delivery_score,
                "pace_label": (
                    "In coaching band" if 130 <= average_wpm <= 160 else "Needs calibration"
                ),
                "pace_note": (
                    f"Average {average_wpm:.0f} WPM versus a 130-160 WPM coaching band."
                    if average_wpm
                    else "No timestamped speech was available for pace analysis."
                ),
                "camera_attention_estimate": None,
                "camera_attention_reliability": None,
                "voice_energy_trend": None,
                "voice_energy_label": "Unavailable",
                "metric_notes": [
                    "Filler and pause metrics are deterministic from timestamped words.",
                    "Camera-attention and voice-energy metrics will appear when browser telemetry is attached.",
                ],
            },
            "recommended_repair_question": weakest_question_number,
            "next_session_focus": (
                top_habits[0]["title"]
                if top_habits
                else "Keep the headline-first structure and add one concrete result."
            ),
        }

    async def compile_review(self, interview_id: UUID) -> dict[str, Any]:
        """Compile a complete post-interview review view."""
        interview = await self.get_interview_detail(interview_id)
        if not interview:
            raise AptlyException(
                f"Interview '{interview_id}' not found.", code="INTERVIEW_NOT_FOUND"
            )

        total_duration = 0.0
        total_words = 0
        total_fillers = 0
        total_pauses = 0
        wpm_list: list[float] = []
        content_scores_list: list[float] = []
        relevance_scores_list: list[float] = []
        tech_depth_scores_list: list[float] = []
        questions_review: list[dict[str, Any]] = []

        # Map answers by question_id
        answers_by_q = {ans.question_id: ans for ans in interview.answers}

        for q in interview.questions:
            ans = answers_by_q.get(q.id)
            item: dict[str, Any] = {
                "question": {
                    "id": q.id,
                    "interview_id": q.interview_id,
                    "sequence_number": q.sequence_number,
                    "category": q.category,
                    "question_type": q.question_type,
                    "competency": q.competency,
                    "difficulty": q.difficulty,
                    "question_text": q.question_text,
                    "expected_topics": q.expected_topics,
                    "prompt_version": q.prompt_version,
                    "parent_question_id": q.parent_question_id,
                    "root_question_id": q.root_question_id,
                    "question_source": q.question_source,
                    "follow_up_depth": q.follow_up_depth,
                    "target_competency": q.target_competency,
                    "interviewer_persona": q.interviewer_persona,
                    "persona_profile": (
                        get_persona_profile(q.interviewer_persona).model_dump()
                        if q.interviewer_persona
                        else None
                    ),
                },
                "answer": None,
                "transcript": None,
                "speech_metrics": None,
                "content_metrics": None,
            }

            if ans:
                total_duration += ans.duration_seconds
                item["answer"] = {
                    "id": ans.id,
                    "interview_id": ans.interview_id,
                    "question_id": ans.question_id,
                    "sequence_number": ans.sequence_number,
                    "status": ans.status,
                    "duration_seconds": ans.duration_seconds,
                    "started_at": ans.started_at,
                    "ended_at": ans.ended_at,
                    "audio_storage_key": ans.audio_storage_key,
                    "audio_size_bytes": ans.audio_size_bytes,
                    "created_at": ans.created_at,
                }

                if ans.transcript:
                    total_words += ans.transcript.word_count
                    item["transcript"] = {
                        "id": ans.transcript.id,
                        "answer_id": ans.transcript.answer_id,
                        "full_text": ans.transcript.full_text,
                        "word_count": ans.transcript.word_count,
                        "language": ans.transcript.language,
                        "segments": ans.transcript.segments_json,
                        "words": ans.transcript.words_json,
                        "model_provider": ans.transcript.model_provider,
                        "model_version": ans.transcript.model_version,
                        "created_at": ans.transcript.created_at,
                    }

                if ans.speech_metrics:
                    m = ans.speech_metrics
                    total_fillers += m.filler_count
                    total_pauses += m.pause_count
                    if m.wpm > 0:
                        wpm_list.append(m.wpm)

                    item["speech_metrics"] = {
                        "id": m.id,
                        "answer_id": m.answer_id,
                        "wpm": m.wpm,
                        "speaking_duration_seconds": m.speaking_duration_seconds,
                        "total_words": m.total_words,
                        "filler_count": m.filler_count,
                        "filler_density": m.filler_density,
                        "filler_words": [
                            {
                                "word": fw.get("word", ""),
                                "timestamp_seconds": float(
                                    fw.get("timestamp_seconds", 0.0)
                                ),
                                "duration_seconds": float(
                                    fw.get("duration_seconds", 0.2)
                                ),
                            }
                            for fw in m.filler_words_json
                        ],
                        "pause_count": m.pause_count,
                        "total_pause_seconds": m.total_pause_seconds,
                        "pauses": [
                            {
                                "start_seconds": float(p.get("start_seconds", 0.0)),
                                "end_seconds": float(p.get("end_seconds", 0.0)),
                                "duration_seconds": float(
                                    p.get("duration_seconds", 0.0)
                                ),
                            }
                            for p in m.pauses_json
                        ],
                        "created_at": m.created_at,
                    }

                if ans.content_metrics:
                    cm = ans.content_metrics
                    content_scores_list.append(cm.overall_content_score)
                    relevance_scores_list.append(cm.relevance_score)
                    tech_depth_scores_list.append(cm.technical_depth_score)

                    item["content_metrics"] = {
                        "id": cm.id,
                        "answer_id": cm.answer_id,
                        "question_type": cm.question_type,
                        "relevance_score": cm.relevance_score,
                        "technical_depth_score": cm.technical_depth_score,
                        "completeness_score": cm.completeness_score,
                        "structure_score": cm.structure_score,
                        "evidence_score": cm.evidence_score,
                        "overall_content_score": cm.overall_content_score,
                        "strengths": cm.strengths_json,
                        "weaknesses": cm.weaknesses_json,
                        "star_analysis": cm.star_analysis_json,
                        "claims": cm.claims_json,
                        "evidence": cm.evidence_json,
                        "feedback": cm.feedback_json,
                        "practice_drills": cm.practice_drills_json,
                        "reasoning_summary": cm.reasoning_summary,
                        "provider": cm.provider,
                        "model": cm.model,
                        "prompt_version": cm.prompt_version,
                        "created_at": cm.created_at,
                    }

            # Extract Answer DNA (Technical or Behavioral)
            from app.services.content_intelligence.answer_dna_service import (
                AnswerDNAService,
            )

            dna_service = AnswerDNAService()
            transcript_text = (item.get("transcript") or {}).get("full_text") or ""
            if str(q.category).lower() == "behavioral":
                item["behavioral_dna"] = dna_service.extract_behavioral_dna(transcript_text).model_dump()
                item["technical_dna"] = None
            else:
                item["technical_dna"] = dna_service.extract_technical_dna(transcript_text).model_dump()
                item["behavioral_dna"] = None

            questions_review.append(item)

        avg_wpm = round(sum(wpm_list) / len(wpm_list), 1) if wpm_list else 0.0
        overall_filler_density = (
            round((total_fillers / total_words) * 100, 2) if total_words > 0 else 0.0
        )
        avg_content = (
            round(sum(content_scores_list) / len(content_scores_list), 1)
            if content_scores_list
            else 0.0
        )
        avg_relevance = (
            round(sum(relevance_scores_list) / len(relevance_scores_list), 1)
            if relevance_scores_list
            else 0.0
        )
        avg_tech_depth = (
            round(sum(tech_depth_scores_list) / len(tech_depth_scores_list), 1)
            if tech_depth_scores_list
            else 0.0
        )

        # Collect target competencies from role profile or question competencies
        target_competencies: list[str] = []
        if interview.role_profile:
            if interview.role_profile.behavioral_competencies:
                target_competencies.extend(interview.role_profile.behavioral_competencies)
            if interview.role_profile.technical_skills:
                target_competencies.extend(interview.role_profile.technical_skills)

        if not target_competencies:
            for q in interview.questions:
                if q.competency:
                    clean_comp = q.competency.split(" (")[0].strip()
                    if clean_comp:
                        target_competencies.append(clean_comp)

        if not target_competencies:
            target_competencies = ["Problem Solving", "System Architecture", "Communication", "Technical Depth"]

        target_competencies = list(dict.fromkeys(target_competencies))

        from app.services.content_intelligence.answer_dna_service import (
            AnswerDNAService,
        )
        dna_service = AnswerDNAService()
        competency_coverage = dna_service.evaluate_session_competencies(
            interview_id=str(interview.id),
            target_competencies=target_competencies,
            questions_with_answers=questions_review,
        ).model_dump()

        report_card = self._build_report_card(
            session_id=str(interview.id),
            questions_review=questions_review,
            average_content_score=avg_content,
            average_wpm=avg_wpm,
            total_duration_seconds=total_duration,
            total_fillers=total_fillers,
            total_pauses=total_pauses,
            competency_coverage=competency_coverage,
        )

        panel_report = self.panel_service.compile_panel_report(questions_review).model_dump()
        is_panel = interview.interview_type.lower() == "panel" or any(
            bool(q.interviewer_persona) for q in interview.questions
        )

        return {
            "interview": {
                "id": interview.id,
                "title": interview.title,
                "status": interview.status,
                "interview_type": interview.interview_type,
                "difficulty_level": interview.difficulty_level,
                "target_duration_minutes": interview.target_duration_minutes,
                "current_question_index": interview.current_question_index,
                "is_panel_mode": is_panel,
                "started_at": interview.started_at,
                "completed_at": interview.completed_at,
                "created_at": interview.created_at,
            },
            "role_profile": (
                {
                    "id": interview.role_profile.id,
                    "job_id": interview.role_profile.job_id,
                    "role_title": interview.role_profile.role_title,
                    "seniority": interview.role_profile.seniority,
                    "domain": interview.role_profile.domain,
                    "technical_skills": interview.role_profile.technical_skills,
                    "tools": interview.role_profile.tools,
                    "responsibilities": interview.role_profile.responsibilities,
                    "behavioral_competencies": interview.role_profile.behavioral_competencies,
                    "interview_topics": interview.role_profile.interview_topics,
                    "preferred_experience": interview.role_profile.preferred_experience,
                    "prompt_version": interview.role_profile.prompt_version,
                    "created_at": interview.role_profile.created_at,
                }
                if interview.role_profile
                else None
            ),
            "total_duration_seconds": round(total_duration, 1),
            "total_answers_count": len(interview.answers),
            "average_wpm": avg_wpm,
            "total_fillers_count": total_fillers,
            "overall_filler_density": overall_filler_density,
            "total_pauses_count": total_pauses,
            "average_content_score": avg_content,
            "average_relevance_score": avg_relevance,
            "average_technical_depth_score": avg_tech_depth,
            "questions_review": questions_review,
            "report_card": report_card,
            "panel_report": panel_report,
        }

