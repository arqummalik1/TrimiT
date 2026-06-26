import os
from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

# Import the canonical ContextVar from the middleware so the request ID set in
# RequestIDMiddleware is visible to these exception handlers. Declaring a second
# ContextVar here previously caused all error responses to carry request_id: null.
from core.middleware import request_id_var

logger = logging.getLogger("trimit")

def setup_exception_handlers(app):
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # Determine a machine code from status
        status_to_code = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "VALIDATION_ERROR",
            429: "RATE_LIMIT_EXCEEDED"
        }
        code = status_to_code.get(exc.status_code, f"HTTP_{exc.status_code}")
        
        # If endpoints pass structured error detail as a dict, preserve it but also
        # surface a good human message for clients.
        detail_message = None
        detail_details = {}
        if isinstance(exc.detail, str):
            detail_message = exc.detail
        elif isinstance(exc.detail, dict):
            detail_message = exc.detail.get("message") or exc.detail.get("detail") or "An error occurred"
            detail_details = exc.detail
        else:
            detail_message = "An error occurred"
            detail_details = {"detail": exc.detail}

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": code,
                    "message": detail_message,
                    "details": detail_details
                },
                "request_id": request_id_var.get()
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Pydantic v2 can place a non-JSON-serializable object in an error's
        # ``ctx`` (e.g. the original ValueError raised by a custom
        # ``@field_validator``). Coerce every error to a JSON-safe form so a
        # validation failure always yields a structured 422 instead of crashing
        # the response renderer (which would surface as a 500).
        safe_errors = jsonable_encoder(exc.errors(), custom_encoder={Exception: str})
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Input validation failed",
                    "details": safe_errors
                },
                "request_id": request_id_var.get()
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled Exception: {str(exc)}")
        # Only include details in non-production environments
        details = str(exc) if os.getenv("ENVIRONMENT") != "production" else "Contact support"
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred.",
                    "details": details
                },
                "request_id": request_id_var.get()
            }
        )
