import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

# Validation patterns (Requirements 1.2, 1.8, 1.9)
IFSC_PATTERN = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
PINCODE_PATTERN = re.compile(r"^[1-9][0-9]{5}$")
GSTIN_PATTERN = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$")


class BankAccountCreate(BaseModel):
    """Full Bank_KYC_Record input submitted by a Salon_Owner.

    Model-level constraints are the first guard; on failure Pydantic raises a
    422. The service layer surfaces a structured ``{code, message}`` on top of
    these. Sensitive fields (full account number, PAN, GSTIN) are accepted in
    full here and stored encrypted at rest — they are never echoed back in any
    response model.
    """

    # --- Bank details ---
    account_name: str = Field(..., min_length=1, description="Beneficiary name on the bank account")
    account_number: str = Field(..., min_length=1, description="Full bank account number")
    ifsc_code: str = Field(..., description="Bank IFSC code")

    # --- KYC details ---
    pan: str = Field(..., description="PAN (Permanent Account Number)")
    business_name: str = Field(..., min_length=1, description="Business / legal name")
    contact_phone: str = Field(..., min_length=1, description="Contact phone number")
    contact_email: EmailStr = Field(..., description="Contact email address")
    address_line: str = Field(..., min_length=1, description="Registered address")
    pincode: str = Field(..., description="6-digit Indian pincode")
    gstin: Optional[str] = Field(default=None, description="Optional GSTIN")

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not IFSC_PATTERN.match(normalized):
            raise ValueError("Invalid IFSC code. Expected format like HDFC0001234.")
        return normalized

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not PAN_PATTERN.match(normalized):
            raise ValueError("Invalid PAN. Expected format like ABCDE1234F.")
        return normalized

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: str) -> str:
        normalized = value.strip()
        if not PINCODE_PATTERN.match(normalized):
            raise ValueError("Invalid pincode. Expected a 6-digit Indian pincode.")
        return normalized

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not normalized:
            return None
        if not GSTIN_PATTERN.match(normalized):
            raise ValueError("Invalid GSTIN.")
        return normalized


class BankAccountResponse(BaseModel):
    """Masked, owner-facing Bank_KYC_Record (Requirement 1.6).

    Never exposes the full bank account number, full PAN, or GSTIN. Only the
    last four digits of the account number and PAN are surfaced for display.
    """

    id: UUID
    salon_id: UUID
    account_name: str
    account_number_last4: str
    ifsc_code: str
    pan_last4: Optional[str] = None
    business_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address_line: Optional[str] = None
    pincode: Optional[str] = None
    vendor_status: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
