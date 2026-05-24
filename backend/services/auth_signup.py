"""
Signup orchestration — avoid duplicate confirmation emails and handle Supabase rate limits.

Supabase default email SMTP is project-wide (~2–4 emails/hour). For production scale,
configure Custom SMTP in Supabase Dashboard → Authentication → SMTP.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote

from config import settings
from core.supabase import supabase
from models.auth import UserCreate
from models.auth import UserRole
from services.auth_errors import map_supabase_signup_error, safe_auth_response_json
from services.user_profile import upsert_user_profile

logger = logging.getLogger("trimit")


def email_confirmation_redirect_url() -> str:
    """Web page shown after the user taps the signup confirmation link in email."""
    base = settings.PUBLIC_SITE_URL.rstrip("/")
    return f"{base}/auth/email-confirmed"


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def _fetch_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    email_norm = quote(_normalize_email(email), safe="")
    resp = await supabase.request(
        "GET",
        f"rest/v1/users?email=eq.{email_norm}&select=id,email,role,name,phone",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
    return None


async def find_auth_user_by_email_admin(email: str) -> Optional[Dict[str, Any]]:
    """Lookup auth.users row by email (service role)."""
    email_norm = _normalize_email(email)
    resp = await supabase.request(
        "GET",
        "auth/v1/admin/users",
        service_role=True,
        params={
            "page": 1,
            "per_page": 1,
            "filter": f"email.eq.{email_norm}",
        },
    )
    if resp.status_code != 200:
        logger.warning(
            "admin users list failed status=%s email=%s body=%s",
            resp.status_code,
            email_norm,
            resp.text[:200] if resp.text else "",
        )
        return None

    data = resp.json()
    users = data.get("users") if isinstance(data, dict) else None
    if users and isinstance(users, list) and users:
        return users[0]
    return None


async def _fetch_auth_user_admin(user_id: str) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        f"auth/v1/admin/users/{user_id}",
        service_role=True,
    )
    if resp.status_code == 200:
        data = resp.json()
        return data if isinstance(data, dict) else None
    return None


def _is_email_confirmed(auth_user: Dict[str, Any]) -> bool:
    if auth_user.get("email_confirmed_at"):
        return True
    if auth_user.get("confirmed_at"):
        return True
    return False


async def _ensure_profile(user_id: str, payload: UserCreate) -> Dict[str, Any]:
    profile_data = {
        "id": user_id,
        "email": _normalize_email(payload.email),
        "name": payload.name,
        "phone": payload.phone,
        "role": payload.role.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return await upsert_user_profile(user_id, profile_data, prefer_incoming_role=True)


async def admin_confirm_user(user_id: str) -> bool:
    """Confirm email without sending another message (service role)."""
    resp = await supabase.request(
        "PUT",
        f"auth/v1/admin/users/{user_id}",
        service_role=True,
        json={"email_confirm": True},
    )
    return resp.status_code in (200, 201, 204)


async def pending_confirmation_response(
    *,
    email: str,
    user_id: Optional[str],
    message: str,
    resent: bool = False,
    code: str = "EMAIL_CONFIRMATION_REQUIRED",
) -> Tuple[int, Dict[str, Any]]:
    body: Dict[str, Any] = {
        "code": code,
        "message": message,
        "email": email,
        "resent": resent,
    }
    if user_id:
        body["user"] = {"id": user_id, "email": email}
    return 202, body


async def check_existing_signup_state(email: str) -> Optional[Tuple[str, Optional[str]]]:
    """
    Returns (state, user_id):
    - confirmed — can sign in
    - pending — auth exists, email not confirmed
    - none — no account
    """
    email_norm = _normalize_email(email)

    profile = await _fetch_profile_by_email(email_norm)
    user_id = profile.get("id") if profile else None

    auth_user = None
    if user_id:
        auth_user = await _fetch_auth_user_admin(user_id)
    else:
        auth_user = await find_auth_user_by_email_admin(email_norm)
        if auth_user:
            user_id = auth_user.get("id")

    if not user_id and not auth_user:
        return None

    if auth_user and _is_email_confirmed(auth_user):
        return ("confirmed", user_id)
    return ("pending", user_id)


async def try_idempotent_signup(user: UserCreate) -> Optional[Tuple[int, Dict[str, Any]]]:
    state = await check_existing_signup_state(user.email)
    if not state:
        return None

    status, user_id = state
    if status == "confirmed":
        return (
            400,
            {
                "code": "ALREADY_REGISTERED",
                "message": "An account with this email already exists. Sign in instead.",
            },
        )

    if user_id:
        await _ensure_profile(user_id, user)
        # Force a fresh confirmation email/OTP send for the pending user
        resend_resp = await resend_confirmation_email(user.email)
        resend_status, resend_body = resend_resp
        
        return await pending_confirmation_response(
            email=_normalize_email(user.email),
            user_id=user_id,
            message="You have a pending registration. A new verification code has been sent to your email.",
            resent=True,
        )

    return await pending_confirmation_response(


async def salvage_rate_limited_signup(
    user: UserCreate,
    *,
    auth_user_id: Optional[str] = None,
) -> Optional[Tuple[int, Dict[str, Any]]]:
    """
    When Supabase blocks sending email, the auth user is often still created.
    Confirm via admin API so the user can sign in without another email.
    """
    auth_user: Optional[Dict[str, Any]] = None
    if auth_user_id:
        auth_user = await _fetch_auth_user_admin(auth_user_id)
    if not auth_user:
        auth_user = await find_auth_user_by_email_admin(user.email)
    if not auth_user:
        return None

    user_id = auth_user.get("id")
    if not user_id:
        return None

    if not _is_email_confirmed(auth_user):
        ok = await admin_confirm_user(user_id)
        if not ok:
            logger.error("admin_confirm_user failed user_id=%s", user_id)
            return None
        logger.info("Salvaged signup via admin confirm user_id=%s email=%s", user_id[:8], user.email)

    await _ensure_profile(user_id, user)

    return await pending_confirmation_response(
        email=_normalize_email(user.email),
        user_id=user_id,
        message=(
            "Your account is ready. Email delivery was paused due to provider limits, "
            "but we activated your account. Tap Go to sign in and use your password."
        ),
        code="SIGNUP_READY_SIGN_IN",
    )


async def perform_supabase_signup(user: UserCreate):
    redirect_to = email_confirmation_redirect_url()
    return await supabase.request(
        "POST",
        "auth/v1/signup",
        json={
            "email": _normalize_email(user.email),
            "password": user.password,
            "data": {
                "name": user.name,
                "phone": user.phone or "",
                "role": user.role.value,
            },
            "redirect_to": redirect_to,
            "options": {"email_redirect_to": redirect_to},
        },
    )


async def perform_admin_signup(user: UserCreate) -> Tuple[int, Dict[str, Any]]:
    """
    Create a pre-confirmed user (no confirmation email). Use only when
    AUTH_AUTO_CONFIRM_SIGNUP=true (staging/dev).
    """
    email_norm = _normalize_email(user.email)
    resp = await supabase.request(
        "POST",
        "auth/v1/admin/users",
        service_role=True,
        json={
            "email": email_norm,
            "password": user.password,
            "email_confirm": True,
            "user_metadata": {
                "name": user.name,
                "phone": user.phone or "",
                "role": user.role.value,
            },
        },
    )

    if resp.status_code in (200, 201):
        data = resp.json() if resp.text else {}
        return resp.status_code, data if isinstance(data, dict) else {}

    if resp.status_code == 422:
        existing = await find_auth_user_by_email_admin(email_norm)
        if existing and existing.get("id"):
            await admin_confirm_user(existing["id"])
            return 200, existing

    return resp.status_code, safe_auth_response_json(resp)


async def login_with_password(email: str, password: str):
    return await supabase.request(
        "POST",
        "auth/v1/token?grant_type=password",
        json={"email": _normalize_email(email), "password": password},
    )


async def resend_confirmation_email(email: str) -> Tuple[int, Dict[str, Any]]:
    email_norm = _normalize_email(email)
    state = await check_existing_signup_state(email_norm)

    if state and state[0] == "confirmed":
        return (
            400,
            {
                "code": "ALREADY_REGISTERED",
                "message": "This email is already confirmed. Please sign in.",
            },
        )

    if not state:
        return (
            404,
            {
                "code": "ACCOUNT_NOT_FOUND",
                "message": "No signup found for this email. Create an account first.",
            },
        )

    user_id = state[1]
    if user_id and await admin_confirm_user(user_id):
        return (
            200,
            {
                "code": "SIGNUP_READY_SIGN_IN",
                "message": "Your account is ready. Sign in with your email and password.",
            },
        )

    redirect_to = email_confirmation_redirect_url()
    resp = await supabase.request(
        "POST",
        "auth/v1/resend",
        json={
            "type": "signup",
            "email": email_norm,
            "redirect_to": redirect_to,
            "options": {"email_redirect_to": redirect_to},
        },
    )
    if resp.status_code in (200, 201):
        return (
            200,
            {
                "code": "CONFIRMATION_EMAIL_SENT",
                "message": "Confirmation email sent. Check your inbox and spam folder.",
            },
        )

    err_code, err_msg = map_supabase_signup_error(resp)
    if err_code == "EMAIL_RATE_LIMIT":
        auth_user = await find_auth_user_by_email_admin(email_norm)
        if auth_user and auth_user.get("id"):
            meta = auth_user.get("user_metadata") or {}
            salvage_user = UserCreate(
                email=email_norm,
                password="ResendSalvage1!",
                name=str(meta.get("name") or "User"),
                phone=str(meta.get("phone") or "") or None,
                role=UserRole.owner if meta.get("role") == "owner" else UserRole.customer,
            )
            salvaged = await salvage_rate_limited_signup(salvage_user)
            if salvaged:
                return salvaged[0], salvaged[1]

        return (
            429,
            {
                "code": "AUTH_PROVIDER_EMAIL_QUOTA",
                "message": (
                    "You've made several email requests. New messages are paused for about an hour. "
                    "Check spam for an earlier confirmation link, then try again later with a single "
                    "request — repeated sign-ups won't send more emails until then."
                ),
            },
        )
    return 400, {"code": err_code, "message": err_msg}
