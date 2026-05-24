from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from dependencies.auth import try_get_user_id_from_authorization


def _get_forwarded_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first = forwarded_for.split(",")[0].strip()
        if first:
            return first
    real_ip = request.headers.get("x-real-ip", "").strip()
    return real_ip or None

def get_user_or_ip(request: Request) -> str:
    authorization = request.headers.get("authorization")
    user_id = try_get_user_id_from_authorization(authorization)
    if user_id:
        return f"user:{user_id}"

    forwarded_ip = _get_forwarded_ip(request)
    if forwarded_ip:
        return forwarded_ip

    return get_remote_address(request)

limiter = Limiter(key_func=get_user_or_ip)
