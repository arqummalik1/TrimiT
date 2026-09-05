from fastapi import APIRouter, Request, HTTPException, Depends, status, Body
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
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
    OtpType,
    CompleteProfileRequest,
    AccountDeletionRequest,
)
from dependencies.auth import get_current_user, user_profile_cache
from services.auth_errors import map_supabase_signup_error, safe_auth_response_json
from services.user_profile import (
    resolve_profile_for_user,
    upsert_user_profile,
    fetch_profile_service_role,
    create_new_profile,
)
from services.phone import normalize_india_phone, is_valid_india_phone
from services import campaigns as campaign_service
from services import app_review_otp
from services.auth_signup import (
    try_idempotent_signup,
    perform_supabase_signup,
    perform_admin_signup,
    resend_confirmation_email,
    check_existing_signup_state,
    pending_confirmation_response,
    login_with_password,
    _ensure_profile,
    admin_confirm_user,
    _fetch_auth_user_admin,
    _is_email_confirmed,
)
from services.account_deletion import (
    AccountDeletionCleanupError,
    auth_provider_context_for_user,
    delete_account_media,
    delete_email_leads,
    revoke_apple_authorization_code,
)

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/auth", tags=["Authentication"])

OTP_EMAIL_THROTTLE_SECONDS = 30
otp_email_throttle = TTLCache(maxsize=5000, ttl=OTP_EMAIL_THROTTLE_SECONDS)


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _mask_email(value: str) -> str:
    """Redact an email for logs: keep first 2 chars of local part + domain.

    e.g. 'saddamhmalik@gmail.com' -> 'sa***@gmail.com'. Avoids writing full PII
    into centralized logs while keeping just enough to correlate a report.
    """
    try:
        local, _, domain = (value or "").partition("@")
        if not domain:
            return "***"
        shown = local[:2] if len(local) > 2 else local[:1]
        return f"{shown}***@{domain}"
    except Exception:
        return "***"


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
            _mask_email(user.email),
            repr(body)[:500] if body else "",
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
    status_code, body = await resend_confirmation_email(data.email)
    if status_code >= 400:
        raise HTTPException(status_code=status_code, detail=body)
    return JSONResponse(status_code=status_code, content=body)


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
            _mask_email(data.email),
            response.text[:200] if response.text else "",
        )
    # Always return success to avoid email enumeration (Supabase may return 200 even if email unknown)
    return {"message": "If an account exists for that email, a password reset link has been sent"}


