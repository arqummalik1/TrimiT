from fastapi import Header, HTTPException, Depends
import jwt
import logging
from datetime import datetime, timezone
from cachetools import TTLCache
from config import settings
from core.supabase import supabase

logger = logging.getLogger("trimit")

# Cache user profiles to reduce database round-trips (Audit A8)
# maxsize=1000 users, TTL=5 minutes
user_profile_cache = TTLCache(maxsize=1000, ttl=300)


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization.replace("Bearer ", "")

    # 1. High-Performance Path: Local JWT Validation
    # Avoids hitting the network for every request if we have the secret.
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

            # Check cache for profile
            if user_id in user_profile_cache:
                return user_profile_cache[user_id]

            # Fetch profile (using USER token to respect RLS)
            response = await supabase.request(
                "GET",
                f"rest/v1/users?id=eq.{user_id}&select=*",
                token=token,
            )

            if response.status_code == 200:
                profiles = response.json()
                if profiles:
                    user_data = {
                        "id": user_id,
                        "email": payload.get("email"),
                        "profile": profiles[0],
                        "access_token": token,
                    }
                    user_profile_cache[user_id] = user_data
                    return user_data

                # Profile row is missing for a valid JWT user.
                # Auto-create a minimal profile so the user is not permanently locked out.
                logger.warning(
                    "get_current_user: valid JWT but no profile for user %s — auto-creating", user_id
                )
                fallback_profile = {
                    "id": user_id,
                    "email": payload.get("email", ""),
                    "name": payload.get("email", "").split("@")[0],
                    "role": "customer",  # safe default — user can update via /auth/profile
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                try:
                    repair_resp = await supabase.request(
                        "POST",
                        "rest/v1/users",
                        json=fallback_profile,
                        service_role=True,
                    )
                    if repair_resp.status_code not in (200, 201, 409):
                        logger.error(
                            "Profile auto-repair failed for %s: %s", user_id, repair_resp.status_code
                        )
                except Exception as repair_err:
                    logger.error("Profile auto-repair exception for %s: %s", user_id, repair_err)

                # Return with the fallback profile even if repair failed — do not raise 401
                user_data = {
                    "id": user_id,
                    "email": payload.get("email"),
                    "profile": fallback_profile,
                    "access_token": token,
                }
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
            # Fallthrough to verify with Supabase Auth directly if local check fails unexpectedly

    # 2. Reliability Path: Verify with Supabase Auth directly
    # Slower but more robust if local validation fails or secret is missing.
    try:
        response = await supabase.request("GET", "auth/v1/user", token=token)
        if response.status_code == 200:
            user_info = response.json()
            user_id = user_info.get("id")

            # Re-fetch profile
            profile_response = await supabase.request(
                "GET",
                f"rest/v1/users?id=eq.{user_id}&select=*",
                token=token,
            )
            if profile_response.status_code == 200:
                profiles = profile_response.json()
                if profiles:
                    user_data = {
                        "id": user_id,
                        "email": user_info.get("email"),
                        "profile": profiles[0],
                        "access_token": token,
                    }
                    return user_data

                # Auto-repair: profile missing in the Supabase-auth verification path too
                logger.warning(
                    "get_current_user (Supabase path): profile missing for %s — auto-creating", user_id
                )
                fallback_profile = {
                    "id": user_id,
                    "email": user_info.get("email", ""),
                    "name": (user_info.get("email", "") or "").split("@")[0],
                    "role": "customer",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                try:
                    await supabase.request(
                        "POST",
                        "rest/v1/users",
                        json=fallback_profile,
                        service_role=True,
                    )
                except Exception:
                    pass  # Best-effort

                return {
                    "id": user_id,
                    "email": user_info.get("email"),
                    "profile": fallback_profile,
                    "access_token": token,
                }

        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Supabase Auth verification failed: %s", str(e))
        raise HTTPException(status_code=401, detail="Could not validate credentials")


