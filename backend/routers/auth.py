from fastapi import APIRouter, Request, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
from datetime import datetime, timezone
import httpx
import logging

from config import settings
from core.supabase import supabase
from core.limiter import limiter
from models.auth import (
    UserCreate, UserLogin, UserUpdate, PushTokenUpdate,
    NotificationPreferencesUpdate,
    ForgotPasswordRequest, ValidateTokenRequest, ResetPasswordRequest
)
from dependencies.auth import get_current_user, user_profile_cache

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def _upsert_user_profile(user_id: str, profile_data: dict) -> None:
    """
    Write the user profile to public.users using the service role.
    Attempts INSERT first; falls back to UPDATE on conflict.
    Raises RuntimeError if both fail so the caller can respond appropriately.
    """
    # First, try a straight insert
    insert_resp = await supabase.request(
        "POST",
        "rest/v1/users",
        json=profile_data,
        service_role=True,
    )
    if insert_resp.status_code in (200, 201):
        return  # success

    # 409 = duplicate (profile already exists) — try PATCH instead
    if insert_resp.status_code == 409:
        patch_resp = await supabase.request(
            "PATCH",
            f"rest/v1/users?id=eq.{user_id}",
            json={k: v for k, v in profile_data.items() if k != "id"},
            service_role=True,
        )
        if patch_resp.status_code in (200, 201, 204):
            return  # upsert succeeded
        logger.error(
            "Profile upsert (PATCH) failed for user %s: %s %s",
            user_id,
            patch_resp.status_code,
            patch_resp.text,
        )
        raise RuntimeError(f"Profile upsert failed: {patch_resp.status_code}")

    logger.error(
        "Profile insert failed for user %s: %s %s",
        user_id,
        insert_resp.status_code,
        insert_resp.text,
    )
    raise RuntimeError(f"Profile insert failed: {insert_resp.status_code}")