@router.post("/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, data: SendOtpRequest):
    """Trigger email OTP delivery (password-less login or signup verification retry)"""
    email = _normalize_email(data.email)
    _enforce_otp_email_throttle(email)

    # App Review allowlist: skip inbox OTP — reviewer uses the fixed code from Notes.
    if app_review_otp.is_app_review_otp_email(email):
        logger.info("send_otp app_review bypass (no email) email=%s", _mask_email(email))
        return {"message": "If the address is eligible, an OTP code has been sent"}

    # Use create_user=True to allow creating unconfirmed user rows in Supabase
    # when new users enter their email for passwordless signup.
    response = await supabase.request(
        "POST", "auth/v1/otp", json={"email": email, "create_user": True}
    )

    if response.status_code in (200, 201):
        return {"message": "If the address is eligible, an OTP code has been sent"}

    if response.status_code == 429:
        logger.warning(
            "send_otp supabase status=%s email=%s body=%s",
            response.status_code,
            _mask_email(email),
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
        _mask_email(email),
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
    """
    Verify numeric email OTP for login or recovery.

    This endpoint NO LONGER creates a public.users profile row. Profile
    creation is a separate, mandatory step via POST /auth/complete-profile.
    This makes profile creation server-enforced and cross-device safe —
    no client-side state (pendingSignupStore) is needed or trusted.

    Response includes `profile_complete: bool` so the client can decide
    whether to gate the user into CompleteProfileScreen.
    """
    email = data.email.strip().lower()
    token = data.token.strip()
    otp_type = data.type.value if hasattr(data.type, "value") else str(data.type)

    # App Review fixed OTP → mint session without inbox (allowlisted emails only).
    if app_review_otp.review_otp_matches(email, token):
        try:
            auth_data = await app_review_otp.mint_session_for_review_email(email)
        except Exception as e:
            logger.error("verify_otp app_review mint failed: %s", str(e), exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="An internal error occurred during verification",
            )
        user_id = (
            auth_data.get("user", {}).get("id")
            if isinstance(auth_data.get("user"), dict)
            else None
        )
        access_token = auth_data.get("access_token")
        profile = None
        profile_complete = False
        if user_id and access_token:
            user_profile_cache.pop(user_id, None)
            try:
                profile = await fetch_profile_service_role(user_id)
                profile_complete = profile is not None
            except Exception as e:
                logger.error(
                    "verify_otp app_review profile lookup failed user=%s error=%s",
                    user_id[:8] if user_id else "?",
                    str(e),
                )
        return {
            "access_token": access_token,
            "token_type": auth_data.get("token_type", "bearer"),
            "expires_in": auth_data.get("expires_in"),
            "refresh_token": auth_data.get("refresh_token"),
            "user": auth_data.get("user"),
            "profile": profile,
            "profile_complete": profile_complete,
        }

    if app_review_otp.is_app_review_otp_email(email):
        # Wrong code for an allowlisted review email — do not fall through to Supabase.
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_OTP",
                "message": "The code you entered is incorrect. Please double-check the 6-digit code and try again.",
            },
        )

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
                _mask_email(email),
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
                _mask_email(email),
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
    profile_complete = False

    if user_id and access_token:
        user_profile_cache.pop(user_id, None)
        try:
            profile = await fetch_profile_service_role(user_id)
            profile_complete = profile is not None
            logger.info(
                "verify_otp: user=%s profile_complete=%s",
                user_id[:8],
                profile_complete,
            )
        except Exception as e:
            logger.error(
                "verify_otp: profile lookup failed for user=%s error=%s",
                user_id[:8] if user_id else "?",
                str(e),
            )
            # Non-fatal — client will hit /complete-profile gate

    return {
        "access_token": access_token,
        "token_type": auth_data.get("token_type", "bearer"),
        "expires_in": auth_data.get("expires_in"),
        "refresh_token": auth_data.get("refresh_token"),
        "user": auth_data.get("user"),
        "profile": profile,
        "profile_complete": profile_complete,
    }


