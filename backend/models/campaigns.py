from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class CampaignGrantResponse(BaseModel):
    id: str
    code: str
    issued_at: str
    expires_at: str
    redeemed_at: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_value: Optional[float] = None
    campaign_name: Optional[str] = None


class CheckoutOfferItem(BaseModel):
    code: str
    description: Optional[str] = None
    discount_amount: Optional[float] = None
    final_amount: float
    source: str
    expires_at: Optional[str] = None
    auto_apply: Optional[bool] = None


class CheckoutOffersRequest(BaseModel):
    salon_id: str
    list_price: float = Field(..., gt=0)
    offer_price: float = Field(..., gt=0)


class CheckoutOffersResponse(BaseModel):
    salon_offers: List[CheckoutOfferItem]
    platform_offers: List[CheckoutOfferItem]
    best_price: float
    discount_source: str
    auto_apply: Optional[CheckoutOfferItem] = None


class AdminCampaignUpdate(BaseModel):
    active: Optional[bool] = None
    discount_value: Optional[float] = Field(None, gt=0)
    min_order_value: Optional[float] = Field(None, ge=0)
    validity_days: Optional[int] = Field(None, ge=1, le=90)
    auto_apply: Optional[bool] = None
    description: Optional[str] = None


class SalonExclusionRequest(BaseModel):
    salon_id: str


class SalonExclusionBulkRequest(BaseModel):
    salon_ids: List[str]
    excluded: bool = True
