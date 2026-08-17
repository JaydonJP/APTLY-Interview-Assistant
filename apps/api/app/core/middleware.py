"""
APTLY API — Request ID Middleware

Injects a unique X-Request-ID header on every request/response.
The request ID is stored in a context variable so all log
statements within that request automatically include it.
"""

from __future__ import annotations

from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import set_request_id

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that assigns a unique ID to every incoming request.

    Behaviour:
    - If the client sends X-Request-ID, that value is used (useful for
      tracing from frontend through to backend).
    - Otherwise, a new UUID is generated.
    - The request ID is always reflected back in the response header.
    - The request ID is injected into the structlog context so every
      log line in that request automatically carries it.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid4())
        set_request_id(request_id)

        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
