"""
Subscription invoice / receipt emails.

Uses the unified email_dispatch module (Supabase SMTP → Resend as single source
of truth). Graceful: if RESEND_API_KEY is not configured, email_dispatch no-ops
(logs and returns False) — it must never break the payment/webhook flow.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from config import settings
from core.supabase import supabase
from services.email_dispatch import send_email as dispatch_email

logger = logging.getLogger("trimit")


async def _fetch_owner_contact(owner_id: str) -> tuple[Optional[str], str]:
    """Return (email, name) for an owner from public.users (service role)."""
    resp = await supabase.request(
        "GET",
        f"rest/v1/users?id=eq.{owner_id}&select=email,name",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        row = resp.json()[0]
        return row.get("email"), row.get("name") or "Salon Owner"
    return None, "Salon Owner"


def _fmt_date(iso: Optional[str]) -> str:
    if not iso:
        return datetime.now(timezone.utc).strftime("%d %b %Y")
    try:
        text = iso.replace("Z", "+00:00")
        return datetime.fromisoformat(text).strftime("%d %b %Y")
    except ValueError:
        return iso


def _receipt_html(
    *,
    owner_name: str,
    amount_paise: int,
    payment_id: Optional[str],
    paid_on: str,
    next_renewal: Optional[str],
) -> str:
    amount = f"₹{amount_paise / 100:.0f}"
    renewal_row = (
        f"<tr><td style='padding:6px 0;color:#6b7280'>Next renewal</td>"
        f"<td style='padding:6px 0;text-align:right;font-weight:600'>{_fmt_date(next_renewal)}</td></tr>"
        if next_renewal
        else ""
    )
    return f"""<!DOCTYPE html><html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #e7e5e4;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 4px;font-size:20px">TrimiT Pro — Payment receipt</h1>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Thank you, {owner_name}. Your subscription payment was successful.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#6b7280">Plan</td><td style="padding:6px 0;text-align:right;font-weight:600">TrimiT Pro (Monthly)</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Amount paid</td><td style="padding:6px 0;text-align:right;font-weight:700">{amount}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Paid on</td><td style="padding:6px 0;text-align:right;font-weight:600">{paid_on}</td></tr>
        {renewal_row}
        <tr><td style="padding:6px 0;color:#6b7280">Payment ID</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px">{payment_id or '—'}</td></tr>
      </table>
      <p style="margin:22px 0 0;color:#9ca3af;font-size:12px;line-height:18px">
        This is an automated receipt for your TrimiT Pro subscription. Payments are
        processed securely by Razorpay. For help, contact TrimiT support.
      </p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">© TrimiT</p>
  </div>
</body></html>"""


async def send_payment_receipt(
    *,
    owner_id: str,
    amount_paise: int,
    payment_id: Optional[str],
    paid_at: Optional[str] = None,
    next_renewal_at: Optional[str] = None,
) -> bool:
    email, name = await _fetch_owner_contact(owner_id)
    if not email:
        logger.warning("[Sub][Invoice] no email for owner=%s; skipping receipt", owner_id[:8])
        return False

    html = _receipt_html(
        owner_name=name,
        amount_paise=amount_paise,
        payment_id=payment_id,
        paid_on=_fmt_date(paid_at),
        next_renewal=next_renewal_at,
    )

    subject = f"TrimiT Pro receipt — ₹{amount_paise / 100:.0f}"
    sent = await dispatch_email(
        to=email,
        subject=subject,
        html_body=html,
        tags={"category": "subscription_receipt", "owner_id": owner_id[:8]},
    )
    if sent:
        logger.info("[Sub][Invoice] receipt sent owner=%s", owner_id[:8])
    return sent
