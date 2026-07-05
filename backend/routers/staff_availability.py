"""
Read-only staff availability routes for booking flow.
Full staff CRUD remains in staff.py until httpx rewrite (BC2).
"""

from datetime import date, time
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Request

from core.limiter import limiter
from core.supabase import supabase
from models.staff import AvailableStaffMember, AvailableStaffResponse

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("/available/{salon_id}/{service_id}")
@limiter.limit("30/minute")
async def get_available_staff(
    request: Request,
    salon_id: UUID,
    service_id: UUID,
    booking_date: date,
    time_slot: time,
):
    """
    Staff available for a service/date/time (used by mobile BookingScreen).
    """
    payload = {
        "p_salon_id": str(salon_id),
        "p_service_id": str(service_id),
        "p_booking_date": booking_date.isoformat(),
        "p_time_slot": time_slot.strftime("%H:%M:%S"),
    }
    response = await supabase.request("POST", "rest/v1/rpc/get_available_staff", json=payload)

    if response.status_code != 200:
        return AvailableStaffResponse(
            salon_id=salon_id,
            service_id=service_id,
            booking_date=booking_date,
            time_slot=time_slot,
            available_staff=[],
            any_available=False,
        )

    rows = response.json() or []
    available_staff = [
        AvailableStaffMember(
            staff_id=staff["staff_id"],
            staff_name=staff["staff_name"],
            staff_image_url=staff.get("staff_image_url"),
            staff_bio=staff.get("staff_bio"),
            average_rating=Decimal(str(staff["average_rating"])),
            total_reviews=staff["total_reviews"],
            custom_price=Decimal(str(staff["custom_price"])) if staff.get("custom_price") else None,
            custom_duration=staff.get("custom_duration"),
        )
        for staff in rows
    ]

    return AvailableStaffResponse(
        salon_id=salon_id,
        service_id=service_id,
        booking_date=booking_date,
        time_slot=time_slot,
        available_staff=available_staff,
        any_available=len(available_staff) > 0,
    )
