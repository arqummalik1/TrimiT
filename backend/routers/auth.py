from fastapi import APIRouter, Request, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
from datetime import datetime, timezone
import httpx
import logging
from cachetools import TTLCache

from config import settings
from core.supabase import supabase
from core.limiter import limiter
from models.auth import (
    UserCreate, UserLogin, UserUpdate, PushTokenUpdate,
    NotificationPreferencesUpdate,
    ResendConfirmationRequest,
    ForgotPasswordRequest,
    ConfirmEmailCallbackRequest,
    ValidateTokenRequest,
    ResetPasswordRequest,
    SendOtpRequest,
    VerifyOtpRequest,
)
from dependencies.auth import get_current_user, user_profile_cache
from services.auth_errors import map_supabase_signup_error, safe_auth_response_json
from services.user_profile import resolve_profile_for_user, upsert_user_profile, fetch_profile_service_role
from services.auth_signup import (
    try_idempotent_signup,
    perform_supabase_signup,
    perform_admin_signup,
    resend_confirmation_email,
    check_existing_signup_state,
    pending_confirmation_response,
    salvage_rate_limited_signup,
    login_with_password,
    _ensure_profile,
    admin_confirm_user,
    _fetch_auth_user_admin,
    _is_email_confirmed,
)

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/auth", tags=["Authentication"])

OTP_EMAIL_THROTTLE_SECONDS = 60
otp_email_throttle = TTLCache(maxsize=5000, ttl=OTP_EMAIL_THROTTLE_SECONDS)


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _enforce_otp_email_throttle(email: str) -> None:
    if email in otp_email_throttle:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "OTP_EMAIL_RATE_LIMIT",
                "message": "Please wait a minute before requesting another code for this email.",
            },
        )
    otp_email_throttle[email] = True