@router.post("/signup")
@limiter.limit("3/minute")
async def signup(request: Request, user: UserCreate):
    """
    Sign up a new user.

    Response codes:
    - 200  → Signup complete, session returned (email confirmation disabled).
    - 202  → Signup initiated, email confirmation required.
           Body: { "code": "EMAIL_CONFIRMATION_REQUIRED", "message": "..." }
    - 400  → Validation error (already registered, bad email, etc.)
    - 429  → Rate limited.
    """
    # 1. Create auth user in Supabase
    response = await supabase.request("POST", "auth/v1/signup", json={
        "email": user.email,
        "password": user.password,
    })

    # Supabase may return 200 even for some error conditions — check body
    auth_data = response.json() if response.status_code in (200, 201) else {}

    # Detect "user already registered" embedded in a 200 body
    if response.status_code in (200, 201) and isinstance(auth_data, dict):
        body_error = auth_data.get("error") or auth_data.get("msg", "")
        if "already registered" in str(body_error).lower() or "already" in str(body_error).lower():
            raise HTTPException(
                status_code=400,
                detail={"code": "ALREADY_REGISTERED", "message": "An account with this email already exists."},
            )

    if response.status_code not in (200, 201):
        error_data = auth_data if auth_data else {}
        error_msg = (
            error_data.get("msg")
            or error_data.get("error_description")
            or error_data.get("message")
            or "Signup failed"
        )
        if "rate limit" in str(error_msg).lower():
            raise HTTPException(status_code=429, detail="Too many signup attempts. Please wait.")
        if "already registered" in str(error_msg).lower() or "already" in str(error_msg).lower():
            raise HTTPException(
                status_code=400,
                detail={"code": "ALREADY_REGISTERED", "message": "An account with this email already exists."},
            )
        raise HTTPException(status_code=400, detail={"code": "SIGNUP_FAILED", "message": error_msg})

    user_id = auth_data.get("user", {}).get("id") if isinstance(auth_data.get("user"), dict) else None

    # 2. Write profile to public.users
    if user_id:
        profile_data = {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "phone": user.phone,
            "role": user.role.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            await _upsert_user_profile(user_id, profile_data)
        except RuntimeError as exc:
            # Auth account was created but profile failed — this is a partial failure.
            # Log it but do NOT return success; surface a specific error so the user can retry.
            logger.error("Signup partial failure for %s: %s", user.email, exc)
            raise HTTPException(
                status_code=500,
                detail={
                    "code": "PROFILE_CREATION_FAILED",
                    "message": "Account created but profile setup failed. Please contact support.",
                },
            )

    # 3. Detect email-confirmation-required (session is null)
    session = auth_data.get("session")
    if session is None:
        # Supabase email confirmation is enabled — user must verify before logging in.
        # Return HTTP 202 Accepted so mobile can show "Check your email" UI.
        return JSONResponse(
            status_code=202,
            content={
                "code": "EMAIL_CONFIRMATION_REQUIRED",
                "message": "Please check your email and click the confirmation link to activate your account.",
                "user": auth_data.get("user"),
            },
        )

    # 4. Success with immediate session
    return {
        "message": "Signup successful",
        "user": auth_data.get("user"),
        "session": session,
    }


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, user: UserLogin):
    """
    Login and return a session.
    Always includes a flat `profile` object with `role` for mobile navigation.
    """
    response = await supabase.request("POST", "auth/v1/token?grant_type=password", json={
        "email": user.email,
        "password": user.password,
    })

    if response.status_code != 200:
        error_data = response.json()
        error_msg = (
            error_data.get("error_description")
            or error_data.get("message")
            or "Invalid email or password"
        )
        # Surface email-not-confirmed specifically
        if "email not confirmed" in str(error_msg).lower():
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "EMAIL_NOT_CONFIRMED",
                    "message": "Please confirm your email address before logging in.",
                },
            )
        raise HTTPException(
            status_code=401,
            detail={"code": "LOGIN_FAILED", "message": error_msg},
        )

    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id") if isinstance(auth_data.get("user"), dict) else None
    access_token = auth_data.get("access_token")

    # Fetch the public profile (includes `role`) and merge it into the response.
    # This ensures the mobile client always has the correct role for navigation.
    profile: dict | None = None
    if user_id and access_token:
        profile_response = await supabase.request(
            "GET",
            f"rest/v1/users?id=eq.{user_id}&select=*",
            token=access_token,
        )
        if profile_response.status_code == 200:
            profiles = profile_response.json()
            if profiles:
                profile = profiles[0]
            else:
                # Profile row missing — attempt auto-repair using service role
                logger.warning("Login: profile missing for user %s — attempting auto-repair", user_id)
                supabase_user = auth_data.get("user", {})
                fallback_profile = {
                    "id": user_id,
                    "email": supabase_user.get("email", ""),
                    "name": supabase_user.get("user_metadata", {}).get("name", ""),
                    "role": supabase_user.get("user_metadata", {}).get("role", "customer"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                try:
                    await _upsert_user_profile(user_id, fallback_profile)
                    profile = fallback_profile
                except RuntimeError:
                    logger.error("Auto-repair profile failed for user %s on login", user_id)

    # Build a clean, flat response the mobile client can depend on
    return {
        "access_token": access_token,
        "token_type": auth_data.get("token_type", "bearer"),
        "expires_in": auth_data.get("expires_in"),
        "refresh_token": auth_data.get("refresh_token"),
        "user": auth_data.get("user"),
        "profile": profile,  # Our public.users row — always has `role`
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.patch("/profile")
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    response = await supabase.request("PATCH", f"rest/v1/users?id=eq.{user_id}", json=update_data, token=token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    
    user_profile_cache.pop(user_id, None)
    return {"message": "Profile updated"}

@router.patch("/notification-preferences")
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No preferences to update")
    response = await supabase.request(
        "PATCH",
        f"rest/v1/users?id=eq.{user_id}",
        json=update_data,
        token=token,
    )
    if response.status_code not in (200, 201, 204):
        raise HTTPException(status_code=400, detail="Failed to update notification preferences")
    user_profile_cache.pop(user_id, None)
    logger.info("[PushPrefs] updated user_id=%s keys=%s", user_id, list(update_data.keys()))
    return {"message": "Notification preferences updated"}

@router.post("/push-token")
async def register_push_token(data: PushTokenUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    response = await supabase.request("PATCH", f"rest/v1/users?id=eq.{user_id}", json={"push_token": data.push_token}, token=token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to register push token")
    
    return {"message": "Push token registered successfully"}

@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    site_base = settings.PUBLIC_SITE_URL.rstrip("/")
    redirect_to = f"{site_base}/reset-password"
    response = await supabase.request(
        "POST",
        "auth/v1/recover",
        json={"email": data.email, "redirect_to": redirect_to},
    )
    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="Too many reset attempts.")
    # Always return success to avoid email enumeration (Supabase may return 200 even if email unknown)
    return {"message": "If an account exists, a reset link has been sent", "redirect_to": redirect_to}

@router.post("/validate-reset-token")
async def validate_reset_token(data: ValidateTokenRequest):
    """Check recovery session token before showing reset-password form (SPA flow)."""
    r = await supabase.request("GET", "auth/v1/user", token=data.token)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    response = await supabase.request("PUT", "auth/v1/user", token=data.token, json={"password": data.password})
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to reset password")
    return {"message": "Password reset successful"}


@router.delete("/account")
@limiter.limit("3/hour")
async def delete_account(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Permanently delete the authenticated user's account and associated data.
    Cascades via FK (public.users → auth.users ON DELETE CASCADE).
    Required for Google Play account-deletion policy.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    response = await supabase.request(
        "DELETE",
        f"auth/v1/admin/users/{user_id}",
        service_role=True,
    )

    if response.status_code not in (200, 204):
        logger.error(
            "Account deletion failed for user %s: %s %s",
            user_id,
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=500,
            detail={
                "code": "ACCOUNT_DELETION_FAILED",
                "message": "Could not delete your account. Please try again or contact admin@audentix.com.",
            },
        )

    return {"message": "Account deleted successfully"}
