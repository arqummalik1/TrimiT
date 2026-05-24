from fastapi import Request, HTTPException, status
from functools import wraps
import json
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from core.supabase import supabase

logger = logging.getLogger("trimit")

IDEMPOTENCY_PROCESSING_STATUS = 102
IDEMPOTENCY_PROCESSING_BODY = {"_idempotency": "processing"}
IDEMPOTENCY_PROCESSING_TTL_SECONDS = 90
IDEMPOTENCY_RESULT_TTL_HOURS = 24


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
        f"rest/v1/idempotency_keys?user_id=eq.{user_id}&idempotency_key=eq.{idempotency_key}&request_path=eq.{path}&select=response_status,response_body,expires_at",
        service_role=True,
    )
    if response.status_code == 200:
        rows = response.json()
        if rows:
            return rows[0]
    return None


def _utc_iso_after(*, seconds: int = 0, hours: int = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds, hours=hours)).isoformat()


def _parse_expires_at(raw: object) -> datetime | None:
    if not raw:
        return None
    text = str(raw).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _is_processing_row_expired(row: dict | None) -> bool:
    if not row or row.get("response_status") != IDEMPOTENCY_PROCESSING_STATUS:
        return False
    expires_at = _parse_expires_at(row.get("expires_at"))
    return expires_at is not None and expires_at <= datetime.now(timezone.utc)


async def _delete_processing_row(user_id: str, idempotency_key: str, path: str) -> None:
    await supabase.request(
        "DELETE",
        f"rest/v1/idempotency_keys?user_id=eq.{user_id}&idempotency_key=eq.{idempotency_key}&request_path=eq.{path}&response_status=eq.{IDEMPOTENCY_PROCESSING_STATUS}",
        service_role=True,
    )


async def _claim_idempotency_slot(user_id: str, idempotency_key: str, path: str) -> bool:
    for _ in range(2):
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
                "expires_at": _utc_iso_after(seconds=IDEMPOTENCY_PROCESSING_TTL_SECONDS),
            },
        )
        if insert_resp.status_code in (200, 201):
            return True

        cached = await _fetch_idempotency_row(user_id, idempotency_key, path)
        if _is_processing_row_expired(cached):
            logger.warning("Deleting stale idempotency sentinel for %s:%s", user_id, idempotency_key)
            await _delete_processing_row(user_id, idempotency_key, path)
            continue
        return False
    return False


async def _store_idempotency_result(
    user_id: str, idempotency_key: str, path: str, status_code: int, body: object
) -> None:
    await supabase.request(
        "PATCH",
        f"rest/v1/idempotency_keys?user_id=eq.{user_id}&idempotency_key=eq.{idempotency_key}&request_path=eq.{path}",
        service_role=True,
        json={
            "response_status": status_code,
            "response_body": body,
            "expires_at": _utc_iso_after(hours=IDEMPOTENCY_RESULT_TTL_HOURS),
        },
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
            claimed = await _claim_idempotency_slot(user_id, idempotency_key, path)

            if not claimed:
                for _ in range(15):
                    cached = await _fetch_idempotency_row(user_id, idempotency_key, path)
                    if not cached:
                        break
                    if _is_processing_row_expired(cached):
                        await _delete_processing_row(user_id, idempotency_key, path)
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
                await _delete_processing_row(user_id, idempotency_key, path)
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
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "code": "IDEMPOTENCY_UNAVAILABLE",
                    "message": "The request could not be safely processed right now. Please retry.",
                },
            )

    return wrapper