@router.post("/signup")
@limiter.limit("30/hour")
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
    # Idempotent path — do not call Supabase signup again if email is already pending
    existing = await try_idempotent_signup(user)
    if existing:
        status_code, body = existing
        if status_code == 202:
            return JSONResponse(status_code=202, content=body)
        raise HTTPException(status_code=status_code, detail=body)

    # Staging/dev: pre-confirmed admin user — no Supabase email (avoids project email quota)
    if settings.AUTH_AUTO_CONFIRM_SIGNUP:
        status_code, admin_user = await perform_admin_signup(user)
        if status_code not in (200, 201) or not admin_user.get("id"):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "SIGNUP_FAILED",
                    "message": "Could not create account. Try a different email or contact support.",
                },
            )
        user_id = admin_user["id"]
        await _ensure_profile(user_id, user)
        token_resp = await login_with_password(user.email, user.password)
        if token_resp.status_code != 200:
            return JSONResponse(
                status_code=202,
                content={
                    "code": "SIGNUP_READY_SIGN_IN",
                    "message": "Account created. Sign in with your email and password.",
                    "email": user.email.strip().lower(),
                },
            )
        auth_data = token_resp.json()
        profile = await resolve_profile_for_user(
            user_id,
            user.email,
            admin_user.get("user_metadata"),
            user_jwt=auth_data.get("access_token"),
        )
        return {
            "access_token": auth_data.get("access_token"),
            "token_type": auth_data.get("token_type", "bearer"),
            "expires_in": auth_data.get("expires_in"),
            "refresh_token": auth_data.get("refresh_token"),
            "user": admin_user,
            "profile": profile,
            "message": "Signup successful",
        }

    # 1. Create auth user in Supabase (role in user_metadata for post-confirm login/repair)
    response = await perform_supabase_signup(user)

    auth_data = safe_auth_response_json(response)

    # Detect "user already registered" embedded in a 200 body
    if response.status_code in (200, 201) and isinstance(auth_data, dict):
        body_error = auth_data.get("error") or auth_data.get("msg", "")
        if "already registered" in str(body_error).lower() or "already" in str(body_error).lower():
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "ALREADY_REGISTERED",
                    "message": "An account with this email already exists. Try signing in or use Forgot password.",
                },
            )

    if response.status_code not in (200, 201):
        err_code, err_msg = map_supabase_signup_error(response)
        logger.warning(
            "Supabase signup failed status=%s email=%s code=%s body=%s",
            response.status_code,
            user.email,
            err_code,
            auth_data,
        )

        # Rate limit / duplicate — recover gracefully if account is pending (no new email)
        if err_code in ("EMAIL_RATE_LIMIT", "RATE_LIMITED", "ALREADY_REGISTERED"):
            recovery = await try_idempotent_signup(user)
            if recovery:
                r_status, r_body = recovery
                if r_status == 202:
                    return JSONResponse(status_code=202, content=r_body)
                if r_status == 400:
                    raise HTTPException(status_code=400, detail=r_body)

            if err_code == "EMAIL_RATE_LIMIT":
                user_id_hint = None
                if isinstance(auth_data, dict):
                    nested = auth_data.get("user")
                    if isinstance(nested, dict):
                        user_id_hint = nested.get("id")
                salvaged = await salvage_rate_limited_signup(user, auth_user_id=user_id_hint)
                if salvaged:
                    s_code, s_body = salvaged
                    return JSONResponse(status_code=s_code, content=s_body)

                state = await check_existing_signup_state(user.email)
                if state and state[0] == "pending":
                    _, body = await pending_confirmation_response(
                        email=user.email.strip().lower(),
                        user_id=state[1],
                        message=(
                            "Your account is waiting for email confirmation. "
                            "Check your inbox and spam, or use Resend confirmation after a minute."
                        ),
                    )
                    return JSONResponse(status_code=202, content=body)

                raise HTTPException(
                    status_code=429,
                    detail={
                        "code": "AUTH_PROVIDER_EMAIL_QUOTA",
                        "message": (
                            "Supabase has paused confirmation emails for this project "
                            "(shared limit for all users). Wait about an hour, or configure "
                            "Custom SMTP under Supabase → Authentication → SMTP Settings. "
                            "Ten simultaneous signups need custom SMTP — not the default mailer."
                        ),
                    },
                )

        http_status = 429 if err_code in ("RATE_LIMITED", "EMAIL_RATE_LIMIT") else 400
        raise HTTPException(
            status_code=http_status,
            detail={"code": err_code, "message": err_msg},
        )

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
            saved = await upsert_user_profile(
                user_id, profile_data, prefer_incoming_role=True
            )
            logger.info(
                "Signup profile saved user=%s role=%s email=%s",
                user_id[:8],
                saved.get("role"),
                user.email,
            )
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

    # 3. Email confirmation required (session is null)
    session = auth_data.get("session")
    if session is None:
        if user_id:
            auth_row = await _fetch_auth_user_admin(user_id)
            if auth_row and not _is_email_confirmed(auth_row):
                if await admin_confirm_user(user_id):
                    _, body = await pending_confirmation_response(
                        email=user.email.strip().lower(),
                        user_id=user_id,
                        message=(
                            "Your account is ready. Confirmation email could not be sent "
                            "(provider limit), but we activated your account. Sign in with your password."
                        ),
                        code="SIGNUP_READY_SIGN_IN",
                    )
                    return JSONResponse(status_code=202, content=body)

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
    normalized_email = _normalize_email(user.email)
    response = await supabase.request("POST", "auth/v1/token?grant_type=password", json={
        "email": normalized_email,
        "password": user.password,
    })

    if response.status_code != 200:
        error_msg = "Invalid email or password"
        logger.info(
            "Login rejected status=%s email=%s",
            response.status_code,
            normalized_email,
        )
        raise HTTPException(
            status_code=401,
            detail={"code": "LOGIN_FAILED", "message": error_msg},
        )

    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id") if isinstance(auth_data.get("user"), dict) else None
    access_token = auth_data.get("access_token")

    profile: dict | None = None
    if user_id and access_token:
        supabase_user = auth_data.get("user", {}) if isinstance(auth_data.get("user"), dict) else {}
        user_profile_cache.pop(user_id, None)
        try:
            profile = await resolve_profile_for_user(
                user_id,
                supabase_user.get("email", normalized_email),
                supabase_user.get("user_metadata"),
                user_jwt=access_token,
            )
            logger.info(
                "Login profile resolved user=%s role=%s",
                user_id[:8],
                profile.get("role"),
            )
        except RuntimeError:
            logger.error("Login profile resolve failed for user %s", user_id)

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
    push_token = data.push_token

    if push_token is not None:
        t = push_token.strip()
        if not (
            t.startswith("ExponentPushToken[")
            or t.startswith("ExpoPushToken[")
        ):
            raise HTTPException(status_code=400, detail="Invalid Expo push token format")
        push_token = t

    response = await supabase.request(
        "PATCH",
        f"rest/v1/users?id=eq.{user_id}",
        json={"push_token": push_token},
        token=token,
    )

    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to register push token")

    user_profile_cache.pop(user_id, None)
    action = "registered" if push_token else "cleared"
    logger.info("[Push] token %s user_id=%s", action, user_id[:8] if user_id else "?")
    return {"message": f"Push token {action} successfully"}

@router.post("/confirm-email-callback")
@limiter.limit("30/hour")
async def confirm_email_callback(request: Request, data: ConfirmEmailCallbackRequest):
    """
    Server-side completion of signup email links (token_hash flow).
    Used when the web app cannot finish verification via the Supabase JS client alone.
    """
    if not data.token_hash and not data.token:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "MISSING_TOKEN",
                "message": "Missing verification token in callback.",
            },
        )

    otp_type = data.type if data.type in ("signup", "email", "recovery", "invite", "magiclink", "email_change") else "signup"
    payload: Dict[str, Any] = {"type": otp_type}
    if data.token_hash:
        payload["token_hash"] = data.token_hash
    if data.token:
        payload["token"] = data.token

    response = await supabase.request("POST", "auth/v1/verify", json=payload)
    if response.status_code not in (200, 201):
        logger.warning(
            "confirm_email_callback failed status=%s body=%s",
            response.status_code,
            response.text[:300] if response.text else "",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "code": "EMAIL_VERIFY_FAILED",
                "message": "This confirmation link is invalid or has expired. Request a new confirmation email from the app.",
            },
        )

    return {"success": True, "message": "Email confirmed"}


