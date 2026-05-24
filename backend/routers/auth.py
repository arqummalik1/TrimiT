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
    OtpType
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
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "LOGIN_FAILED",
                    "message": "Account created but login failed. Please try signing in manually.",
                },
            )
        return token_resp.json()

    # Production: Supabase Auth
    status_code, body = await perform_supabase_signup(user)
    if status_code == 200:
        return body
    if status_code == 202:
        return JSONResponse(status_code=202, content=body)

    # If already exists but unconfirmed, resend and return 202
    if status_code == 400 and body.get("code") == "USER_ALREADY_EXISTS":
        # Check if actually confirmed
        if not await _is_email_confirmed(user.email):
            resend_body = await resend_confirmation_email(user.email)
            return JSONResponse(status_code=202, content=resend_body)

    raise HTTPException(status_code=status_code, detail=body)


@router.post("/login")
@limiter.limit("20/minute")
async def login(request: Request, data: UserLogin):
    """
    Authenticate user with email and password.
    Returns session tokens and user profile.
    """
    response = await login_with_password(data.email, data.password)

    if response.status_code == 200:
        auth_data = response.json()
        user_id = auth_data["user"]["id"]

        # Clear cache to force fresh profile fetch
        user_profile_cache.pop(user_id, None)

        # Ensure profile exists and resolve it
        profile = await resolve_profile_for_user(
            user_id,
            auth_data["user"]["email"],
            auth_data["user"].get("user_metadata"),
            user_jwt=auth_data["access_token"],
        )

        return {
            "access_token": auth_data["access_token"],
            "token_type": auth_data["token_type"],
            "expires_in": auth_data["expires_in"],
            "refresh_token": auth_data["refresh_token"],
            "user": auth_data["user"],
            "profile": profile,
        }

    # Handle specific error cases for better UX
    if response.status_code == 400:
        body = response.json()
        error_msg = body.get("error_description", body.get("error", ""))

        if "invalid login credentials" in error_msg.lower():
            raise HTTPException(
                status_code=status_code.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password. Please try again.",
                },
            )

        # Narrowed from bare-except for login enumeration protection
        if "email not confirmed" in error_msg.lower():
            # In production, we return the same error to prevent enumeration,
            # but allow resending the link.
            raise HTTPException(
                status_code=status_code.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password. Please try again.",
                },
            )

    # Generic fallback
    raise HTTPException(
        status_code=status_code.HTTP_401_UNAUTHORIZED,
        detail={
            "code": "INVALID_CREDENTIALS",
            "message": "Invalid email or password. Please try again.",
        },
    )


@router.post("/resend-confirmation")
@limiter.limit("5/minute")
async def resend_confirmation(request: Request, data: ResendConfirmationRequest):
    """Resend the signup confirmation email."""
    body = await resend_confirmation_email(data.email)
    return body


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """Trigger Supabase password reset email."""
    redirect_to = data.redirect_to or f"{settings.FRONTEND_URL}/reset-password"
    response = await supabase.request(
        "POST", "auth/v1/recover", json={"email": data.email}, params={"redirectTo": redirect_to}
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
    return {"message": "An OTP code has been sent if the email is valid"}


@router.post("/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, data: SendOtpRequest):
    """Trigger email OTP delivery (password-less login or signup verification retry)"""
    email = _normalize_email(data.email)
    _enforce_otp_email_throttle(email)

    # Try with create_user=False first (login flow for existing users)
    response = await supabase.request(
        "POST", "auth/v1/otp", json={"email": email, "create_user": False}
    )

    # If Supabase returns 400 with "User not found" (or similar), try with create_user=True
    # This allows the OTP flow to work for both new signups and existing logins.
    if response.status_code == 400:
        logger.info(
            "send_otp: user not found with create_user=False, retrying with create_user=True for %s",
            email,
        )
        response = await supabase.request(
            "POST", "auth/v1/otp", json={"email": email, "create_user": True}
        )

    if response.status_code in (200, 201):
        return {"message": "If the address is eligible, an OTP code has been sent"}

    if response.status_code == 429:
        logger.warning(
            "send_otp supabase status=%s email=%s body=%s",
            response.status_code,
            email,
            response.text[:200] if response.text else "",
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
    email = data.email.strip().lower()
    token = data.token.strip()
    otp_type = data.type.value if hasattr(data.type, "value") else str(data.type)

    payload = {"email": email, "token": token, "type": otp_type}

    try:
        response = await supabase.request("POST", "auth/v1/verify", json=payload)

        # Hybrid Fix: If the primary type fails, try the alternative (signup vs magiclink)
        if response.status_code not in (200, 201) and otp_type in ("signup", "magiclink"):
            alt_type = "magiclink" if otp_type == "signup" else "signup"
            logger.info(
                "verify_otp: primary type %s failed, retrying with %s for %s",
                otp_type,
                alt_type,
                email,
            )

            payload["type"] = alt_type
            alt_response = await supabase.request("POST", "auth/v1/verify", json=payload)

            if alt_response.status_code in (200, 201):
                response = alt_response

        if response.status_code not in (200, 201):
            error_msg = (
                "Invalid or expired verification code. Please check your email and try again."
            )
            supabase_error = ""
            try:
                error_json = response.json()
                supabase_error = (
                    error_json.get("error_description") or error_json.get("msg") or ""
                )
                if "invalid" in supabase_error.lower() and "token" in supabase_error.lower():
                    error_msg = "The code you entered is incorrect. Please double-check the 6-digit code and try again."
                elif "expired" in supabase_error.lower():
                    error_msg = "This code has expired. Please request a new verification code."
            except Exception:
                pass

            logger.warning(
                "verify_otp supabase status=%s email=%s type=%s body=%s",
                response.status_code,
                email,
                otp_type,
                response.text[:200] if response.text else "",
            )
            raise HTTPException(
                status_code=400, detail={"code": "INVALID_OTP", "message": error_msg}
            )

        auth_data = response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("verify_otp unexpected error: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail="An internal error occurred during verification"
        )

    user_id = (
        auth_data.get("user", {}).get("id") if isinstance(auth_data.get("user"), dict) else None
    )
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
        "is_new_user": is_new,
    }


@router.post("/validate-reset-token")
async def validate_reset_token(data: ValidateTokenRequest):
    """Check recovery session token before showing reset-password form (SPA flow)."""
    r = await supabase.request("GET", "auth/v1/user", token=data.token)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"status": "ok"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Update user password using the recovery session token."""
    r = await supabase.request(
        "PUT", "auth/v1/user", token=data.token, json={"password": data.password}
    )
    if r.status_code != 200:
        logger.warning("reset_password failed status=%s body=%s", r.status_code, r.text)
        raise HTTPException(status_code=400, detail="Could not reset password. Token may be expired.")
    return {"message": "Password updated successfully"}