@router.post("/complete-profile")
@limiter.limit("10/minute")
async def complete_profile(
    request: Request,
    data: CompleteProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Create the public.users profile for a newly-authenticated user.

    Idempotent application-profile bootstrap after authentication. Customer and
    owner profiles are created without an additional identity form; missing
    role-specific details are collected only when the related feature needs them.

    Role assignment is enforced here, server-side. Existing customer -> owner
    activation remains temporarily compatible for already-released clients; new
    clients use the atomic first-salon endpoint instead. Employee activation
    additionally requires a validated pending invitation. Team accounts are
    never downgraded by a customer booking intent.

    Requires: valid Bearer token from verify-otp.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    email = current_user.get("email", "")
    metadata = current_user.get("user_metadata") or {}

    is_owner = data.role.value == "owner"
    is_employee = data.role.value == "employee"

    phone_e164: Optional[str] = None

    if is_employee:
        phone = (data.phone or "").strip()
        if not phone:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "PHONE_REQUIRED",
                    "message": "Phone number is required. Use the same number your salon owner registered for you.",
                },
            )
        from services.salon_access import link_employee_from_pending_invite

        linked = await link_employee_from_pending_invite(user_id, phone, email)
        if not linked:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "NO_STAFF_INVITE",
                    "message": (
                        "No pending app invite found for this phone. "
                        "Ask your salon owner to add you as staff and tap Invite to App."
                    ),
                },
            )
        phone_e164 = normalize_india_phone(phone) or phone
    elif data.phone:
        phone_e164 = normalize_india_phone(data.phone)
        if not phone_e164:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "PHONE_REQUIRED",
                    "message": "A valid 10-digit Indian mobile number is required.",
                },
            )

        # Block duplicate customer phones (welcome voucher anti-abuse) only
        # once a customer supplies a booking contact number.
        if not is_owner:
            dup = await supabase.request(
                "GET",
                f"rest/v1/users?phone=eq.{phone_e164}&role=eq.customer&select=id",
                service_role=True,
            )
            if dup.status_code == 200 and dup.json():
                existing_id = dup.json()[0].get("id")
                if existing_id != user_id:
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "code": "PHONE_ALREADY_REGISTERED",
                            "message": "This mobile number is already registered.",
                        },
                    )

    upi_id = (data.upi_id or "").strip()
    if is_owner and upi_id:
        import re as _re
        if not _re.match(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$", upi_id):
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_UPI", "message": "Enter a valid UPI ID like name@bank."},
            )

    supplied_name = (data.name or "").strip()
    provider_name = str(
        metadata.get("full_name")
        or metadata.get("name")
        or ""
    ).strip()
    if not provider_name:
        given = str(metadata.get("given_name") or "").strip()
        family = str(metadata.get("family_name") or "").strip()
        provider_name = " ".join(part for part in (given, family) if part)
    email_label = (email.split("@", 1)[0] if email else "").replace(".", " ").replace("_", " ").strip()
    resolved_name = supplied_name or provider_name or email_label.title() or "TrimiT Member"

    # Legacy-compatible role activation for already-released clients. New owner
    # onboarding must not call this path; it activates through the atomic salon
    # RPC. Employee activation reaches this point only after invite validation.
    existing_profile = await fetch_profile_service_role(user_id)
    if existing_profile:
        existing_role = existing_profile.get("role")
        requested_role = data.role.value
        role_patch: Optional[str] = None
        if requested_role == "owner" and existing_role == "customer":
            role_patch = "owner"
        elif requested_role == "employee" and existing_role in ("customer", "employee"):
            role_patch = "employee"

        if role_patch:
            patch_payload: Dict[str, Any] = {"role": role_patch}
            if phone_e164:
                patch_payload["phone"] = phone_e164
            role_resp = await supabase.request(
                "PATCH",
                f"rest/v1/users?id=eq.{user_id}",
                json=patch_payload,
                service_role=True,
            )
            if role_resp.status_code not in (200, 201, 204):
                raise HTTPException(
                    status_code=500,
                    detail={
                        "code": "ROLE_ACTIVATION_FAILED",
                        "message": "Could not activate this workspace. Please try again.",
                    },
                )
            user_profile_cache.pop(user_id, None)
            profile = await fetch_profile_service_role(user_id) or {**existing_profile, **patch_payload}
            return {
                "profile": profile,
                "message": "Workspace activated successfully",
                "welcome_grant": None,
            }

        # Idempotent retry or an attempt to downgrade a team account to
        # customer: preserve the server-authoritative role.
        return {
            "profile": existing_profile,
            "message": "Profile already exists",
            "welcome_grant": None,
        }

    try:
        profile = await create_new_profile(
            user_id=user_id,
            email=email,
            role=data.role.value,
            name=resolved_name,
            phone=phone_e164,
            upi_id=upi_id if is_owner else None,
            gender=data.gender,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_ROLE", "message": str(e)},
        )
    except RuntimeError as e:
        logger.error(
            "complete_profile: create_new_profile failed user=%s error=%s",
            user_id[:8] if user_id else "?",
            str(e),
        )
        raise HTTPException(
            status_code=500,
            detail={
                "code": "PROFILE_CREATE_FAILED",
                "message": "Could not create profile. Please try again.",
            },
        )

    # Invalidate any cached profile so /auth/me returns fresh data immediately.
    user_profile_cache.pop(user_id, None)

    logger.info(
        "complete_profile: profile created user=%s role=%s",
        user_id[:8] if user_id else "?",
        profile.get("role"),
    )

    welcome_grant = None
    if profile.get("role") == "customer" and phone_e164:
        welcome_grant = await campaign_service.issue_welcome_grant(
            user_id=user_id,
            phone=phone_e164,
        )

    return {
        "profile": profile,
        "message": "Profile created successfully",
        "welcome_grant": welcome_grant,
    }


