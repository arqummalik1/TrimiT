"""
Reschedule Models
─────────────────────────────────────────────────────────────────────────────
Pydantic models for booking reschedule operations.
"""

from pydantic import BaseModel, Field, validator
from datetime import date
from typing import Optional


class RescheduleRequest(BaseModel):
    """Request to reschedule a booking"""
    new_date: date = Field(..., description="New booking date")
    new_time_slot: str = Field(..., description="New time slot (HH:MM format)")
    reason: Optional[str] = Field(None, description="Optional reason for rescheduling")

    @validator('new_time_slot')
    def validate_time_slot(cls, v):
        """Validate time slot format"""
        if not v or len(v) != 5 or v[2] != ':':
            raise ValueError('Time slot must be in HH:MM format')
        
        try:
            hours, minutes = v.split(':')
            h, m = int(hours), int(minutes)
            if not (0 <= h < 24 and 0 <= m < 60):
                raise ValueError('Invalid time')
        except (ValueError, IndexError):
            raise ValueError('Time slot must be in HH:MM format with valid hours and minutes')
        
        return v

    @validator('new_date')
    def validate_future_date(cls, v):
        """Ensure date is not in the past"""
        from datetime import date as dt_date
        if v < dt_date.today():
            raise ValueError('Cannot reschedule to a past date')
        return v


class RescheduleResponse(BaseModel):
    """Response from reschedule operation"""
    success: bool
    booking_id: str
    old_date: Optional[date] = None
    old_time_slot: Optional[str] = None
    new_date: Optional[date] = None
    new_time_slot: Optional[str] = None
    reschedule_count: Optional[int] = None
    error: Optional[str] = None


class RescheduleHistory(BaseModel):
    """Reschedule history record"""
    id: str
    old_date: date
    old_time_slot: str
    new_date: date
    new_time_slot: str
    initiated_by_role: str
    reason: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
