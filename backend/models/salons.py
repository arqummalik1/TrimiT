from pydantic import BaseModel, Field
from typing import Optional, List

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
