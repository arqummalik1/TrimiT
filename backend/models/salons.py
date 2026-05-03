from pydantic import BaseModel, Field
from typing import Optional, List

class SalonCreate(BaseModel):
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    image_url: Optional[str] = None
    opening_time: str = "09:00"
    closing_time: str = "21:00"
    about: Optional[str] = None
    auto_accept: bool = False
    allow_multiple_bookings_per_slot: bool = False
    max_bookings_per_slot: int = 1

class SalonUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    image_url: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    about: Optional[str] = None
    auto_accept: Optional[bool] = None
    allow_multiple_bookings_per_slot: Optional[bool] = None
    max_bookings_per_slot: Optional[int] = None

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
