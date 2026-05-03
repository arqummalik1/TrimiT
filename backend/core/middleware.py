from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import uuid
import time
import hmac
import hashlib
import logging
import contextvars
from config import settings

logger = logging.getLogger("trimit")
request_id_var = contextvars.ContextVar("request_id", default=None)

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_var.set(request_id)
        
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        return response

class SignatureMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Exclude specific routes and non-mutating methods
        if request.method in ["POST", "PATCH", "PUT", "DELETE"]:
            # Standardize path for comparison
            path = request.url.path
            if path in ["/health", "/api/v1/auth/signup", "/api/v1/auth/login"] or path.startswith("/api/v1/health"):
                return await call_next(request)

            signature = request.headers.get("X-Trimit-Signature")
            timestamp_str = request.headers.get("X-Trimit-Timestamp")

            if not signature or not timestamp_str:
                logger.warning(f"Missing signature/timestamp for {request.method} {path}")
                return JSONResponse(status_code=403, content={"detail": "Missing security signature"})

            try:
                request_ts = int(timestamp_str)
                current_ts = int(time.time())
                
                # Tolerance: 5 minutes (300 seconds)
                if abs(current_ts - request_ts) > 300:
                    logger.warning(f"Signature expired. Request TS: {request_ts}, Server TS: {current_ts}, Diff: {abs(current_ts - request_ts)}s")
                    return JSONResponse(status_code=403, content={"detail": "Security timestamp expired"})
            except ValueError:
                return JSONResponse(status_code=403, content={"detail": "Invalid timestamp format"})

            # Reconstruct message for verification
            message = f"{request.method}|{path}|{timestamp_str}"
            expected = hmac.new(
                settings.API_SIGNING_SECRET.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(signature, expected):
                logger.error(f"Signature mismatch for {request.method} {path}")
                logger.debug(f"Expected signature for payload '{message}' failed validation")
                return JSONResponse(status_code=403, content={"detail": "Invalid signature"})

        return await call_next(request)
