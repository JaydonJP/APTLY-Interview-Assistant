"""
APTLY API — Interview Service & Endpoints Tests
"""

from __future__ import annotations

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.interview_service import InterviewService, InvalidStateTransitionError
from app.services.providers.mock_llm import MockLLMProvider
from app.services.providers.mock_transcription import MockTranscriptionProvider
from app.services.storage.local import LocalStorageProvider


@pytest.mark.asyncio
async def test_interview_state_machine_transitions(
    test_db_session: AsyncSession, tmp_path: Any
) -> None:
    service = InterviewService(
        db_session=test_db_session,
        llm_provider=MockLLMProvider(),
        transcription_provider=MockTranscriptionProvider(),
        storage_provider=LocalStorageProvider(root_dir=str(tmp_path)),
    )

    interview = await service.create_interview(
        title="Backend Engineering Mock",
        interview_type="technical",
        difficulty_level="medium",
        question_count=2,
    )
    assert interview.status == "ready"
    assert len(interview.questions) == 2

    # Valid transition: ready -> running -> question_active
    started = await service.start_interview(interview.id)
    assert started.status == "question_active"
    assert started.current_question_index == 0

    # Invalid transition directly to completed
    with pytest.raises(InvalidStateTransitionError):
        service.transition_state(interview, "completed")


@pytest.mark.asyncio
async def test_full_interview_endpoints_flow(client: AsyncClient) -> None:
    # 1. Analyze Job Description
    jd_payload = {
        "job_description": "Senior Python Developer with FastAPI and PostgreSQL expertise.",
        "title": "Senior Python Developer",
    }
    job_res = await client.post("/api/v1/jobs/analyze", json=jd_payload)
    assert job_res.status_code == 201
    job_data = job_res.json()
    job_id = job_data["id"]
    role_profile_id = job_data["role_profile"]["id"]

    # 2. Create Interview
    create_payload = {
        "job_id": job_id,
        "role_profile_id": role_profile_id,
        "title": "Senior Python Interview",
        "interview_type": "technical",
        "difficulty_level": "medium",
        "question_count": 2,
    }
    interview_res = await client.post("/api/v1/interviews", json=create_payload)
    assert interview_res.status_code == 201
    interview_data = interview_res.json()
    interview_id = interview_data["id"]
    assert interview_data["status"] == "ready"
    assert len(interview_data["questions"]) == 2

    # 3. Start Interview
    start_res = await client.post(f"/api/v1/interviews/{interview_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "question_active"
    question_1_id = interview_data["questions"][0]["id"]

    # 4. Create Answer for Question 1
    answer_res = await client.post(
        f"/api/v1/interviews/{interview_id}/answers",
        json={"question_id": question_1_id},
    )
    assert answer_res.status_code == 201
    answer_id = answer_res.json()["id"]

    # 5. Upload Audio Recording
    dummy_audio = b"RIFF....WAVEfmt ....data...." + (b"\x00" * 4000)
    upload_res = await client.post(
        f"/api/v1/interviews/{interview_id}/answers/{answer_id}/upload",
        files={"audio_file": ("answer.webm", dummy_audio, "audio/webm")},
        data={"duration_seconds": "12.5"},
    )
    assert upload_res.status_code == 200
    uploaded_data = upload_res.json()
    assert uploaded_data["status"] == "transcribed"
    assert uploaded_data["audio_storage_key"] is not None
    assert uploaded_data["transcript"] is not None
    assert uploaded_data["speech_metrics"] is not None
    assert uploaded_data["speech_metrics"]["wpm"] > 0

    # 6. Advance to Next Question
    next_res = await client.post(f"/api/v1/interviews/{interview_id}/next-question")
    assert next_res.status_code == 200
    assert next_res.json()["current_question_index"] == 1

    # 7. Complete Interview
    finish_res = await client.post(f"/api/v1/interviews/{interview_id}/finish")
    assert finish_res.status_code == 200
    assert finish_res.json()["status"] == "completed"

    # 8. Fetch Review Report
    review_res = await client.get(f"/api/v1/interviews/{interview_id}/review")
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["interview"]["status"] == "completed"
    assert len(review_data["questions_review"]) == 2
    assert review_data["total_answers_count"] == 1
    assert review_data["average_wpm"] > 0
    assert review_data["report_card"]["overall_score"] >= 0
    assert review_data["report_card"]["delivery"]["pace_label"]
    assert review_data["report_card"]["evidence_events"]
    assert review_data["report_card"]["correctness_score"] >= 0
    assert review_data["questions_review"][0]["content_metrics"]["topic_coverage"]

    # 9. Ask a contextual doubt and inspect durable learner progress.
    doubt_res = await client.post(
        f"/api/v1/interviews/{interview_id}/questions/{question_1_id}/explain",
        json={"doubt": "What trade-off should I mention?"},
    )
    assert doubt_res.status_code == 200
    assert doubt_res.json()["answer"]

    progress_res = await client.get("/api/v1/progress?learner_id=anonymous")
    assert progress_res.status_code == 200
    assert progress_res.json()["answers_reviewed"] == 1
    assert progress_res.json()["topics"]
