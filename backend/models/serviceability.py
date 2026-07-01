from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class WaitlistJoin(BaseModel):
    """Payload when an out-of-area user asks to be notified at launch."""

    email: EmailStr
    name: Optional[str] = Field(default=None, max_length=120)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    area_label: Optional[str] = Field(default=None, max_length=200)
    source: Optional[str] = Field(default="mobile", max_length=20)
