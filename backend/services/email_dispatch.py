"""
Unified email dispatch — single source of truth for ALL transactional emails.

Architecture:
  Primary  → Supabase Custom SMTP (configured with Resend API key as password).
             This covers OTP, verification, password reset, magic links automatically
             via Supabase Auth endpoints (auth/v1/otp, auth/v1/resend, auth/v1/recover).
  Fallback → Direct Resend API (https://api.resend.com/emails) for custom emails
             (receipts, invoices, broadcasts) that Supabase Auth doesn't handle.
             If RESEND_API_KEY is unset, custom emails are logged and skipped (no-op).

Why Supabase SMTP + Resend is the primary:
  - Resend SMTP has dedicated IP pools, high deliverability, fast delivery (~1-3s).
  - Supabase's built-in email uses a shared pool with aggressive rate limits (~2-4/hr).
  - Our Supabase project is already configured with Resend SMTP credentials.
  - All Supabase Auth emails (OTP, verification, reset) route through Resend automatically.

This module is used for CUSTOM emails only (receipts, broadcasts). Supabase Auth emails
flow through Supabase → SMTP → Resend without touching this module.

Rules:
  - Never bypass this module for custom emails.
  - Never call Resend API directly from routers or other services.
  - OTP / auth emails flow through Supabase Auth endpoints (not this module).
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger("trimit")

RESEND_ENDPOINT = "https://api.resend.com/emails"

# Default timeout for email API calls (seconds).
_EMAIL_TIMEOUT = httpx.Timeout(15.0, connect=10.0)


async def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
    tags: Optional[dict[str, str]] = None,
) -> bool:
    """
    Send a custom transactional email via Resend API.

    This is for emails that Supabase Auth does NOT handle (receipts, invoices,
    broadcasts). Supabase Auth emails (OTP, verification, password reset) flow
    through Supabase's SMTP config automatically — do NOT use this function for those.

    Returns True on success, False on failure (never raises).
    """
    if not settings.RESEND_API_KEY:
        logger.info(
            "[EmailDispatch] RESEND_API_KEY not set; skipping email to=%s subject=%s",
            _mask_email(to),
            subject[:50],
        )
        return False

    sender = from_email or settings.RESEND_FROM_EMAIL

    payload: dict = {
        "from": sender,
        "to": [to],
        "subject": subject,
        "html": html_body,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    if tags:
        payload["tags"] = [{"name": k, "value": v} for k, v in tags.items()]

    try:
        async with httpx.AsyncClient(timeout=_EMAIL_TIMEOUT) as client:
            resp = await client.post(
                RESEND_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code in (200, 201):
            logger.info(
                "[EmailDispatch] sent via Resend to=%s subject=%s",
                _mask_email(to),
                subject[:50],
            )
            return True

        logger.error(
            "[EmailDispatch] Resend failed status=%s to=%s body=%s",
            resp.status_code,
            _mask_email(to),
            resp.text[:300],
        )
        return False

    except Exception as e:
        logger.error(
            "[EmailDispatch] Resend exception to=%s: %s",
            _mask_email(to),
            e,
        )
        return False


def _mask_email(email: str) -> str:
    """Redact email for logs: keep first 2 chars of local part + domain."""
    try:
        local, _, domain = (email or "").partition("@")
        if not domain:
            return "***"
        shown = local[:2] if len(local) > 2 else local[:1]
        return f"{shown}***@{domain}"
    except Exception:
        return "***"
