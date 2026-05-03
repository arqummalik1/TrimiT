from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime

class DiscountType(str, Enum):
    flat = "flat"
    percent = "percent"

class PromoCodeValidate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    salon_id: str
    booking_amount: float = Field(..., gt=0)

class PromoCodeResponse(BaseModel):
    valid: bool
    promo_id: Optional[str] = None
    discount_amount: Optional[float] = None
    final_amount: Optional[float] = None
    description: Optional[str] = None
    error: Optional[str] = None

class PromotionCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: float = Field(..., gt=0)
    max_discount: Optional[float] = Field(None, gt=0)
    min_order_value: Optional[float] = Field(0, ge=0)
    expires_at: Optional[datetime] = None
    salon_id: Optional[str] = None  # NULL = global promo
    usage_limit: Optional[int] = Field(None, gt=0)

class PromotionUpdate(BaseModel):
    description: Optional[str] = None
    discount_value: Optional[float] = Field(None, gt=0)
    max_discount: Optional[float] = Field(None, gt=0)
    min_order_value: Optional[float] = Field(None, ge=0)
    expires_at: Optional[datetime] = None
    usage_limit: Optional[int] = Field(None, gt=0)
    active: Optional[bool] = None

class PromotionStats(BaseModel):
    total_usage: int
    total_discount_given: float
    unique_users: int
    conversion_rate: float
