# Email Dispatch Rule — Single Source of Truth

> This rule applies to ALL transactional emails in TrimiT: OTP, verification,
> password reset, subscription receipts, broadcasts, and any future email types.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 EMAIL DISPATCH FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Supabase Auth Emails (OTP, verification, reset):       │
│    Supabase Auth API → Supabase SMTP → Resend SMTP      │
│    (Automatic — no code needed, configured in Dashboard) │
│                                                         │
│  Custom Emails (receipts, invoices, broadcasts):        │
│    email_dispatch.send_email() → Resend API             │
│    (Uses RESEND_API_KEY from env)                       │
│                                                         │
│  Fallback for Custom Emails:                            │
│    If RESEND_API_KEY is unset → log + skip (no-op)      │
│    Never breaks payment/webhook flows                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Primary: Supabase SMTP (Resend)

- Supabase Dashboard → Authentication → SMTP is configured with:
  - **Host**: `smtp.resend.com`
  - **Port**: `465`
  - **Username**: `resend`
  - **Password**: Your Resend API key
  - **Sender**: `noreply@trimit.online`
- This means ALL Supabase Auth emails (OTP, magic links, verification, password
  reset) automatically route through Resend's SMTP infrastructure.
- Resend has dedicated IP pools, high deliverability, and fast delivery (~1-3s).

## Fallback: Basic Supabase Email

- If Supabase SMTP fails (misconfigured, Resend outage), Supabase falls back to
  its built-in email service (shared pool, ~2-4 emails/hour limit).
- This is automatic — Supabase handles the fallback internally.

## Custom Emails: `email_dispatch.py`

- For emails that Supabase Auth does NOT handle (receipts, invoices, broadcasts):
  - Use `backend/services/email_dispatch.py` → `send_email()`.
  - This calls the Resend REST API directly (same Resend API key).
  - If `RESEND_API_KEY` is unset, emails are logged and skipped (never errors).

## Rules

1. **Never call the Resend API directly from routers or other services.**
   Always use `email_dispatch.send_email()` for custom emails.
2. **Never bypass Supabase Auth for OTP/verification/reset emails.**
   Those are handled by Supabase's `auth/v1/otp`, `auth/v1/resend`, `auth/v1/recover`.
3. **Never hard-code API keys, passwords, or credentials in source code.**
   Use environment variables (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).
4. **All email-related changes must be tested on BOTH mobile and web.**
5. **If email delivery fails, log it clearly but NEVER break the parent flow**
   (e.g., a failed receipt email must NOT break a payment webhook).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Optional (recommended) | Resend API key for custom emails. Also used as SMTP password in Supabase. |
| `RESEND_FROM_EMAIL` | Yes (has default) | Sender address for custom emails. Default: `TrimiT <billing@trimit.online>` |

## Why This Architecture

- **Speed**: Resend SMTP delivers in ~1-3 seconds vs Supabase's shared pool (~10-30s).
- **Reliability**: Dedicated IP pools, no shared rate limits.
- **Simplicity**: Single API key, single provider, single configuration.
- **Safety**: Fallback to basic Supabase email if SMTP fails.
- **Separation**: Auth emails flow through Supabase (no code changes needed);
  custom emails flow through `email_dispatch` (one function to maintain).
