"""
Staff Management Models
Handles staff profiles, service assignments, and availability
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, time
from decimal import Decimal
from uuid import UUID


# =====================================================
# WORKING HOURS MODELS
# =====================================================

class WorkingHoursDay(BaseModel):
    """Working hours for a single day"""
    enabled: bool = True
    start: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")  # HH:MM format
    end: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    breaks: List[Dict[str, str]] = []  # List of {start, end} break times
    
    @validator('end')
    def end_after_start(cls, v, values):
        if 'start' in values and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v


class WorkingHours(BaseModel):
    """Complete weekly working hours"""
    monday: WorkingHoursDay
    tuesday: WorkingHoursDay
    wednesday: WorkingHoursDay
    thursday: WorkingHoursDay
    friday: WorkingHoursDay
    saturday: WorkingHoursDay
    sunday: WorkingHoursDay


# =====================================================
# STAFF MODELS
# =====================================================

class StaffBase(BaseModel):
    """Base staff model"""
    name: str = Field(..., min_length=2, max_length=100)
    bio: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    email: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None
    days_off: List[str] = []  # ISO date strings
    is_active: bool = True


class StaffCreate(StaffBase):
    """Create new staff member"""
    salon_id: UUID


class StaffUpdate(BaseModel):
    """Update staff member (all fields optional)"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    bio: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    email: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None
    days_off: Optional[List[str]] = None
    is_active: Optional[bool] = None


class StaffResponse(StaffBase):
    """Staff response with computed fields"""
    id: UUID
    salon_id: UUID
    image_url: Optional[str] = None
    average_rating: Decimal = Field(default=Decimal("0.00"))
    total_reviews: int = 0
    total_bookings: int = 0
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


class StaffWithServices(StaffResponse):
    """Staff with their assigned services"""
    services: List[Dict[str, Any]] = []


# =====================================================
# STAFF SERVICE ASSIGNMENT MODELS
# =====================================================

class StaffServiceAssignment(BaseModel):
    """Assign a service to a staff member"""
    staff_id: UUID
    service_id: UUID
    custom_price: Optional[Decimal] = Field(None, ge=0)
    custom_duration: Optional[int] = Field(None, gt=0)  # minutes


class StaffServiceResponse(BaseModel):
    """Staff service assignment response"""
    id: UUID
    staff_id: UUID
    service_id: UUID
    custom_price: Optional[Decimal] = None
    custom_duration: Optional[int] = None
    created_at: str
    
    class Config:
        from_attributes = True


class BulkStaffServiceAssignment(BaseModel):
    """Assign multiple services to a staff member at once"""
    staff_id: UUID
    service_ids: List[UUID] = Field(..., min_items=1)


# =====================================================
# STAFF AVAILABILITY MODELS
# =====================================================

class StaffAvailabilityCheck(BaseModel):
    """Check if staff is available for a specific time"""
    staff_id: UUID
    service_id: UUID
    booking_date: date
    time_slot: time
    duration: int = 30  # minutes


class AvailableStaffMember(BaseModel):
    """Staff member available for a specific service/time"""
    staff_id: UUID
    staff_name: str
    staff_image_url: Optional[str] = None
    staff_bio: Optional[str] = None
    average_rating: Decimal
    total_reviews: int
    custom_price: Optional[Decimal] = None
    custom_duration: Optional[int] = None


class AvailableStaffResponse(BaseModel):
    """Response with list of available staff"""
    salon_id: UUID
    service_id: UUID
    booking_date: date
    time_slot: time
    available_staff: List[AvailableStaffMember]
    any_available: bool  # True if at least one staff is available


# =====================================================
# STAFF PERFORMANCE MODELS
# =====================================================

class StaffPerformance(BaseModel):
    """Staff performance metrics"""
    staff_id: UUID
    staff_name: str
    total_bookings: int
    total_reviews: int
    average_rating: Decimal
    services_count: int
    revenue_generated: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


class StaffStats(BaseModel):
    """Detailed staff statistics"""
    staff_id: UUID
    total_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    total_revenue: Decimal
    average_rating: Decimal
    total_reviews: int
    most_booked_service: Optional[str] = None
    busiest_day: Optional[str] = None
    busiest_time_slot: Optional[str] = None


# =====================================================
# STAFF SCHEDULE MODELS
# =====================================================

class StaffScheduleDay(BaseModel):
    """Staff schedule for a single day"""
    date: date
    day_of_week: str
    is_working: bool
    working_hours: Optional[WorkingHoursDay] = None
    bookings: List[Dict[str, Any]] = []
    available_slots: List[str] = []  # List of available time slots


class StaffScheduleWeek(BaseModel):
    """Staff schedule for a week"""
    staff_id: UUID
    staff_name: str
    week_start: date
    week_end: date
    days: List[StaffScheduleDay]


# =====================================================
# STAFF IMAGE UPLOAD
# =====================================================

class StaffImageUpload(BaseModel):
    """Staff image upload response"""
    staff_id: UUID
    image_url: str
    uploaded_at: str


# =====================================================
# VALIDATION HELPERS
# =====================================================

def validate_working_hours(working_hours: Dict[str, Any]) -> bool:
    """Validate working hours structure"""
    required_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    for day in required_days:
        if day not in working_hours:
            return False
        
        day_data = working_hours[day]
        if not isinstance(day_data, dict):
            return False
        
        if 'enabled' not in day_data or 'start' not in day_data or 'end' not in day_data:
            return False
    
    return True


def validate_time_format(time_str: str) -> bool:
    """Validate HH:MM time format"""
    try:
        hours, minutes = time_str.split(':')
        return 0 <= int(hours) <= 23 and 0 <= int(minutes) <= 59
    except:
        return False
