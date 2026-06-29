import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the directory of the current file (config.py)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")


class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Auth Secret
    JWT_SECRET: str

    # Sentry Configuration
    SENTRY_DSN: Optional[str] = None
    ENVIRONMENT: str = "development"

    # Admin endpoints (broadcast notifications, ops). Static bearer token for
    # v1; admin endpoints check `Authorization: Bearer <ADMIN_API_TOKEN>`.
    # Leave unset in dev/staging to disable admin endpoints entirely.
    ADMIN_API_TOKEN: Optional[str] = None
    # Admin web dashboard PIN (6–10 digits). Entered on the /admin web page to
    # unlock the dashboard; the server exchanges it (constant-time, rate-limited)
    # for the ADMIN_API_TOKEN, which never ships in client code. Unset → the
    # dashboard login is disabled.
    ADMIN_DASHBOARD_PIN: Optional[str] = None

    # Payment Providers
    STRIPE_SECRET_KEY: Optional[str] = None

    # ── Subscriptions (TrimiT Pro) ──────────────────────────────────────────
    # ENFORCEMENT ON: owners get a free trial; when it lapses (and no active paid
    # subscription) the owner app is frozen ("subscription expired") and their
    # salon is hidden/greyed for customers (no new bookings). Set false to make
    # `require_active_subscription` and the booking gate no-op pass-throughs.
    SUBSCRIPTION_ENFORCEMENT_ENABLED: bool = True
    # Plan economics (paise). ₹299 / month.
    SUBSCRIPTION_PRICE_PAISE: int = 29900
    SUBSCRIPTION_TRIAL_DAYS: int = 30
    # Days after a failed charge before access is cut (past_due -> expired).
    SUBSCRIPTION_GRACE_DAYS: int = 3

    # ── Razorpay (owner subscription billing) ───────────────────────────────
    # In-app paid subscriptions only work once these are set (create a ₹299/mo
    # plan in the Razorpay dashboard and paste the ids/keys here / in Render).
    # While unset, the trial + enforcement still work; owners just can't pay
    # in-app yet (use the admin grant endpoint to activate a salon meanwhile).
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_PLAN_ID: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    # Resend (transactional email) for subscription invoices/receipts. Optional:
    # if RESEND_API_KEY is unset, receipt emails are skipped (logged), never error.
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "TrimiT <billing@trimit.online>"

    # API Keys
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # App Settings
    PORT: int = 8000
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "https://trimit.online,https://www.trimit.online,http://localhost:3000,http://localhost:4173,http://localhost:8081"
    # Web base URL for auth email links (allowlist in Supabase Auth → URL configuration):
    # - {PUBLIC_SITE_URL}/reset-password
    # - {PUBLIC_SITE_URL}/auth/email-confirmed
    PUBLIC_SITE_URL: str = "https://trimit.online"
    # Staging only: create pre-confirmed users (no Supabase confirmation email).
    # Production must use Custom SMTP in Supabase for scalable signups.
    AUTH_AUTO_CONFIRM_SIGNUP: bool = False

    # API Keys
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
