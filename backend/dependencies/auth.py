from fastapi import Header, HTTPException, Depends
import jwt
import logging
from cachetools import TTLCache
from config import settings
from core.supabase import supabase

logger = logging.getLogger("trimit")

# Senior Architect: Cache user profiles to reduce database round-trips (Audit A8)
# maxsize=1000 users, TTL=5 minutes
user_profile_cache = TTLCache(maxsize=1000, ttl=300)

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    
    # 1. High-Performance Path: Local JWT Validation
    # Senior Architect: This avoids hitting the network for every request if we have the secret.
    if settings.JWT_SECRET and settings.JWT_SECRET != "your-secret-key-change-this-in-production":
        try:
            # Decode using HS256 (Supabase default)
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET, 
                algorithms=["HS256"], 
                audience="authenticated"
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token payload")
            
            # Check cache for profile
            if user_id in user_profile_cache:
                return user_profile_cache[user_id]
            
            # Fetch profile if not in cache (using USER token to respect RLS)
            # Use the new Supabase wrapper
            response = await supabase.request("GET", f"rest/v1/users?id=eq.{user_id}&select=*", token=token)
            
            if response.status_code == 200:
                profiles = response.json()
                if profiles:
                    user_data = {
                        "id": user_id, 
                        "email": payload.get("email"), 
                        "profile": profiles[0], 
                        "access_token": token
                    }
                    user_profile_cache[user_id] = user_data
                    return user_data
            
            logger.warning(f"Profile not found in DB for valid JWT user: {user_id}")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            logger.error(f"JWT Validation error: {str(e)}")
            # Fallthrough to verify with Supabase Auth directly if local check fails unexpectedly
            pass

    # 2. Reliability Path: Verify with Supabase Auth directly
    # This is slower but more robust if local validation fails or secret is missing.
    try:
        response = await supabase.request("GET", "auth/v1/user", token=token)
        if response.status_code == 200:
            user_info = response.json()
            user_id = user_info.get("id")
            
            # Re-fetch profile
            profile_response = await supabase.request("GET", f"rest/v1/users?id=eq.{user_id}&select=*", token=token)
            if profile_response.status_code == 200:
                profiles = profile_response.json()
                if profiles:
                    user_data = {
                        "id": user_id,
                        "email": user_info.get("email"),
                        "profile": profiles[0],
                        "access_token": token
                    }
                    return user_data
        
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        logger.error(f"Supabase Auth verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
