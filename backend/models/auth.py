from pydantic import BaseModel, EmailStr, Field
from typing import Optional
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

    Called immediately after OTP verification when no public.users row
    exists for the authenticated user. Role is required — there is no
    server-side default. Name is required (min 1 char). Phone is optional.

    upi_id is REQUIRED when role == 'owner' (salon owners are paid directly via
    UPI), and ignored for customers. Validated in the handler so we can return a
    structured error.
    """
    role: UserRole = Field(..., description="User role: 'customer', 'owner', or 'employee'. Required.")
    name: str = Field(..., min_length=1, max_length=100, description="Full display name.")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number (optional).")
    upi_id: Optional[str] = Field(
        None, max_length=256, description="Owner UPI VPA (required for owners), e.g. name@bank."
    )
