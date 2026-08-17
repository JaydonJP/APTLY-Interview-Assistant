"""
APTLY API — Interview Endpoint Stubs (Phase 0)

These route handlers document the planned API contract but return
501 Not Implemented in Phase 0.

Planned contracts:
    POST   /api/v1/interviews                    Create interview
    GET    /api/v1/interviews/{id}               Get interview
    POST   /api/v1/interviews/{id}/start         Start session
    POST   /api/v1/interviews/{id}/answers       Submit answer
    POST   /api/v1/interviews/{id}/finish        Finish session
    GET    /api/v1/interviews/{id}/report        Get report
    GET    /api/v1/progress                      Get progress

    WS     /api/v1/interviews/{id}/realtime      Realtime session (Phase 1)
    POST   /api/v1/jobs/analyze                  Analyze job description (Phase 1)
"""

from __future__ import annotations

from http import HTTPStatus
from uuid import UUID

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.common import ErrorDetail, ErrorResponse

router = APIRouter(tags=["Interviews"])


def _not_implemented(feature: str) -> JSONResponse:
    """Return a standard 501 Not Implemented response."""
    return JSONResponse(
        status_code=HTTPStatus.NOT_IMPLEMENTED,
        content=ErrorResponse(
            error=ErrorDetail(
                code="NOT_IMPLEMENTED",
                message=f"'{feature}' is not implemented in Phase 0. See docs/api/contracts.md.",
            )
        ).model_dump(),
    )


@router.post(
    "/interviews",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Create interview",
    description="Creates a new interview session. Requires job description or role profile.",
)
async def create_interview() -> JSONResponse:
    return _not_implemented("POST /api/v1/interviews")


@router.get(
    "/interviews/{interview_id}",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Get interview",
    description="Returns interview details, status, and question list.",
)
async def get_interview(interview_id: UUID) -> JSONResponse:
    return _not_implemented(f"GET /api/v1/interviews/{interview_id}")


@router.post(
    "/interviews/{interview_id}/start",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Start interview session",
    description="Transitions interview to active state. Returns first question.",
)
async def start_interview(interview_id: UUID) -> JSONResponse:
    return _not_implemented(f"POST /api/v1/interviews/{interview_id}/start")


@router.post(
    "/interviews/{interview_id}/answers",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Submit answer",
    description="Submits a recorded answer for async processing (transcription, analysis).",
)
async def submit_answer(interview_id: UUID) -> JSONResponse:
    return _not_implemented(f"POST /api/v1/interviews/{interview_id}/answers")


@router.post(
    "/interviews/{interview_id}/finish",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Finish interview",
    description="Marks interview complete and triggers async report generation.",
)
async def finish_interview(interview_id: UUID) -> JSONResponse:
    return _not_implemented(f"POST /api/v1/interviews/{interview_id}/finish")


@router.get(
    "/interviews/{interview_id}/report",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Get interview report",
    description="Returns the completed evaluation report with metrics and coaching.",
)
async def get_report(interview_id: UUID) -> JSONResponse:
    return _not_implemented(f"GET /api/v1/interviews/{interview_id}/report")


@router.get(
    "/progress",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Get user progress",
    description="Returns historical progress snapshots and trend data.",
)
async def get_progress() -> JSONResponse:
    return _not_implemented("GET /api/v1/progress")


@router.post(
    "/jobs/analyze",
    status_code=HTTPStatus.NOT_IMPLEMENTED,
    summary="[Phase 1] Analyze job description",
    description="Parses a job description and returns a structured role profile.",
)
async def analyze_job() -> JSONResponse:
    return _not_implemented("POST /api/v1/jobs/analyze")