@router.delete("/owner-workspace")
async def cancel_empty_owner_workspace(current_user: dict = Depends(get_current_user)):
    """Recover an owner account that has not created a salon.

    The database function refuses the transition when a salon or paid billing
    history exists. This is primarily a safe exit for accounts left half-switched
    by the previous onboarding flow; it never deletes a business.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    response = await supabase.request(
        "POST",
        "rest/v1/rpc/cancel_empty_owner_workspace_v1",
        json={"p_user_id": user_id},
        service_role=True,
    )

    try:
        body = response.json()
    except Exception:
        body = None

    if response.status_code not in (200, 201):
        upstream_code = body.get("code") if isinstance(body, dict) else None
        upstream_message = body.get("message") if isinstance(body, dict) else ""
        logger.error(
            "cancel_empty_owner_workspace: rpc failed user=%s status=%s code=%s",
            user_id,
            response.status_code,
            upstream_code,
        )
        if "OWNER_RECOVERY_HAS_SALON" in str(upstream_message):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "OWNER_WORKSPACE_HAS_SALON",
                    "message": "This business workspace already has a salon and cannot be removed here.",
                },
            )
        if "OWNER_RECOVERY_HAS_BILLING_HISTORY" in str(upstream_message):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "OWNER_WORKSPACE_HAS_BILLING",
                    "message": "This workspace has billing history. Please contact support before changing it.",
                },
            )
        if "OWNER_RECOVERY_INVALID_ROLE" in str(upstream_message):
            raise HTTPException(status_code=403, detail="This account cannot return to customer mode")
        if upstream_code == "PGRST202" or response.status_code == 404:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "OWNER_RECOVERY_NOT_READY",
                    "message": "Account recovery is temporarily unavailable while the server is being updated.",
                },
            )
        raise HTTPException(
            status_code=500,
            detail={
                "code": "OWNER_RECOVERY_FAILED",
                "message": "Could not return to customer mode. Please try again.",
            },
        )

    if isinstance(body, list):
        profile = body[0] if body and isinstance(body[0], dict) else None
    else:
        profile = body if isinstance(body, dict) and body.get("id") else None
    if not profile:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "OWNER_RECOVERY_NO_PROFILE",
                "message": "Customer mode was restored but the profile could not be reloaded.",
            },
        )

    user_profile_cache.pop(user_id, None)
    logger.info("cancel_empty_owner_workspace: customer mode restored user=%s", user_id)
    return {"profile": profile, "message": "Customer mode restored"}


@router.post("/validate-reset-token")
async def validate_reset_token(data: ValidateTokenRequest):
    """Check recovery session token before showing reset-password form (SPA flow)."""
    r = await supabase.request("GET", "auth/v1/user", token=data.token)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"status": "ok"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """
    Update password using a recovery-session access token.

    Validates the recovery JWT first, then updates via the Admin API. User-scoped
    PUT /auth/v1/user often 400s on recovery sessions when project password
    reauth / AAL settings are enabled — admin update after token proof is the
    reliable path (same trust boundary: valid recovery link required).
    """
    user_resp = await supabase.request("GET", "auth/v1/user", token=data.token)
    if user_resp.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_RESET_TOKEN",
                "message": "This reset link has expired or is invalid. Please request a new one.",
            },
        )

    try:
        user_body = user_resp.json()
    except Exception:  # noqa: BLE001
        user_body = {}
    user_id = user_body.get("id")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_RESET_TOKEN",
                "message": "This reset link has expired or is invalid. Please request a new one.",
            },
        )

    # Prefer user-scoped update when Supabase accepts it.
    user_update = await supabase.request(
        "PUT",
        "auth/v1/user",
        token=data.token,
        json={"password": data.password},
    )
    if user_update.status_code == 200:
        return {"message": "Password updated successfully"}

    admin_update = await supabase.request(
        "PUT",
        f"auth/v1/admin/users/{user_id}",
        service_role=True,
        json={"password": data.password},
    )
    if admin_update.status_code in (200, 201):
        return {"message": "Password updated successfully"}

    logger.warning(
        "reset_password failed user=%s user_put=%s admin_put=%s body=%s",
        str(user_id)[:8],
        user_update.status_code,
        admin_update.status_code,
        (admin_update.text or user_update.text or "")[:300],
    )

    message = "Could not reset password. Please try a different password or request a new link."
    raw = ""
    try:
        err_json = admin_update.json() if admin_update.text else {}
        if isinstance(err_json, dict):
            raw = str(
                err_json.get("msg")
                or err_json.get("error_description")
                or err_json.get("message")
                or ""
            ).lower()
    except Exception:  # noqa: BLE001
        raw = (admin_update.text or "").lower()

    if "same" in raw or "identical" in raw or "different" in raw:
        message = "New password must be different from your current password."
    elif "weak" in raw or "strength" in raw or "characters" in raw:
        message = "Password is too weak. Use at least 6 characters with a mix of letters and numbers."

    raise HTTPException(
        status_code=400,
        detail={"code": "RESET_FAILED", "message": message},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Authenticated user endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Return the authenticated user with the resolved profile from public.users.

    Includes `profile_complete: bool` so clients can detect broken/incomplete
    accounts (auth.users row exists but no public.users row) and gate the user
    into CompleteProfileScreen on app restart.
    """
    profile = current_user.get("profile") or {}
    profile_complete = bool(profile and profile.get("role") and profile.get("name"))
    return {
        "id": current_user.get("id"),
        "email": current_user.get("email"),
        "profile": profile,
        "profile_complete": profile_complete,
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

    existing_profile = current_user.get("profile") or {}
    normalized_contact: Optional[str] = None
    if "phone" in payload:
        normalized_contact = normalize_india_phone(payload.get("phone"))
        if not normalized_contact:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "INVALID_PHONE",
                    "message": "Enter a valid 10-digit Indian mobile number.",
                },
            )
        if existing_profile.get("role") == "customer":
            duplicate = await supabase.request(
                "GET",
                f"rest/v1/users?phone=eq.{normalized_contact}&role=eq.customer&select=id",
                service_role=True,
            )
            if duplicate.status_code == 200 and duplicate.json():
                duplicate_id = duplicate.json()[0].get("id")
                if duplicate_id != user_id:
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "code": "PHONE_ALREADY_REGISTERED",
                            "message": "This mobile number is already registered.",
                        },
                    )
        payload["phone"] = normalized_contact

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
    if (
        normalized_contact
        and existing_profile.get("role") == "customer"
        and not existing_profile.get("phone")
    ):
        await campaign_service.issue_welcome_grant(
            user_id=user_id,
            phone=normalized_contact,
        )
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


