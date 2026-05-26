from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    customer = "customer"
    owner = "owner"

class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    name: str
    phone: Optional[str] = None
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    push_token: Optional[str] = None

class NotificationPreferencesUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    notify_bookings: Optional[bool] = None
    notify_booking_updates: Optional[bool] = None
    notify_promotional: Optional[bool] = None
    notify_reminders: Optional[bool] = None

class PushTokenUpdate(BaseModel):
    push_token: Optional[str] = Field(
        None,
        description="Expo push token (ExponentPushToken[...]) or null to unregister",
    )

class ResendConfirmationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    redirect_to: Optional[str] = None


class ConfirmEmailCallbackRequest(BaseModel):
    """Tokens from Supabase email link (web confirmation page fallback)."""
    token_hash: Optional[str] = None
    token: Optional[str] = None
    type: str = "signup"

class ValidateTokenRequest(BaseModel):
    token: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class OtpType(str, Enum):
    signup = "signup"
    recovery = "recovery"
    magiclink = "magiclink"

class SendOtpRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    token: str
    type: OtpType
    # Signup-only: client's intended role from the SignupScreen. Used ONLY when
    # the user does not yet have a public.users row — i.e. account creation.
    # Once a profile exists, the server ignores this field (no escalation).
    role: Optional[UserRole] = None
    name: Optional[str] = None
    phone: Optional[str] = None

