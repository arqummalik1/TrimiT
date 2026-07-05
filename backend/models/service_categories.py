from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ServiceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    sort_order: Optional[int] = Field(None, ge=0)


class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    sort_order: Optional[int] = Field(None, ge=0)
    active: Optional[bool] = None


class ServiceCategoryResponse(BaseModel):
    id: str
    salon_id: str
    name: str
    sort_order: int
    active: bool
    service_count: Optional[int] = 0
    created_at: Optional[datetime] = None
