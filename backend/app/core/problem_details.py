"""RFC 7807 Problem Details 예외 핸들러 — design.md §4.0 Convention 준수."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

_PROBLEM_MEDIA_TYPE = "application/problem+json"
_DEFAULT_TYPE = "about:blank"

_TITLE_BY_STATUS = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    501: "Not Implemented",
}


def _problem_response(
    request: Request,
    status_code: int,
    detail: str | None = None,
    *,
    errors: list | None = None,
    headers: dict | None = None,
) -> JSONResponse:
    body: dict = {
        "type": _DEFAULT_TYPE,
        "title": _TITLE_BY_STATUS.get(status_code, "Error"),
        "status": status_code,
        "detail": detail or _TITLE_BY_STATUS.get(status_code, "Error"),
        "instance": str(request.url.path),
    }
    if errors is not None:
        body["errors"] = errors
    return JSONResponse(
        status_code=status_code,
        content=body,
        media_type=_PROBLEM_MEDIA_TYPE,
        headers=headers,
    )


def register_problem_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else None
        return _problem_response(
            request, exc.status_code, detail, headers=getattr(exc, "headers", None)
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _problem_response(
            request,
            422,
            "Request validation failed",
            errors=exc.errors(),
        )
