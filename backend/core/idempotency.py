from fastapi import Request, HTTPException, status
from functools import wraps
import json
import logging
from core.supabase import supabase
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

def idempotency_required(func):
    """
    Decorator to enforce idempotency on POST requests.
    Expects 'Idempotency-Key' header.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request: Request = kwargs.get("request")
        if not request:
            # Try to find it in args if not in kwargs (FastAPI injects it)
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
        
        if not request:
            logger.error("Request object not found in idempotent endpoint")
            return await func(*args, **kwargs)

        idempotency_key = request.headers.get("Idempotency-Key")
        if not idempotency_key:
            # For now, we allow it to be optional but log a warning
            # In a stricter version, we would raise an error
            return await func(*args, **kwargs)

        # We need the current user to isolate idempotency keys
        current_user = kwargs.get("current_user")
        if not current_user:
            # If not injected via Depends, we might need to fetch it
            # But usually it should be there
            logger.warning("current_user not found in idempotent endpoint, skipping check")
            return await func(*args, **kwargs)

        user_id = current_user.get("id")
        path = request.url.path

        # 1. Check if key exists
        try:
            response = await supabase.request(
                "GET", 
                f"rest/v1/idempotency_keys?user_id=eq.{user_id}&idempotency_key=eq.{idempotency_key}",
                service_role=True
            )
            
            if response.status_code == 200:
                keys = response.json()
                if keys:
                    cached = keys[0]
                    logger.info(f"Idempotency hit for {user_id}:{idempotency_key}")
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=cached["response_status"],
                        content=cached["response_body"],
                        headers={"X-Idempotency-Hit": "true"}
                    )
        except Exception as e:
            logger.error(f"Idempotency check failed: {str(e)}")
            # Fallback to normal execution if DB is down
            return await func(*args, **kwargs)

        # 2. Execute original function
        result = await func(*args, **kwargs)

        # 3. Store result (only for successful or business-level error responses)
        # We don't want to store 500s or 429s as idempotent results usually
        if hasattr(result, "status_code") and result.status_code < 500:
            try:
                # Store in DB
                # Note: JSONResponse content needs to be extracted
                body = result.body if hasattr(result, "body") else {}
                if isinstance(body, bytes):
                    body = json.loads(body.decode())

                await supabase.request(
                    "POST",
                    "rest/v1/idempotency_keys",
                    service_role=True,
                    json={
                        "user_id": user_id,
                        "idempotency_key": idempotency_key,
                        "request_path": path,
                        "response_status": result.status_code,
                        "response_body": body
                    }
                )
            except Exception as e:
                logger.error(f"Failed to store idempotency key: {str(e)}")

        return result

    return wrapper
