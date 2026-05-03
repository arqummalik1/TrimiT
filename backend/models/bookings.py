from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"

class BookingCreate(BaseModel):
    salon_id: str
    service_id: str
    booking_date: str
    time_slot: str
    payment_method: str = "salon_cash"
    promo_code: Optional[str] = None

class BookingStatusUpdate(BaseModel):
    status: BookingStatus

class ReviewCreate(BaseModel):
    salon_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class SlotReserve(BaseModel):
    salon_id: str
    service_id: str
    booking_date: str
    time_slot: str
