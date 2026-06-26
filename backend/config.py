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

    # Payment Providers
    STRIPE_SECRET_KEY: Optional[str] = None

    # ── Subscriptions (TrimiT Pro) ──────────────────────────────────────────
    # TEMPORARILY OFF: TrimiT is commission-based and free for owners. With this
    # false, `require_active_subscription` and the booking gate are no-op
    # pass-throughs — owners are NEVER blocked after trial. Set to true to
    # re-enable Phase 2 enforcement.
    SUBSCRIPTION_ENFORCEMENT_ENABLED: bool = False
    # Plan economics (paise). ₹299 / month.
    SUBSCRIPTION_PRICE_PAISE: int = 29900
    SUBSCRIPTION_TRIAL_DAYS: int = 14
    # Days after a failed charge before access is cut (past_due -> expired).
    SUBSCRIPTION_GRACE_DAYS: int = 3

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

    # ── PayU split payments ─────────────────────────────────────────────────
    # All fields are additive and default to safe values so the app boots even
    # when they are unset. Layer B (online charge/split) stays inert until
    # PAYU_PAYOUTS_ENABLED is true; Layer A (bank/KYC collection) only needs
    # FIELD_ENCRYPTION_KEY when its endpoints are exercised.
    #
    # Layer B gate — OFF by default. Live online payments only when true.
    PAYU_PAYOUTS_ENABLED: bool = False
    # PayU environment: "test" (sandbox) or "live". Independent of the flag.
    PAYU_MODE: str = "test"
    PAYU_MERCHANT_KEY: Optional[str] = None
    PAYU_MERCHANT_SALT: Optional[str] = None
    PAYU_TEST_MERCHANT_KEY: Optional[str] = None
    PAYU_TEST_MERCHANT_SALT: Optional[str] = None
    # Fernet key (urlsafe base64, 32 bytes) for encrypting bank/KYC sensitive
    # fields at rest. Never hardcode a fallback — encryption fails closed.
    FIELD_ENCRYPTION_KEY: Optional[str] = None
    # Commission economics. Default 5% TrimiT take; PayU fee ~2% (salon nets ~93%).
    PLATFORM_COMMISSION_PERCENT: float = 5.0   # Admin-adjustable override at runtime
    PAYU_FEE_PERCENT: float = 2.0              # gateway fee disclosed in total deduction

    model_config = SettingsConfigDict(
        env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
