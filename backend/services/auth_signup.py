"""
Signup orchestration — avoid duplicate confirmation emails and handle Supabase rate limits.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from core.supabase import supabase
from models.auth import UserCreate
from services.auth_errors import map_supabase_signup_error, safe_auth_response_json
from services.user_profile import fetch_profile_service_role, upsert_user_profile

logger = logging.getLogger("trimit")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def _fetch_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        f"rest/v1/users?email=ilike.{_normalize_email(email)}&select=id,email,role,name,phone",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
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


async def _ensure_profile(
    user_id: str,
    payload: UserCreate,
) -> Dict[str, Any]:
    profile_data = {
        "id": user_id,
        "email": _normalize_email(payload.email),
        "name": payload.name,
        "phone": payload.phone,
        "role": payload.role.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return await upsert_user_profile(user_id, profile_data, prefer_incoming_role=True)


async def pending_confirmation_response(
    *,
    email: str,
    user_id: Optional[str],
    message: str,
    resent: bool = False,
) -> Tuple[int, Dict[str, Any]]:
    body: Dict[str, Any] = {
        "code": "EMAIL_CONFIRMATION_REQUIRED",
        "message": message,
        "email": email,
        "resent": resent,
    }
    if user_id:
        body["user"] = {"id": user_id, "email": email}
    return 202, body


async def check_existing_signup_state(email: str) -> Optional[Tuple[str, Optional[str]]]:
    """
    Returns (state, user_id) where state is:
    - confirmed — user can log in
    - pending — waiting on email link
    - none — no account
    """
    profile = await _fetch_profile_by_email(email)
    if not profile:
        return None

    user_id = profile.get("id")
    if not user_id:
        return None

    auth_user = await _fetch_auth_user_admin(user_id)
    if auth_user and _is_email_confirmed(auth_user):
        return ("confirmed", user_id)
    return ("pending", user_id)


async def try_idempotent_signup(user: UserCreate) -> Optional[Tuple[int, Dict[str, Any]]]:
    """
    If account already exists, return appropriate response without calling auth signup
    (prevents extra confirmation emails and rate-limit errors).
    """
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

    return await pending_confirmation_response(
        email=_normalize_email(user.email),
        user_id=user_id,
        message=(
            "This email already has a pending account. Check your inbox (and spam) for the "
            "confirmation link, then sign in. We did not send another email to avoid spam limits."
        ),
        resent=False,
    )


async def perform_supabase_signup(user: UserCreate):
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
        },
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
                "message": "No pending signup found for this email. Create an account first.",
            },
        )

    resp = await supabase.request(
        "POST",
        "auth/v1/resend",
        json={"type": "signup", "email": email_norm},
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
        return (
            429,
            {
                "code": "EMAIL_RATE_LIMIT",
                "message": (
                    "Please wait a few minutes before requesting another email. "
                    "If you already received a link, use that one to confirm your account."
                ),
            },
        )
    return 400, {"code": err_code, "message": err_msg}
