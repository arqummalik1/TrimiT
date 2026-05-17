import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from functools import lru_cache

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
    API_SIGNING_SECRET: Optional[str] = None  # Made optional with default
    
    # Sentry Configuration
    SENTRY_DSN: Optional[str] = None
    ENVIRONMENT: str = "development"
    
    # Payment Providers
    STRIPE_SECRET_KEY: Optional[str] = None
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    
    # API Keys
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    
    # App Settings
    PORT: int = 8000
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "https://trimit.online,https://www.trimit.online,http://localhost:3000,http://localhost:8081"
    # Web base URL for auth email links (allowlist in Supabase Auth → URL configuration):
    # - {PUBLIC_SITE_URL}/reset-password
    # - {PUBLIC_SITE_URL}/auth/email-confirmed
    PUBLIC_SITE_URL: str = "https://trimit.online"
    # Staging only: create pre-confirmed users (no Supabase confirmation email).
    # Production must use Custom SMTP in Supabase for scalable signups.
    AUTH_AUTO_CONFIRM_SIGNUP: bool = False

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
