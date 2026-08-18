"""
APTLY API — Interview Endpoints
"""

from __future__ import annotations

import json
from typing import Annotated, Any
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.idempotency import get_idempotency_key
from app.core.security import AuthenticatedUser
from app.dependencies import (
    get_db,
    get_llm_provider,
    get_optional_current_user,
    get_storage,
    get_transcription_provider,
)
from app.schemas.interviews import (
    AnswerCreateRequest,
    AnswerResponse,
    ContentMetricsResponse,
    InterviewCreateRequest,
    InterviewDetailResponse,
    InterviewReviewResponse,
    QuestionExplanationRequest,
    QuestionExplanationResponse,
    QuestionResponse,
    SpeechMetricsResponse,
    TranscriptResponse,
    VisionMetricsResponse,
)
from app.schemas.panel import get_persona_profile
from app.services.interview_service import InterviewService
from app.services.providers.base import LLMProvider, TranscriptionProvider
from app.services.storage.base import StorageProvider

router = APIRouter(prefix="/interviews", tags=["Interviews"])


def _ensure_interview_access(
    interview: Any,
    user: AuthenticatedUser | None,
) -> None:
    """Require the authenticated owner or the exact guest session identity."""
    owner_id = getattr(interview, "user_id", None)
    learner_id = getattr(interview, "learner_id", "anonymous")
    if owner_id:
        if not user or user.id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ACCESS_DENIED",
                    "message": "You do not have permission to access this private interview session.",
                },
            )
        return
    if learner_id != "anonymous" and (not user or user.id != learner_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCESS_DENIED",
                "message": "This guest interview belongs to a different browser session.",
            },
        )


def _get_interview_service(
    db: AsyncSession = Depends(get_db),
    llm_provider: LLMProvider = Depends(get_llm_provider),
    transcription_provider: TranscriptionProvider = Depends(get_transcription_provider),
    storage_provider: StorageProvider = Depends(get_storage),
) -> InterviewService:
    return InterviewService(
        db_session=db,
        llm_provider=llm_provider,
        transcription_provider=transcription_provider,
        storage_provider=storage_provider,
    )


