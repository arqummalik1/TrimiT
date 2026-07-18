"""
App Store Review OTP bypass — env-gated only.

When APP_REVIEW_OTP_EMAILS + APP_REVIEW_OTP_CODE are set on the server, those
emails accept the fixed code and receive a real Supabase session via admin
generate_link + verify (no inbox required). All other emails use normal OTP.

Never hardcode production emails/codes in source — configure on Render.
"""

from __future__ import annotations

import logging
import secrets
from typing import Any, Dict, Optional, Set

from config import settings
from core.supabase import supabase

logger = logging.getLogger("trimit")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def review_otp_emails() -> Set[str]:
    raw = (settings.APP_REVIEW_OTP_EMAILS or "").strip()
    if not raw:
        return set()
    return {_normalize_email(part) for part in raw.split(",") if part.strip()}


def review_otp_code() -> Optional[str]:
    code = (settings.APP_REVIEW_OTP_CODE or "").strip()
    return code or None


def is_app_review_otp_email(email: str) -> bool:
    emails = review_otp_emails()
    code = review_otp_code()
    if not emails or not code:
        return False
    return _normalize_email(email) in emails


def review_otp_matches(email: str, token: str) -> bool:
    """True when email is allowlisted and token matches the configured code."""
    if not is_app_review_otp_email(email):
        return False
    expected = review_otp_code()
    if not expected:
        return False
    # Constant-time compare (pad lengths via secrets.compare_digest on equal-length only)
    provided = (token or "").strip()
    if len(provided) != len(expected):
        return False
    return secrets.compare_digest(provided, expected)


async def mint_session_for_review_email(email: str) -> Dict[str, Any]:
    """
    Create a Supabase session for an allowlisted review email without inbox OTP.

    Uses admin generate_link (magiclink) then verifies the hashed_token.
    """
    email_norm = _normalize_email(email)
    link_resp = await supabase.request(
        "POST",
        "auth/v1/admin/generate_link",
        service_role=True,
        json={"type": "magiclink", "email": email_norm},
    )
    if link_resp.status_code not in (200, 201):
        logger.error(
            "app_review generate_link failed status=%s email=%s body=%s",
            link_resp.status_code,
            email_norm,
            link_resp.text[:200] if link_resp.text else "",
        )
        raise RuntimeError("Could not create review session")

    payload = link_resp.json() if link_resp.text else {}
    props = payload.get("properties") if isinstance(payload, dict) else None
    if not isinstance(props, dict):
        props = {}
    hashed = props.get("hashed_token")
    if not hashed or not isinstance(hashed, str):
        logger.error("app_review generate_link missing hashed_token email=%s", email_norm)
        raise RuntimeError("Could not create review session")

    # Prefer magiclink; fall back to email if GoTrue rejects the type.
    verify_payload = {"type": "magiclink", "token_hash": hashed}
    verify_resp = await supabase.request("POST", "auth/v1/verify", json=verify_payload)
    if verify_resp.status_code not in (200, 201):
        verify_payload = {"type": "email", "token_hash": hashed}
        verify_resp = await supabase.request("POST", "auth/v1/verify", json=verify_payload)

    if verify_resp.status_code not in (200, 201):
        logger.error(
            "app_review verify failed status=%s email=%s body=%s",
            verify_resp.status_code,
            email_norm,
            verify_resp.text[:200] if verify_resp.text else "",
        )
        raise RuntimeError("Could not create review session")

    auth_data = verify_resp.json()
    if not isinstance(auth_data, dict) or not auth_data.get("access_token"):
        raise RuntimeError("Could not create review session")

    logger.info("app_review OTP session minted email=%s", email_norm)
    return auth_data
