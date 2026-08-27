from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, Literal
from enum import Enum

class UserRole(str, Enum):
    customer = "customer"
    owner = "owner"
    employee = "employee"

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
    gender: Optional[Literal["male", "female"]] = None
    discovery_audience: Optional[Literal["auto", "men", "women", "all"]] = None

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


class AccountDeletionRequest(BaseModel):
    """Optional provider proof used to revoke Sign in with Apple access."""

    apple_authorization_code: Optional[str] = Field(None, max_length=4096)

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
    """Accept `password` (canonical) or legacy mobile `new_password`."""

    token: str
    password: Optional[str] = None
    new_password: Optional[str] = None

    @model_validator(mode="after")
    def coalesce_password(self) -> "ResetPasswordRequest":
        resolved = (self.password or self.new_password or "").strip()
        if len(resolved) < 6:
            raise ValueError("Password must be at least 6 characters")
        self.password = resolved
        return self

class OtpType(str, Enum):
    signup = "signup"
    recovery = "recovery"
    magiclink = "magiclink"

class SendOtpRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    """
    OTP verification payload.

    role / name / phone have been intentionally removed. Profile creation
    now happens in a dedicated POST /auth/complete-profile step after the
    user is authenticated. This eliminates the brittle pendingSignupStore
    pattern and makes profile creation server-enforced and cross-device safe.
    """
    email: EmailStr
    token: str
    type: OtpType


class CompleteProfileRequest(BaseModel):
    """
    Payload for POST /auth/complete-profile.

    Creates the application profile after authentication. Role remains explicit
    and server-validated, while identity and role-specific setup fields are
    progressive: provider name is used when available, phone is collected when
    a customer books, and owner payment details are collected during salon setup.

    Employee claims are the exception: the invite phone is required so the
    backend can link the authenticated identity to a pending staff invitation.
    """
    role: UserRole = Field(..., description="User role: 'customer', 'owner', or 'employee'. Required.")
    name: Optional[str] = Field(None, max_length=100, description="Provider display name, when available.")
    phone: Optional[str] = Field(None, min_length=10, max_length=20, description="Indian mobile number.")
    upi_id: Optional[str] = Field(
        None, max_length=256, description="Owner UPI VPA (required for owners), e.g. name@bank."
    )
    gender: Optional[Literal["male", "female"]] = Field(
        None, description="Customer gender for personalized discovery."
    )
