import os
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import contextvars

logger = logging.getLogger("trimit")
request_id_var = contextvars.ContextVar("request_id", default=None)

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
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": code,
                    "message": exc.detail if isinstance(exc.detail, str) else "An error occurred",
                    "details": exc.detail if not isinstance(exc.detail, str) else {}
                },
                "request_id": request_id_var.get()
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Input validation failed",
                    "details": exc.errors()
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
