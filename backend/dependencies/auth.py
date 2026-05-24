from fastapi import Header, HTTPException, Depends
import jwt
import logging
from typing import Optional
from cachetools import TTLCache
from config import settings
from core.supabase import supabase
from services.user_profile import resolve_profile_for_user

logger = logging.getLogger("trimit")

user_profile_cache = TTLCache(maxsize=1000, ttl=300)


def _build_cached_user_data(
    user_id: str,
    email: Optional[str],
    profile_row: dict,
    access_token: str,
) -> dict:
    return {
        "id": user_id,
        "email": email,
        "profile": profile_row,
        # Always use the token from the current request so cache hits never
        # replay a stale pre-refresh access token.
        "access_token": access_token,
    }


def try_get_user_id_from_authorization(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        return None

    if settings.JWT_SECRET and settings.JWT_SECRET != "your-secret-key-change-this-in-production":
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            sub = payload.get("sub")
            return str(sub) if sub else None
        except jwt.PyJWTError:
            # Narrowed from a bare-except. PyJWTError is the documented base for
            # every PyJWT exception (Expired, InvalidAudience, DecodeError, …);
            # truly unexpected errors should surface, not be silently None'd.
            return None

    if settings.ENVIRONMENT != "production":
        try:
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False, "verify_exp": False},
            )
            sub = payload.get("sub")
            return str(sub) if sub else None
        except Exception:
            logger.warning("try_get_user_id_from_authorization: unverified decode failed")
    return None


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization.replace("Bearer ", "")

    if settings.ENVIRONMENT == "production":
        if not settings.JWT_SECRET or settings.JWT_SECRET == "your-secret-key-change-this-in-production":
            logger.error("JWT_SECRET is not configured for production")
            raise HTTPException(status_code=500, detail="Authentication misconfigured")

    if settings.JWT_SECRET and settings.JWT_SECRET != "your-secret-key-change-this-in-production":
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token payload")

            if user_id in user_profile_cache:
                cached = user_profile_cache[user_id]
                return _build_cached_user_data(
                    user_id,
                    cached.get("email"),
                    cached.get("profile"),
                    token,
                )

            profile_row = await resolve_profile_for_user(
                user_id,
                payload.get("email", "") or "",
                payload.get("user_metadata"),
                user_jwt=token,
            )

            user_data = _build_cached_user_data(
                user_id,
                payload.get("email"),
                profile_row,
                token,
            )
            user_profile_cache[user_id] = user_data
            return user_data

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("JWT Validation error: %s", str(e))

    try:
        response = await supabase.request("GET", "auth/v1/user", token=token)
        if response.status_code == 200:
            user_info = response.json()
            user_id = user_info.get("id")

            profile_row = await resolve_profile_for_user(
                user_id,
                user_info.get("email", "") or "",
                user_info.get("user_metadata"),
                user_jwt=token,
            )

            user_data = _build_cached_user_data(
                user_id,
                user_info.get("email"),
                profile_row,
                token,
            )
            user_profile_cache[user_id] = user_data
            return user_data

        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase Auth verification failed: %s", str(e))
        raise HTTPException(status_code=401, detail="Could not validate credentials")
