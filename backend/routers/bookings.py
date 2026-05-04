from fastapi import APIRouter, Request, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
import logging

from core.supabase import supabase
from core.limiter import limiter
from core.idempotency import idempotency_required
from dependencies.auth import get_current_user
from models.bookings import BookingCreate, BookingStatusUpdate, BookingStatus, ReviewCreate
from models.promotions import PromoCodeValidate
from services.notifications import (
    notify_owner_new_booking,
    notify_customer_booking_confirmed,
    notify_customer_booking_cancelled
)

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.get("/slots")
async def get_available_slots(salon_id: str, date_str: str, service_id: str, current_time: Optional[str] = None):
    # 1. Fetch salon and service
    salon_resp = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=opening_time,closing_time,allow_multiple_bookings_per_slot,max_bookings_per_slot")
    service_resp = await supabase.request("GET", f"rest/v1/services?id=eq.{service_id}&select=duration")
    
    if salon_resp.status_code != 200 or not salon_resp.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    if service_resp.status_code != 200 or not service_resp.json():
        raise HTTPException(status_code=404, detail="Service not found")
    
    salon = salon_resp.json()[0]
    service = service_resp.json()[0]
    
    # 2. Fetch existing bookings and active holds for the day
    bookings_resp = await supabase.request("GET", f"rest/v1/bookings?salon_id=eq.{salon_id}&booking_date=eq.{date_str}&status=neq.cancelled&select=time_slot")
    holds_resp = await supabase.request("GET", f"rest/v1/slot_holds?salon_id=eq.{salon_id}&booking_date=eq.{date_str}&expires_at=gt.{datetime.now(timezone.utc).isoformat()}&select=time_slot")
    
    existing_bookings = bookings_resp.json() if bookings_resp.status_code == 200 else []
    active_holds = holds_resp.json() if holds_resp.status_code == 200 else []
    
    # Group occupancy by time slot (bookings + holds)
    occupancy_counts = {}
    for b in existing_bookings:
        slot = b["time_slot"]
        occupancy_counts[slot] = occupancy_counts.get(slot, 0) + 1
    for h in active_holds:
        slot = h["time_slot"]
        occupancy_counts[slot] = occupancy_counts.get(slot, 0) + 1

    # 3. Generate slots
    try:
        opening = datetime.strptime(salon.get("opening_time", "09:00"), "%H:%M")
        closing = datetime.strptime(salon.get("closing_time", "21:00"), "%H:%M")
    except ValueError:
        opening = datetime.strptime("09:00", "%H:%M")
        closing = datetime.strptime("21:00", "%H:%M")
        
    duration = service.get("duration", 30)
    allow_multiple = salon.get("allow_multiple_bookings_per_slot", False)
    max_bookings = salon.get("max_bookings_per_slot", 1)
    
    slots = []
    curr = opening
    
    # If checking for today, filter out past slots (5-min grace)
    now = datetime.now()
    is_today = date_str == now.strftime("%Y-%m-%d")
    grace_time = now + timedelta(minutes=5) if is_today else None

    while curr + timedelta(minutes=duration) <= closing:
        slot_time_str = curr.strftime("%H:%M")
        
        # Filter past slots
        if is_today and grace_time:
            if curr.time() < grace_time.time():
                curr += timedelta(minutes=30) 
                continue
        
        # Check capacity
        count = occupancy_counts.get(slot_time_str, 0)
        available = False
        if not allow_multiple and count == 0:
            available = True
        elif allow_multiple and count < max_bookings:
            available = True
            
        if available:
            slots.append(slot_time_str)
            
        curr += timedelta(minutes=30) 
        
    return {"slots": slots}

