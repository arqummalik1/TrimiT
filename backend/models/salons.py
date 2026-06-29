import re

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

# IFSC: 4 uppercase letters + '0' + 6 alphanumeric chars
_IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
# UPI VPA: handle@provider (e.g. glowsalon@okaxis). Lenient on the local part.
_UPI_RE = re.compile(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$")


def _validate_upi(v: Optional[str]) -> Optional[str]:
    if v is None or v.strip() == "":
        return None
    v = v.strip()
    if not _UPI_RE.match(v):
        raise ValueError("Invalid UPI ID format. Expected something like name@bank.")
    return v

class SalonCreate(BaseModel):
    name: str
    address: str
    city: str  # Required in database
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: str  # Required in database
    image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    opening_time: str = "09:00"
    closing_time: str = "21:00"
    about: Optional[str] = None
    description: Optional[str] = None
    auto_accept: bool = False
    allow_multiple_bookings_per_slot: bool = False
    max_bookings_per_slot: int = 1
    # UPI payments (v1): salon receives money directly. upi_id is required to
    # offer "Pay with UPI"; the rest are optional onboarding details.
    upi_id: Optional[str] = None
    upi_qr_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    # Banking details — legacy columns retained for back-compat.
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_account_holder_name: Optional[str] = None

    @field_validator("upi_id")
    @classmethod
    def validate_upi_create(cls, v: Optional[str]) -> Optional[str]:
        return _validate_upi(v)

    @field_validator("bank_ifsc")
    @classmethod
    def validate_ifsc(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        v = v.strip().upper()
        if not _IFSC_RE.match(v):
            raise ValueError("Invalid IFSC code format. Expected: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234)")
        return v

class SalonUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    about: Optional[str] = None
    description: Optional[str] = None
    auto_accept: Optional[bool] = None
    allow_multiple_bookings_per_slot: Optional[bool] = None
    max_bookings_per_slot: Optional[int] = None
    show_offers: Optional[bool] = None
    # UPI payments (v1)
    upi_id: Optional[str] = None
    upi_qr_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    # Banking details — legacy
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_account_holder_name: Optional[str] = None

    @field_validator("upi_id")
    @classmethod
    def validate_upi_update(cls, v: Optional[str]) -> Optional[str]:
        return _validate_upi(v)

    @field_validator("bank_ifsc")
    @classmethod
    def validate_ifsc(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        v = v.strip().upper()
        if not _IFSC_RE.match(v):
            raise ValueError("Invalid IFSC code format. Expected: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234)")
        return v

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: int
    duration: int  # in minutes
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_on_offer: bool = False
    discount_percentage: Optional[int] = None
    original_price: Optional[int] = None
    offer_end_date: Optional[str] = None  # YYYY-MM-DD
    offer_tagline: Optional[str] = None

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    duration: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_on_offer: Optional[bool] = None
    discount_percentage: Optional[int] = None
    original_price: Optional[int] = None
    offer_end_date: Optional[str] = None
    offer_tagline: Optional[str] = None
