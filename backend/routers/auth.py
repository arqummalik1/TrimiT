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
        if status_code in (200, 201, 202):
            return JSONResponse(status_code=status_code, content=body)
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
    status_code_resp, body = await perform_supabase_signup(user)
    
    if status_code_resp in (200, 201):
        if not body.get("session") and not body.get("access_token"):
            return JSONResponse(
                status_code=202,
                content={
                    "code": "EMAIL_CONFIRMATION_REQUIRED",
                    "message": "Account created. Please check your email for the verification link/OTP to complete your registration."
                }
            )
        return body
    if status_code_resp == 202:
        return JSONResponse(status_code=202, content=body)

    # Supabase 5xx on signup almost always means the Auth email SEND failed
    # (SMTP / email-provider problem), NOT bad user input. Surface that honestly
    # instead of telling the user to "check their details", and log the real
    # provider response so it's visible in Render logs.
    if status_code_resp >= 500:
        logger.error(
            "signup: supabase auth email send failed status=%s email=%s body=%s",
            status_code_resp,
            user.email,
            body if isinstance(body, dict) else str(body),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "OTP_SEND_FAILED",
                "message": (
                    "We couldn't send your verification code right now. This is a "
                    "temporary email-service issue on our side — please try again "
                    "in a few minutes."
                ),
            },
        )

    # Hybrid Fix: If user exists but is unconfirmed, resend and act like it's a new signup
    if status_code_resp == 400 and body.get("code") == "USER_ALREADY_EXISTS":
        state = await check_existing_signup_state(user.email)
        if state and state[0] == "pending":
            logger.info("signup: user %s already exists but unconfirmed, resending code", user.email)
            await resend_confirmation_email(user.email)
            # Return 202 (Accepted) so frontend moves to OTP screen
            return JSONResponse(
                status_code=202, 
                content={
                    "code": "EMAIL_CONFIRMATION_REQUIRED",
                    "message": "You have a pending registration. A new verification code has been sent to your email."
                }
            )
        else:
            # User is already confirmed, tell them to sign in
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "USER_ALREADY_EXISTS",
                    "message": "An account with this email already exists. Please try signing in instead."
                }
            )

    # body is a raw Supabase JSON dict. Map it to a stable {code, message} shape
    # so every client gets a clean error instead of "An unexpected error occurred."
    class _FakeResp:
        def __init__(self, status, data):
            self.status_code = status
            self._data = data
        def json(self):
            return self._data

    err_code, err_msg = map_supabase_signup_error(_FakeResp(status_code_resp, body))
    raise HTTPException(
        status_code=status_code_resp if status_code_resp in (400, 422, 429) else 400,
        detail={"code": err_code, "message": err_msg},
    )



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
                status_code=401,
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
                status_code=401,
                detail={
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password. Please try again.",
                },
            )

    # Generic fallback
    raise HTTPException(
        status_code=401,
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
    # Settings only defines PUBLIC_SITE_URL; FRONTEND_URL was a typo from an earlier
    # config and would AttributeError if a caller ever omitted `redirect_to`.
    # Mobile sends a deep link; web omits redirect_to and relies on the public site URL.
    redirect_to = data.redirect_to or f"{settings.PUBLIC_SITE_URL.rstrip('/')}/reset-password"
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

    # Distinguish a genuine email-DELIVERY failure from the anti-enumeration case.
    #
    # Previously every non-200/429 response returned a generic "code has been
    # sent" success, which made the app navigate to the OTP screen even when
    # Supabase failed to actually send the email (e.g. 5xx "Error sending email"
    # when the built-in SMTP is throttled/unavailable). The user then waits for
    # a code that never arrives.
    #
    # Anti-enumeration is still preserved: we only surface an error when the
    # failure is clearly a send/server problem, NOT when the address is simply
    # ineligible (which Supabase reports as a 4xx like "user not found").
    body_text = (response.text or "").lower()
    send_failure = (
        response.status_code >= 500
        or "error sending" in body_text
        or "failed to send" in body_text
        or "smtp" in body_text
    )

    logger.warning(
        "send_otp supabase status=%s email=%s send_failure=%s body=%s",
        response.status_code,
        email,
        send_failure,
        response.text[:200] if response.text else "",
    )

    if send_failure:
        # Let this email retry immediately rather than being blocked by our
        # 60s per-email throttle, since no code actually went out.
        otp_email_throttle.pop(email, None)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "OTP_SEND_FAILED",
                "message": "We couldn't send the code right now. Please try again in a moment.",
            },
        )

    # Otherwise treat as the anti-enumeration case (ineligible address, etc.):
    # return success so we don't reveal whether the email exists.
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

            # Build the metadata dict resolve_profile_for_user reads. For brand-
            # new accounts (no profile row yet), merge the client's signup intent
            # (role, name, phone) on top of whatever Supabase forwarded — Supabase
            # does NOT reliably persist `options.data` from auth/v1/otp into
            # user_metadata when the user is created via OTP, so we'd otherwise
            # always default to role='customer'. Once a profile row exists, the
            # client values are ignored (no role escalation possible).
            merged_metadata: dict = dict(supabase_user.get("user_metadata") or {})
            if is_new:
                if data.role is not None:
                    merged_metadata["role"] = data.role.value
                if data.name:
                    merged_metadata.setdefault("name", data.name)
                if data.phone:
                    merged_metadata.setdefault("phone", data.phone)

            profile = await resolve_profile_for_user(
                user_id,
                supabase_user.get("email", data.email),
                merged_metadata,
                user_jwt=access_token,
            )
            logger.info(
                "OTP verify profile resolved user=%s role=%s is_new=%s client_role_hint=%s",
                user_id[:8],
                profile.get("role"),
                is_new,
                (data.role.value if data.role else None),
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


# ─────────────────────────────────────────────────────────────────────────────
# Authenticated user endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user with the resolved profile from public.users."""
    profile = current_user.get("profile") or {}
    return {
        "id": current_user.get("id"),
        "email": current_user.get("email"),
        "profile": profile,
        # Flatten common fields so older clients reading top-level still work.
        "name": profile.get("name"),
        "phone": profile.get("phone"),
        "role": profile.get("role"),
        "push_token": profile.get("push_token"),
        "push_enabled": profile.get("push_enabled"),
        "notify_bookings": profile.get("notify_bookings"),
        "notify_booking_updates": profile.get("notify_booking_updates"),
        "notify_promotional": profile.get("notify_promotional"),
        "notify_reminders": profile.get("notify_reminders"),
    }


@router.patch("/profile")
async def update_profile(
    data: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update the authenticated user's name / phone / push_token."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = data.model_dump(exclude_unset=True, exclude_none=True)
    # Never allow role escalation from this endpoint.
    payload.pop("role", None)
    if not payload:
        return {"message": "No changes"}

    resp = await supabase.request(
        "PATCH",
        f"rest/v1/users?id=eq.{user_id}",
        json=payload,
        service_role=True,
    )
    if resp.status_code not in (200, 201, 204):
        logger.error(
            "[update_profile] PATCH failed user=%s status=%s body=%s",
            user_id,
            resp.status_code,
            resp.text[:200],
        )
        raise HTTPException(status_code=400, detail="Could not update profile")

    # Cache might still hold the old row; drop it so /auth/me is fresh.
    user_profile_cache.pop(user_id, None)
    fresh = await fetch_profile_service_role(user_id)
    return {"message": "Profile updated", "profile": fresh or {}}


@router.post("/push-token")
async def upsert_push_token(
    data: PushTokenUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Register or clear the Expo push token for this user."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = data.push_token
    if token is not None:
        token = str(token).strip()
        if token and not (
            token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")
        ):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_PUSH_TOKEN",
                    "message": "Push token format is not recognised.",
                },
            )

    resp = await supabase.request(
        "PATCH",
        f"rest/v1/users?id=eq.{user_id}",
        json={"push_token": token if token else None},
        service_role=True,
    )
    if resp.status_code not in (200, 201, 204):
        logger.error(
            "[upsert_push_token] PATCH failed user=%s status=%s body=%s",
            user_id,
            resp.status_code,
            resp.text[:200],
        )
        raise HTTPException(status_code=400, detail="Could not save push token")

    user_profile_cache.pop(user_id, None)
    return {"message": "Push token saved"}


@router.patch("/notification-preferences")
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update notification preferences (master switch + per-category toggles)."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = data.model_dump(exclude_unset=True, exclude_none=True)
    if not payload:
        return {"message": "No changes"}

    resp = await supabase.request(
        "PATCH",
        f"rest/v1/users?id=eq.{user_id}",
        json=payload,
        service_role=True,
    )
    if resp.status_code not in (200, 201, 204):
        logger.error(
            "[update_notification_preferences] PATCH failed user=%s status=%s body=%s",
            user_id,
            resp.status_code,
            resp.text[:200],
        )
        raise HTTPException(status_code=400, detail="Could not update preferences")

    user_profile_cache.pop(user_id, None)
    fresh = await fetch_profile_service_role(user_id)
    return {"message": "Preferences updated", "profile": fresh or {}}


@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete the authenticated user's account permanently (auth + profile)."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Auth row delete (service role; cascades to public.users via FK ON DELETE CASCADE).
    auth_resp = await supabase.request(
        "DELETE",
        f"auth/v1/admin/users/{user_id}",
        service_role=True,
    )
    if auth_resp.status_code not in (200, 204, 404):
        logger.error(
            "[delete_account] auth delete failed user=%s status=%s body=%s",
            user_id,
            auth_resp.status_code,
            auth_resp.text[:200],
        )
        raise HTTPException(status_code=400, detail="Could not delete account")

    # Defensive: if FK cascade didn't fire (older schema), clear the row directly.
    await supabase.request(
        "DELETE",
        f"rest/v1/users?id=eq.{user_id}",
        service_role=True,
    )
    user_profile_cache.pop(user_id, None)
    return {"message": "Account deleted"}
