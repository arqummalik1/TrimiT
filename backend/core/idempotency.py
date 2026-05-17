from fastapi import Request, HTTPException, status
from functools import wraps
import json
import logging
import asyncio
from core.supabase import supabase

logger = logging.getLogger("trimit")

IDEMPOTENCY_PROCESSING_STATUS = 102
IDEMPOTENCY_PROCESSING_BODY = {"_idempotency": "processing"}


def idempotency_required(required: bool = False):
    """
    Decorator to enforce idempotency on POST requests.
    Expects 'Idempotency-Key' header; when required=True, missing header returns 400.
    Cache key includes request_path to prevent cross-endpoint replay.
    """

    def decorator(func):
        return _idempotency_wrapper(func, required=required)

    if callable(required):
        func = required
        return _idempotency_wrapper(func, required=False)

    return decorator


async def _fetch_idempotency_row(user_id: str, idempotency_key: str, path: str) -> dict | None:
    response = await supabase.request(
        "GET",
        f"rest/v1/idempotency_keys?user_id=eq.{user_id}&idempotency_key=eq.{idempotency_key}&request_path=eq.{path}&select=response_status,response_body",
        service_role=True,
    )
    if response.status_code == 200:
        rows = response.json()
        if rows:
            return rows[0]
    return None


async def _store_idempotency_result(
    user_id: str, idempotency_key: str, path: str, status_code: int, body: object
) -> None:
    await supabase.request(
        "PATCH",
        f"rest/v1/idempotency_keys?user_id=eq.{user_id}&idempotency_key=eq.{idempotency_key}&request_path=eq.{path}",
        service_role=True,
        json={"response_status": status_code, "response_body": body},
    )


def _idempotency_wrapper(func, required: bool = False):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        from fastapi.responses import JSONResponse

        request: Request = kwargs.get("request")
        if not request:
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

        if not request:
            logger.error("Request object not found in idempotent endpoint")
            return await func(*args, **kwargs)

        idempotency_key = request.headers.get("Idempotency-Key")
        if not idempotency_key:
            if required:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Idempotency-Key header is required",
                )
            return await func(*args, **kwargs)

        current_user = kwargs.get("current_user")
        if not current_user:
            logger.warning("current_user not found in idempotent endpoint, skipping check")
            return await func(*args, **kwargs)

        user_id = current_user.get("id")
        path = request.url.path

        try:
            insert_resp = await supabase.request(
                "POST",
                "rest/v1/idempotency_keys",
                service_role=True,
                json={
                    "user_id": user_id,
                    "idempotency_key": idempotency_key,
                    "request_path": path,
                    "response_status": IDEMPOTENCY_PROCESSING_STATUS,
                    "response_body": IDEMPOTENCY_PROCESSING_BODY,
                },
            )

            claimed = insert_resp.status_code in (200, 201)

            if not claimed:
                for _ in range(15):
                    cached = await _fetch_idempotency_row(user_id, idempotency_key, path)
                    if not cached:
                        break
                    if cached.get("response_status") != IDEMPOTENCY_PROCESSING_STATUS:
                        logger.info("Idempotency hit for %s:%s", user_id, idempotency_key)
                        return JSONResponse(
                            status_code=cached["response_status"],
                            content=cached["response_body"],
                            headers={"X-Idempotency-Hit": "true"},
                        )
                    await asyncio.sleep(0.1)

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "IDEMPOTENCY_IN_PROGRESS",
                        "message": "An identical request is still processing. Please retry shortly.",
                    },
                )

            try:
                result = await func(*args, **kwargs)
            except Exception:
                await supabase.request(
                    "DELETE",
                    f"rest/v1/idempotency_keys?user_id=eq.{user_id}&idempotency_key=eq.{idempotency_key}&request_path=eq.{path}&response_status=eq.{IDEMPOTENCY_PROCESSING_STATUS}",
                    service_role=True,
                )
                raise

            status_code: int | None = None
            body: object = {}

            if isinstance(result, JSONResponse):
                status_code = result.status_code
                raw = result.body
                body = json.loads(raw.decode()) if isinstance(raw, bytes) else raw
            elif isinstance(result, dict):
                status_code = 201
                body = result
                result = JSONResponse(status_code=status_code, content=body)
            elif hasattr(result, "status_code"):
                status_code = result.status_code
                if hasattr(result, "body"):
                    raw = result.body
                    body = json.loads(raw.decode()) if isinstance(raw, bytes) else raw

            if status_code is not None and status_code < 500:
                try:
                    await _store_idempotency_result(
                        user_id, idempotency_key, path, status_code, body
                    )
                except Exception as e:
                    logger.error("Failed to store idempotency key: %s", str(e))

            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Idempotency layer failed: %s", str(e))
            return await func(*args, **kwargs)

    return wrapper
