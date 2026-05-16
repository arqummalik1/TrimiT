"""Map Supabase Auth API responses to stable app error codes and user-facing messages."""

from __future__ import annotations

from typing import Any


def safe_auth_response_json(response) -> dict[str, Any]:
    try:
        data = response.json()
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def map_supabase_signup_error(response) -> tuple[str, str]:
    """
    Returns (error_code, user_message) from a Supabase auth/v1/signup response.
  """
    data = safe_auth_response_json(response)
    status = response.status_code

    msg = (
        data.get("msg")
        or data.get("error_description")
        or data.get("message")
        or data.get("error")
        or ""
    )
    if isinstance(msg, dict):
        msg = msg.get("message") or str(msg)
    msg = str(msg).strip()

    error_code = str(data.get("error_code") or data.get("code") or "").lower()
    combined = f"{error_code} {msg}".lower()

    if "already registered" in combined or "user_already_exists" in combined:
        return (
            "ALREADY_REGISTERED",
            "An account with this email already exists. Try signing in or use Forgot password.",
        )

    if (
        "over_email_send_rate_limit" in combined
        or "email_rate_limit" in combined
        or "email rate limit" in combined
        or "too many emails" in combined
    ):
        return (
            "EMAIL_RATE_LIMIT",
            "Email delivery is temporarily limited for this app (Supabase project quota). "
            "We will try to activate your account automatically when possible.",
        )

    if "rate limit" in combined or "too many requests" in combined or status == 429:
        return (
            "RATE_LIMITED",
            "Too many signup attempts. Please wait a minute and try again.",
        )

    if "signup" in combined and "disabled" in combined:
        return (
            "SIGNUP_DISABLED",
            "New signups are temporarily disabled. Please try again later or contact support.",
        )

    if "invalid" in combined and "email" in combined:
        return (
            "INVALID_EMAIL",
            "That email address looks invalid. Check for typos and try again.",
        )

    if "password" in combined and ("weak" in combined or "short" in combined or "least" in combined):
        return (
            "WEAK_PASSWORD",
            "Password is too weak. Use at least 6 characters with a mix of letters and numbers.",
        )

    if msg:
        return "SIGNUP_FAILED", msg

    if status == 422:
        return "SIGNUP_FAILED", "Could not create account. Check your email and password and try again."

    return (
        "SIGNUP_FAILED",
        "Could not create account. Please try again in a minute or contact support if this continues.",
    )