@router.get(
    "",
    response_model=list[InterviewDetailResponse],
    summary="List interviews",
    description="Lists interviews created by the current user (or public practice sessions).",
)
async def list_interviews(
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> list[InterviewDetailResponse]:
    """Retrieve list of interviews for the authenticated user."""
    user_id = user.id if user else None
    interviews = await service.list_interviews(user_id=user_id)
    return [_to_detail_response(inv) for inv in interviews]


@router.post(
    "",
    response_model=InterviewDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and configure interview",
    description="Creates an interview session and dynamically generates tailored questions.",
)
async def create_interview(
    payload: InterviewCreateRequest,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
    idempotency_key: UUID | None = Depends(get_idempotency_key),
) -> InterviewDetailResponse:
    """Create a new practice interview session."""
    user_id = user.id if user else None
    interview = await service.create_interview(
        title=payload.title,
        interview_type=payload.interview_type,
        difficulty_level=payload.difficulty_level,
        target_duration_minutes=payload.target_duration_minutes,
        question_count=payload.question_count,
        job_id=payload.job_id,
        role_profile_id=payload.role_profile_id,
        user_id=user_id,
        is_panel_mode=payload.is_panel_mode,
    )

    detail = await service.get_interview_detail(interview.id)
    if not detail:
        raise HTTPException(status_code=500, detail="Failed to load created interview.")

    return _to_detail_response(detail)


@router.get(
    "/{interview_id}",
    response_model=InterviewDetailResponse,
    summary="Get interview details",
    description="Fetches an interview, its active state, generated questions, and answers.",
)
async def get_interview(
    interview_id: UUID,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> InterviewDetailResponse:
    """Retrieve full interview details."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INTERVIEW_NOT_FOUND",
                "message": f"Interview '{interview_id}' not found.",
            },
        )

    # Privacy Check: Enforce user ownership if interview is user-bound
    _ensure_interview_access(detail, user)

    return _to_detail_response(detail)


@router.post(
    "/{interview_id}/start",
    response_model=InterviewDetailResponse,
    summary="Start interview session",
    description="Transitions the interview to active/running state and activates Question 1.",
)
async def start_interview(
    interview_id: UUID,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> InterviewDetailResponse:
    """Start the live interview."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"code": "INTERVIEW_NOT_FOUND", "message": "Interview not found."})
    _ensure_interview_access(detail, user)
    interview = await service.start_interview(interview_id)
    return _to_detail_response(interview)


@router.delete(
    "/{interview_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an interview and its media",
)
async def delete_interview(
    interview_id: UUID,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> Response:
    """Permanently remove media and hide the interview metadata."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"code": "INTERVIEW_NOT_FOUND", "message": "Interview not found."})
    _ensure_interview_access(detail, user)
    await service.delete_interview(interview_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{interview_id}/answers",
    response_model=AnswerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create answer record",
    description="Initializes a candidate answer recording for a question.",
)
async def create_answer(
    interview_id: UUID,
    payload: AnswerCreateRequest,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> AnswerResponse:
    """Create an answer record."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"code": "INTERVIEW_NOT_FOUND", "message": "Interview not found."})
    _ensure_interview_access(detail, user)
    answer = await service.create_answer(interview_id, payload.question_id)
    return _to_answer_response(answer)


@router.post(
    "/{interview_id}/answers/{answer_id}/upload",
    response_model=AnswerResponse,
    summary="Upload answer audio",
    description="Uploads binary audio recording (WebM/WAV) and triggers async speech processing.",
)
async def upload_answer_audio(
    interview_id: UUID,
    answer_id: UUID,
    audio_file: Annotated[UploadFile, File(description="Binary audio/video recording file")],
    duration_seconds: Annotated[
        float, Form(description="Total recorded duration in seconds")
    ] = 0.0,
    transcript_text: Annotated[
        str | None, Form(description="Optional live candidate speech transcript")
    ] = None,
    vision_metrics_json: Annotated[
        str | None, Form(description="Optional privacy-safe browser vision telemetry JSON")
    ] = None,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> AnswerResponse:
    """Upload recorded audio/video and process transcript, speech, content, and vision metrics."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"code": "INTERVIEW_NOT_FOUND", "message": "Interview not found."})
    _ensure_interview_access(detail, user)

    from app.core.security import (
        ALLOWED_MEDIA_MIME_TYPES,
        MAX_UPLOAD_SIZE_BYTES,
        validate_media_mime_type,
        validate_media_size,
    )

    content_type = (audio_file.content_type or "audio/webm").split(";")[0].strip().lower()
    if not validate_media_mime_type(content_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "code": "INVALID_MEDIA_TYPE",
                "message": f"Unsupported media type '{content_type}'. Allowed types: {sorted(ALLOWED_MEDIA_MIME_TYPES)}",
            },
        )

    audio_data = await audio_file.read()
    if len(audio_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMPTY_AUDIO_RECORDING",
                "message": "Uploaded audio payload is empty.",
            },
        )

    if not validate_media_size(len(audio_data)):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "PAYLOAD_TOO_LARGE",
                "message": f"Uploaded file exceeds maximum limit of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB.",
            },
        )

    vision_metrics: dict[str, Any] | None = None
    if vision_metrics_json:
        try:
            parsed_vision = json.loads(vision_metrics_json)
            if isinstance(parsed_vision, dict):
                vision_metrics = parsed_vision
        except json.JSONDecodeError:
            # The recording itself is still useful. The server will persist an
            # explicit unavailable vision record rather than rejecting the answer.
            vision_metrics = None

    answer = await service.upload_and_process_answer(
        interview_id=interview_id,
        answer_id=answer_id,
        audio_data=audio_data,
        content_type=content_type,
        duration_seconds=duration_seconds,
        transcript_text=transcript_text,
        vision_metrics=vision_metrics,
    )
    return _to_answer_response(answer)


@router.post(
    "/{interview_id}/next-question",
    response_model=InterviewDetailResponse,
    summary="Advance to next question",
    description="Advances the interview to the next question index or marks it completed.",
)
async def next_question(
    interview_id: UUID,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> InterviewDetailResponse:
    """Advance to the next question."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"code": "INTERVIEW_NOT_FOUND", "message": "Interview not found."})
    _ensure_interview_access(detail, user)
    interview = await service.advance_question(interview_id)
    return _to_detail_response(interview)


@router.post(
    "/{interview_id}/finish",
    response_model=InterviewDetailResponse,
    summary="Finish interview session",
    description="Finalizes the interview and marks it complete.",
)
async def finish_interview(
    interview_id: UUID,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> InterviewDetailResponse:
    """Finish the interview."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"code": "INTERVIEW_NOT_FOUND", "message": "Interview not found."})
    _ensure_interview_access(detail, user)
    interview = await service.finish_interview(interview_id)
    return _to_detail_response(interview)


@router.post(
    "/{interview_id}/questions/{question_id}/explain",
    response_model=QuestionExplanationResponse,
    summary="Explain a question doubt",
    description="Explains the current interview question without giving away a full model answer.",
)
async def explain_question(
    interview_id: UUID,
    question_id: UUID,
    payload: QuestionExplanationRequest,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> QuestionExplanationResponse:
    """Let the candidate ask for clarification during a realistic interview."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"code": "INTERVIEW_NOT_FOUND", "message": "Interview not found."})
    _ensure_interview_access(detail, user)
    explanation = await service.explain_question(
        interview_id=interview_id,
        question_id=question_id,
        doubt=payload.doubt,
    )
    return QuestionExplanationResponse(**explanation)


@router.get(
    "/{interview_id}/review",
    response_model=InterviewReviewResponse,
    summary="Get post-interview review",
    description="Returns comprehensive speech metrics, transcripts, and question-by-question breakdown.",
)
async def get_interview_review(
    interview_id: UUID,
    service: InterviewService = Depends(_get_interview_service),
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
) -> InterviewReviewResponse:
    """Retrieve post-interview review data."""
    detail = await service.get_interview_detail(interview_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "INTERVIEW_NOT_FOUND",
                "message": f"Interview '{interview_id}' not found.",
            },
        )

    _ensure_interview_access(detail, user)

    review = await service.compile_review(interview_id)
    return InterviewReviewResponse(**review)


# ── Response Mappers ──────────────────────────────────────────────────────────


def _to_detail_response(interview: Any) -> InterviewDetailResponse:
    questions_res = [
        QuestionResponse(
            id=q.id,
            interview_id=q.interview_id,
            sequence_number=q.sequence_number,
            category=q.category,
            question_type=q.question_type,
            competency=q.competency,
            difficulty=q.difficulty,
            question_text=q.question_text,
            expected_topics=q.expected_topics,
            prompt_version=q.prompt_version,
            parent_question_id=q.parent_question_id,
            root_question_id=q.root_question_id,
            question_source=q.question_source,
            follow_up_depth=q.follow_up_depth,
            target_competency=q.target_competency,
            interviewer_persona=getattr(q, "interviewer_persona", None),
            persona_profile=get_persona_profile(getattr(q, "interviewer_persona", None)),
        )
        for q in getattr(interview, "questions", [])
    ]

    answers_res = [_to_answer_response(a) for a in getattr(interview, "answers", [])]
    is_panel = getattr(interview, "interview_type", "").lower() == "panel" or any(
        bool(getattr(q, "interviewer_persona", None)) for q in getattr(interview, "questions", [])
    )

    return InterviewDetailResponse(
        id=interview.id,
        title=interview.title,
        status=interview.status,
        interview_type=interview.interview_type,
        difficulty_level=interview.difficulty_level,
        target_duration_minutes=interview.target_duration_minutes,
        current_question_index=interview.current_question_index,
        is_panel_mode=is_panel,
        started_at=interview.started_at,
        completed_at=interview.completed_at,
        created_at=interview.created_at,
        questions=questions_res,
        answers=answers_res,
        role_profile=(
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
            if getattr(interview, "role_profile", None)
            else None
        ),
    )


def _to_answer_response(answer: Any) -> AnswerResponse:
    transcript_res = None
    if getattr(answer, "transcript", None):
        t = answer.transcript
        transcript_res = TranscriptResponse(
            id=t.id,
            answer_id=t.answer_id,
            full_text=t.full_text,
            word_count=t.word_count,
            language=t.language,
            segments=t.segments_json,
            words=t.words_json,
            model_provider=t.model_provider,
            model_version=t.model_version,
            quality_score=t.quality_score,
            provider_confidence=t.provider_confidence,
            source_agreement_score=t.source_agreement_score,
            quality_label=t.quality_label,
            quality_notes=t.quality_notes,
            created_at=t.created_at,
        )

    speech_metrics_res = None
    if getattr(answer, "speech_metrics", None):
        m = answer.speech_metrics
        speech_metrics_res = SpeechMetricsResponse(
            id=m.id,
            answer_id=m.answer_id,
            wpm=m.wpm,
            speaking_duration_seconds=m.speaking_duration_seconds,
            total_words=m.total_words,
            filler_count=m.filler_count,
            filler_density=m.filler_density,
            filler_words=m.filler_words_json,
            pause_count=m.pause_count,
            total_pause_seconds=m.total_pause_seconds,
            pauses=m.pauses_json,
            created_at=m.created_at,
        )

    content_metrics_res = None
    if getattr(answer, "content_metrics", None):
        cm = answer.content_metrics
        content_metrics_res = ContentMetricsResponse(
            id=cm.id,
            answer_id=cm.answer_id,
            question_type=cm.question_type,
            relevance_score=cm.relevance_score,
            technical_depth_score=cm.technical_depth_score,
            completeness_score=cm.completeness_score,
            structure_score=cm.structure_score,
            evidence_score=cm.evidence_score,
            overall_content_score=cm.overall_content_score,
            correctness_status=cm.correctness_status,
            correctness_score=cm.correctness_score,
            correctness_summary=cm.correctness_summary,
            topic_coverage=cm.topic_coverage_json,
            ideal_answer_outline=cm.ideal_answer_outline_json,
            strengths=cm.strengths_json,
            weaknesses=cm.weaknesses_json,
            star_analysis=cm.star_analysis_json,
            claims=cm.claims_json,
            evidence=cm.evidence_json,
            feedback=cm.feedback_json,
            practice_drills=cm.practice_drills_json,
            reasoning_summary=cm.reasoning_summary,
            provider=cm.provider,
            model=cm.model,
            prompt_version=cm.prompt_version,
            created_at=cm.created_at,
        )

    vision_metrics_res = None
    if getattr(answer, "vision_metrics", None):
        vm = answer.vision_metrics
        vision_metrics_res = VisionMetricsResponse(
            id=vm.id,
            answer_id=vm.answer_id,
            provider=vm.provider,
            model_version=vm.model_version,
            capability_status=vm.capability_status,
            frame_count=vm.frame_count,
            valid_frame_count=vm.valid_frame_count,
            analysis_duration_seconds=vm.analysis_duration_seconds,
            face_detected_ratio=vm.face_detected_ratio,
            multiple_people_ratio=vm.multiple_people_ratio,
            eye_contact_ratio=vm.eye_contact_ratio,
            face_centering_score=vm.face_centering_score,
            tracking_confidence=vm.tracking_confidence,
            visual_communication_score=vm.visual_communication_score,
            face_presence_events=vm.face_presence_events_json,
            strengths=vm.strengths_json,
            improvements=vm.improvements_json,
            created_at=vm.created_at,
        )

    return AnswerResponse(
        id=answer.id,
        interview_id=answer.interview_id,
        question_id=answer.question_id,
        sequence_number=answer.sequence_number,
        status=answer.status,
        duration_seconds=answer.duration_seconds,
        started_at=answer.started_at,
        ended_at=answer.ended_at,
        audio_storage_key=answer.audio_storage_key,
        video_storage_key=answer.video_storage_key,
        audio_size_bytes=answer.audio_size_bytes,
        video_size_bytes=answer.video_size_bytes,
        media_content_type=answer.media_content_type,
        media_has_video=answer.media_has_video,
        transcript=transcript_res,
        speech_metrics=speech_metrics_res,
        content_metrics=content_metrics_res,
        vision_metrics=vision_metrics_res,
        created_at=answer.created_at,
    )
