from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

def get_user_or_ip(request: Request) -> str:
    # Try to get user_id from the request state (set by Auth middleware)
    # If not present, fall back to remote IP
    user = getattr(request.state, "user", None)
    if user and isinstance(user, dict) and "id" in user:
        return f"user:{user['id']}"
    return get_remote_address(request)

limiter = Limiter(key_func=get_user_or_ip)
