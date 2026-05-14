"""
Reschedule Models
─────────────────────────────────────────────────────────────────────────────
Pydantic models for booking reschedule operations (Pydantic v2).
"""

from __future__ import annotations

from datetime import date as Date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RescheduleRequest(BaseModel):
    """Request to reschedule a booking (PATCH body)."""

    new_date: Date = Field(..., description="New booking date (YYYY-MM-DD)")
    new_time_slot: str = Field(..., description="New time slot (HH:MM or HH:MM:SS)")
    reason: Optional[str] = Field(None, description="Optional reason for rescheduling")

    @field_validator("new_time_slot", mode="before")
    @classmethod
    def normalize_time_slot(cls, v: object) -> str:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            raise ValueError("new_time_slot is required")
        s = str(v).strip()
        # DB may return HH:MM:SS; slot API uses HH:MM — normalize to first 5 chars when possible
        if len(s) >= 5 and s[2] == ":":
            head = s[:5]
            parts = head.split(":")
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                h, m = int(parts[0]), int(parts[1])
                if 0 <= h < 24 and 0 <= m < 60:
                    return f"{h:02d}:{m:02d}"
        raise ValueError("Time slot must be in HH:MM format with valid hours and minutes")

    @field_validator("new_date")
    @classmethod
    def validate_future_date(cls, v: Date) -> Date:
        if v < Date.today():
            raise ValueError("Cannot reschedule to a past date")
        return v


class RescheduleResponse(BaseModel):
    """Response from reschedule operation"""

    success: bool
    booking_id: str
    old_date: Optional[Date] = None
    old_time_slot: Optional[str] = None
    new_date: Optional[Date] = None
    new_time_slot: Optional[str] = None
    reschedule_count: Optional[int] = None
    error: Optional[str] = None


class RescheduleHistory(BaseModel):
    """Reschedule history record"""

    id: str
    old_date: Date
    old_time_slot: str
    new_date: Date
    new_time_slot: str
    initiated_by_role: str
    reason: Optional[str] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)