@router.post("/reserve")
@limiter.limit("5/minute")
async def reserve_slot(data: SlotReserve, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    # Call RPC to reserve slot
    rpc_payload = {
        "p_salon_id": data.salon_id,
        "p_service_id": data.service_id,
        "p_booking_date": data.booking_date,
        "p_time_slot": data.time_slot,
        "p_user_id": user_id,
        "p_hold_duration_seconds": 90
    }
    
    response = await supabase.request("POST", "rest/v1/rpc/reserve_slot_v1", json=rpc_payload, token=token)
    
    if response.status_code != 200:
        logger.error(f"Reservation RPC failed: {response.text}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "RESERVATION_FAILED", "message": "Failed to reserve slot"}
        )
        
    result = response.json()
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": result.get("error_code"), "message": "Slot is no longer available"}
        )
        
    return {
        "hold_id": result.get("hold_id"),
        "expires_at": result.get("expires_at")
    }

@router.post("/")
@limiter.limit("10/minute")
@idempotency_required
async def create_booking(request: Request, data: BookingCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    # 1. Fetch details
    salon_resp = await supabase.request("GET", f"rest/v1/salons?id=eq.{data.salon_id}", token=token)
    service_resp = await supabase.request("GET", f"rest/v1/services?id=eq.{data.service_id}", token=token)
    
    if salon_resp.status_code != 200 or service_resp.status_code != 200:
        raise HTTPException(
            status_code=404, 
            detail={"code": "NOT_FOUND", "message": "Salon or Service not found"}
        )
        
    salon = salon_resp.json()[0]
    service = service_resp.json()[0]
    
    # Calculate amount (with promo if provided)
    original_amount = float(service.get("price", 0))
    final_amount = original_amount
    discount_amount = 0.0
    promo_code_upper = None
    
    if data.promo_code:
        promo_code_upper = data.promo_code.upper()
        # Validate promo code
        promo_response = await supabase.request(
            "POST",
            "rest/v1/rpc/validate_promo_code",
            json={
                "p_code": promo_code_upper,
                "p_salon_id": data.salon_id,
                "p_user_id": user_id,
                "p_booking_amount": original_amount
            }
        )
        
        if promo_response.status_code == 200:
            promo_result = promo_response.json()
            if promo_result.get("valid"):
                discount_amount = float(promo_result.get("discount_amount", 0))
                final_amount = float(promo_result.get("final_amount", original_amount))
                logger.info(f"Promo {promo_code_upper} applied: discount={discount_amount}, final={final_amount}")
            else:
                # Invalid promo - return error
                raise HTTPException(
                    status_code=400,
                    detail={"code": "INVALID_PROMO", "message": promo_result.get("error", "Invalid promo code")}
                )
        else:
            logger.error(f"Promo validation failed: {promo_response.text}")
            raise HTTPException(
                status_code=400,
                detail={"code": "PROMO_ERROR", "message": "Failed to validate promo code"}
            )
    
    # 2. Check if user has an active hold for this slot
    # This prevents users from skipping the reservation step or someone stealing it during payment
    holds_query = (
        f"rest/v1/slot_holds?salon_id=eq.{data.salon_id}"
        f"&booking_date=eq.{data.booking_date}"
        f"&time_slot=eq.{data.time_slot}"
        f"&user_id=eq.{user_id}"
        f"&expires_at=gt.{datetime.now(timezone.utc).isoformat()}"
    )
    hold_resp = await supabase.request("GET", holds_query, token=token)
    
    # If no hold, we still allow booking but it might fail in the atomic RPC if someone else held it
    # We prioritize the hold system in the mobile UI.
    
    # 3. Create booking via RPC (Atomic)
    rpc_payload = {
        "p_user_id": user_id,
        "p_salon_id": data.salon_id,
        "p_service_id": data.service_id,
        "p_booking_date": data.booking_date,
        "p_time_slot": data.time_slot,
        "p_status": "confirmed" if salon.get("auto_accept") else "pending",
        "p_payment_method": data.payment_method,
        "p_payment_status": "pending",
        "p_amount": final_amount,
        "p_promo_code": promo_code_upper,
        "p_discount_amount": discount_amount,
        "p_original_amount": original_amount if promo_code_upper else None
    }
    
    response = await supabase.request("POST", "rest/v1/rpc/create_atomic_booking", json=rpc_payload, token=token)
    if response.status_code != 200:
        raise HTTPException(
            status_code=500, 
            detail={"code": "INTERNAL_ERROR", "message": "Booking failed on server"}
        )
        
    result = response.json()
    if not result.get("success"):
        error_msg = result.get("error", "Slot unavailable")
        # Map specific Supabase RPC errors to codes
        code = "SLOT_OCCUPIED" if "taken" in error_msg.lower() or "occupied" in error_msg.lower() else "BOOKING_FAILED"
        raise HTTPException(
            status_code=409, 
            detail={"code": code, "message": error_msg}
        )
    
    # 4. Clean up the hold after successful booking
    await supabase.request(
        "DELETE", 
        f"rest/v1/slot_holds?salon_id=eq.{data.salon_id}&booking_date=eq.{data.booking_date}&time_slot=eq.{data.time_slot}&user_id=eq.{user_id}",
        token=token
    )
        
    return {"message": "Booking created", "booking_id": result.get("booking_id")}


@router.patch("/{booking_id}/reschedule")
@limiter.limit("5/minute")
async def reschedule_booking(
    request: Request,
    booking_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Reschedule a booking to a new date/time.
    Uses atomic database operation to prevent race conditions.
    
    Args:
        booking_id: UUID of the booking to reschedule
        data: {
            "new_date": "YYYY-MM-DD",
            "new_time_slot": "HH:MM",
            "reason": "Optional reason" (optional)
        }
    
    Returns:
        {
            "success": true,
            "booking_id": "...",
            "old_date": "...",
            "old_time_slot": "...",
            "new_date": "...",
            "new_time_slot": "...",
            "reschedule_count": 1
        }
    """
    try:
        # Validate input
        new_date = data.get("new_date")
        new_time_slot = data.get("new_time_slot")
        reason = data.get("reason")
        
        if not new_date or not new_time_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="new_date and new_time_slot are required"
            )
        
        # Validate date format
        try:
            date_obj = datetime.strptime(new_date, "%Y-%m-%d").date()
            if date_obj < date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot reschedule to a past date"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Validate time slot format
        if not new_time_slot or len(new_time_slot) != 5 or new_time_slot[2] != ':':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time slot format. Use HH:MM"
            )
        
        # Get user role
        profile = current_user.get("profile", {})
        user_role = profile.get("role", "customer")
        user_id = current_user.get("id")
        
        # Call atomic RPC function
        response = await supabase.request(
            "POST",
            "rest/v1/rpc/reschedule_booking_atomic",
            json={
                "p_booking_id": booking_id,
                "p_new_date": new_date,
                "p_new_time_slot": new_time_slot,
                "p_user_id": user_id,
                "p_user_role": user_role,
                "p_reason": reason
            },
            token=current_user.get("access_token")
        )
        
        if response.status_code != 200:
            logger.error(f"Reschedule RPC failed: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to reschedule booking"
            )
        
        result = response.json()
        
        if not result.get("success"):
            error_msg = result.get("error", "Failed to reschedule booking")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # TODO: Send notifications
        # - If owner initiated: notify customer
        # - If customer initiated: notify owner
        
        logger.info(f"Booking {booking_id} rescheduled by {user_role} {user_id}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reschedule error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while rescheduling"
        )


@router.get("/{booking_id}/reschedule-history")
async def get_reschedule_history(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get reschedule history for a booking.
    
    Returns:
        List of reschedule records with old/new dates and times
    """
    try:
        # Call RPC function to get history
        response = await supabase.request(
            "POST",
            "rest/v1/rpc/get_booking_reschedule_history",
            json={"p_booking_id": booking_id},
            token=current_user.get("access_token")
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch reschedule history"
            )
        
        history = response.json()
        return {"history": history}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get reschedule history error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching history"
        )