@router.get("/account/deletion-context")
async def account_deletion_context(current_user: dict = Depends(get_current_user)):
    """Return the provider confirmation required for safe account deletion."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        context = await auth_provider_context_for_user(user_id)
    except AccountDeletionCleanupError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "ACCOUNT_DELETE_CONTEXT_FAILED", "message": str(exc)},
        ) from exc
    return {
        "requires_apple_confirmation": "apple" in context.providers,
        "has_google_identity": "google" in context.providers,
    }


@router.delete("/account")
async def delete_account(
    payload: AccountDeletionRequest | None = Body(default=None),
    current_user: dict = Depends(get_current_user),
):
    """Permanently delete the authenticated account and associated data."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        provider_context = await auth_provider_context_for_user(user_id)
        if "apple" in provider_context.providers:
            apple_code = (payload.apple_authorization_code if payload else None) or ""
            if not apple_code.strip():
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "APPLE_REAUTH_REQUIRED",
                        "message": "Confirm with Apple before deleting this account.",
                    },
                )
            await revoke_apple_authorization_code(
                apple_code.strip(),
                expected_subject=provider_context.apple_subject,
            )

        # Uploaded media lives outside Postgres and must be removed through the
        # Storage API before its owning identity disappears.
        await delete_account_media(user_id)
        await delete_email_leads(current_user.get("email"))
    except HTTPException:
        raise
    except AccountDeletionCleanupError as exc:
        logger.error("[delete_account] cleanup failed user=%s", user_id)
        raise HTTPException(
            status_code=503,
            detail={"code": "ACCOUNT_DELETE_CLEANUP_FAILED", "message": str(exc)},
        ) from exc

    # Delete the application profile first. Migration 63 makes every associated
    # application record cascade or detach without risking a half-deleted Auth
    # identity when a database constraint is misconfigured.
    profile_resp = await supabase.request(
        "DELETE",
        f"rest/v1/users?id=eq.{user_id}",
        service_role=True,
    )
    if profile_resp.status_code not in (200, 204, 404):
        logger.error(
            "[delete_account] profile delete failed user=%s status=%s body=%s",
            user_id,
            profile_resp.status_code,
            profile_resp.text[:200],
        )
        raise HTTPException(
            status_code=409,
            detail={
                "code": "ACCOUNT_DATA_DELETE_BLOCKED",
                "message": "Account data could not be removed. Please try again after the server is updated.",
            },
        )

    # Auth admin delete removes identities/sessions and invalidates refresh
    # tokens. Protected requests also verify the live Supabase session so an
    # already-issued access JWT cannot keep using the API after this succeeds.
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

    user_profile_cache.pop(user_id, None)
    return {"message": "Account and associated data deleted"}