@router.post("/resend-confirmation")
@limiter.limit("6/hour")
async def resend_confirmation(request: Request, data: ResendConfirmationRequest):
    """Resend signup confirmation email (use instead of repeated signup taps)."""
    status_code, body = await resend_confirmation_email(data.email)
    if status_code == 200:
        return body
    raise HTTPException(status_code=status_code, detail=body)


@router.post("/forgot-password")
@limiter.limit("10/hour")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    site_base = settings.PUBLIC_SITE_URL.rstrip("/")
    redirect_to = data.redirect_to or f"{site_base}/reset-password"
    response = await supabase.request(
        "POST",
        "auth/v1/recover",
        json={
            "email": data.email.strip().lower(),
            "redirect_to": redirect_to,
            "options": {"email_redirect_to": redirect_to},
        },
    )
    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": (
                    "You've requested several password-reset emails. For security, new messages "
                    "are paused for about an hour. Check spam for an earlier email, then try once "
                    "more after an hour — repeated requests won't send more emails until then."
                ),
            },
        )
    if response.status_code >= 400:
        logger.warning(
            "forgot_password supabase status=%s email=%s body=%s",
            response.status_code,
            data.email,
            response.text[:200] if response.text else "",
        )
    # Always return success to avoid email enumeration (Supabase may return 200 even if email unknown)
    return {"message": "If an account exists, a reset link has been sent", "redirect_to": redirect_to}

@router.post("/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, data: SendOtpRequest):
    """Trigger email OTP delivery (password-less login or signup verification retry)"""
    email = _normalize_email(data.email)
    _enforce_otp_email_throttle(email)
    
    # Try with create_user=False first (login flow for existing users)
    response = await supabase.request("POST", "auth/v1/otp", json={
        "email": email,
        "create_user": False
    })
    
    # If Supabase returns 400 with "User not found" (or similar), try with create_user=True
    # This allows the OTP flow to work for both new signups and existing logins.
    if response.status_code == 400:
        logger.info("send_otp: user not found with create_user=False, retrying with create_user=True for %s", email)
        response = await supabase.request("POST", "auth/v1/otp", json={
            "email": email,
            "create_user": True
        })

    if response.status_code in (200, 201):
        return {"message": "If the address is eligible, an OTP code has been sent"}

    if response.status_code == 429:
        logger.warning(
            "send_otp supabase status=%s email=%s body=%s",
            response.status_code,
            email,
            response.text[:200] if response.text else ""
        )
        raise HTTPException(
            status_code=429,
            detail={
                "code": "OTP_RATE_LIMITED",
                "message": "Too many OTP requests. Please wait a minute and try again.",
            },
        )

    # Always return success to avoid email enumeration (Supabase may return 200 even if email unknown)
    return {"message": "An OTP code has been sent if the email is valid"}

@router.post("/verify-otp")
@limiter.limit("10/minute")
async def verify_otp(request: Request, data: VerifyOtpRequest):
    """Verify numeric email OTP for signup, magiclink/login, or recovery/forgot-password"""
    payload = {
        "email": data.email.strip().lower(),
        "token": data.token.strip(),
        "type": data.type.value
    }
    response = await supabase.request("POST", "auth/v1/verify", json=payload)
    if response.status_code not in (200, 201):
        logger.warning(
            "verify_otp supabase status=%s email=%s type=%s body=%s",
            response.status_code,
            data.email,
            data.type.value,
            response.text[:200] if response.text else ""
        )
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id") if isinstance(auth_data.get("user"), dict) else None
    access_token = auth_data.get("access_token")

    profile = None
    is_new = False
    if user_id and access_token:
        supabase_user = auth_data.get("user", {})
        user_profile_cache.pop(user_id, None)
        try:
            existing_profile = await fetch_profile_service_role(user_id)
            if not existing_profile:
                is_new = True

            profile = await resolve_profile_for_user(
                user_id,
                supabase_user.get("email", data.email),
                supabase_user.get("user_metadata"),
                user_jwt=access_token,
            )
            logger.info(
                "OTP verify profile resolved user=%s role=%s",
                user_id[:8],
                profile.get("role"),
            )
        except RuntimeError:
            logger.error("OTP verify profile resolve failed for user %s", user_id)

    return {
        "access_token": access_token,
        "token_type": auth_data.get("token_type", "bearer"),
        "expires_in": auth_data.get("expires_in"),
        "refresh_token": auth_data.get("refresh_token"),
        "user": auth_data.get("user"),
        "profile": profile,
        "is_new_user": is_new
    }

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
                "message": "Could not delete your account. Please try again or contact hello@trimit.online.",
            },
        )

    return {"message": "Account deleted successfully"}
