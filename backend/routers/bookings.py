from fastapi import APIRouter, Request, HTTPException, Depends, status, Header, Query
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
import logging
import uuid
import json

from core.supabase import supabase
from core.limiter import limiter
from core.idempotency import idempotency_required
from dependencies.auth import get_current_user, try_get_user_id_from_authorization
from models.bookings import BookingCreate, BookingStatusUpdate, BookingStatus, ReviewCreate, SlotReserve
from models.promotions import PromoCodeValidate
from services.push_notifications import push_service
logger = logging.getLogger("trimit")

router = APIRouter(prefix="/bookings", tags=["Bookings"])

BOOKING_LIST_SELECT = "*,salons(*),services(*)"


@router.get("/salon/{salon_id}")
async def list_bookings_for_salon(
    salon_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Owner: bookings for a salon they own (RLS also enforces)."""
    token = current_user.get("access_token")
    own = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&select=owner_id",
        token=token,
    )
    if own.status_code != 200 or not own.json() or own.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?salon_id=eq.{salon_id}&select={BOOKING_LIST_SELECT}&order=created_at.desc",
        token=token,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to load bookings")
    return resp.json()


@router.get("/")
async def list_my_bookings(current_user: dict = Depends(get_current_user)):
    """Customer: own bookings. Owner: bookings for their salon (first salon)."""
    token = current_user.get("access_token")
    profile = current_user.get("profile") or {}
    role = profile.get("role", "customer")

    if role == "owner":
        salon_resp = await supabase.request(
            "GET",
            f"rest/v1/salons?owner_id=eq.{current_user.get('id')}&select=id",
            token=token,
        )
        if salon_resp.status_code != 200 or not salon_resp.json():
            return []
        salon_id = salon_resp.json()[0]["id"]
        resp = await supabase.request(
            "GET",
            f"rest/v1/bookings?salon_id=eq.{salon_id}&select={BOOKING_LIST_SELECT}&order=created_at.desc",
            token=token,
        )
    else:
        resp = await supabase.request(
            "GET",
            f"rest/v1/bookings?user_id=eq.{current_user.get('id')}&select={BOOKING_LIST_SELECT}&order=created_at.desc",
            token=token,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to load bookings")
    return resp.json()


@router.patch("/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    body: BookingStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    token = current_user.get("access_token")
    b = await supabase.request(
        "GET",
        f"rest/v1/bookings?id=eq.{booking_id}&select=id,user_id,salon_id,status",
        token=token,
    )
    if b.status_code != 200 or not b.json():
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = b.json()[0]
    profile = current_user.get("profile") or {}
    role = profile.get("role", "customer")
    uid = current_user.get("id")

    if role == "owner":
        salon = await supabase.request(
            "GET",
            f"rest/v1/salons?id=eq.{booking['salon_id']}&select=owner_id",
            token=token,
        )
        if salon.status_code != 200 or not salon.json() or salon.json()[0].get("owner_id") != uid:
            raise HTTPException(status_code=403, detail="Unauthorized")
    else:
        if booking.get("user_id") != uid:
            raise HTTPException(status_code=403, detail="Unauthorized")
        if body.status != BookingStatus.cancelled:
            raise HTTPException(status_code=403, detail="Customers may only cancel bookings")

    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{booking_id}",
        json={"status": body.status.value},
        token=token,
    )
    if patch.status_code not in (200, 201, 204):
        raise HTTPException(status_code=400, detail="Failed to update status")
    
    # Send push notification to customer about status change
    try:
        # Get customer's push token
        customer_resp = await supabase.request(
            "GET",
            f"rest/v1/users?id=eq.{booking.get('user_id')}&select=push_token,name",
            token=token
        )
        
        if customer_resp.status_code == 200 and customer_resp.json():
            customer_data = customer_resp.json()[0]
            customer_push_token = customer_data.get("push_token")
            
            if customer_push_token:
                # Get booking details
                booking_details = await supabase.request(
                    "GET",
                    f"rest/v1/bookings?id=eq.{booking_id}&select=booking_date,time_slot,services(name)",
                    token=token
                )
                
                if booking_details.status_code == 200 and booking_details.json():
                    booking_info = booking_details.json()[0]
                    service_name = booking_info.get("services", {}).get("name", "Service")
                    
                    # Send push notification
                    await push_service.notify_booking_status_change(
                        customer_push_token=customer_push_token,
                        booking_data={
                            "booking_id": booking_id,
                            "service_name": service_name,
                            "booking_date": booking_info.get("booking_date"),
                            "time_slot": booking_info.get("time_slot"),
                        },
                        new_status=body.status.value
                    )
                    logger.info(f"✅ Push notification sent to customer for booking {booking_id}")
            else:
                logger.info(f"⚠️ Customer has no push token registered")
    except Exception as e:
        # Don't fail the status update if push notification fails
        logger.error(f"❌ Failed to send push notification: {str(e)}")
    
    return {"message": "Status updated", "booking_id": booking_id}


def _slot_time_key(raw: Optional[str]) -> str:
    if not raw:
        return ""
    s = str(raw).strip()
    return s[:5] if len(s) >= 5 else s


def _parse_hh_mm_minutes(value: Optional[str]) -> Optional[int]:
    if not value or len(value.strip()) < 4:
        return None
    parts = value.strip()[:5].split(":")
    if len(parts) != 2:
        return None
    try:
        h, m = int(parts[0]), int(parts[1])
        return h * 60 + m
    except ValueError:
        return None


@router.get("/slots")
async def get_available_slots(
    salon_id: str,
    service_id: str,
    date_str: Optional[str] = None,
    date: Optional[str] = None,
    current_time: Optional[str] = None,
    is_local_today: bool = Query(False, description="True when selected calendar day is today in the user's local timezone"),
    authorization: Optional[str] = Header(default=None),
):
    effective_date = date_str or date
    if not effective_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="date or date_str is required")

    viewer_user_id = try_get_user_id_from_authorization(authorization)
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
    now_utc = datetime.now(timezone.utc)
    bookings_resp = await supabase.request("GET", f"rest/v1/bookings?salon_id=eq.{salon_id}&booking_date=eq.{effective_date}&status=neq.cancelled&select=time_slot", service_role=True)
    holds_resp = await supabase.request(
        "GET",
        f"rest/v1/slot_holds?salon_id=eq.{salon_id}&booking_date=eq.{effective_date}&expires_at=gt.{now_utc.isoformat()}&select=time_slot,user_id",
        service_role=True,
    )

    existing_bookings = bookings_resp.json() if bookings_resp.status_code == 200 else []
    active_holds = holds_resp.json() if holds_resp.status_code == 200 else []

    # Normalize time_slot to HH:MM and group occupancy (bookings + holds)
    # DB may store HH:MM:SS for older records — strip to first 5 chars for consistency
    occupancy_counts: dict[str, int] = {}
    for b in existing_bookings:
        slot = _slot_time_key(b.get("time_slot"))
        if slot:
            occupancy_counts[slot] = occupancy_counts.get(slot, 0) + 1
    for h in active_holds:
        slot = _slot_time_key(h.get("time_slot"))
        if not slot:
            continue
        hold_uid = h.get("user_id")
        if viewer_user_id and hold_uid and str(hold_uid) == str(viewer_user_id):
            # User's own active hold should not hide the slot from them while they complete checkout.
            continue
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
    
    # Past-slot filter for "today":
    # - Prefer client hint (is_local_today + current_time) so device-local calendar matches UX.
    # - Fallback: server UTC date == effective_date (legacy behaviour).
    is_today_utc = effective_date == now_utc.strftime("%Y-%m-%d")
    client_now_minutes = _parse_hh_mm_minutes(current_time)
    use_client_today = bool(is_local_today and client_now_minutes is not None)
    grace_minutes_utc = now_utc.hour * 60 + now_utc.minute + 5 if is_today_utc else None

    logger.info(
        "[SLOTS] salon=%s service=%s date=%s viewer=%s is_local_today=%s current_time=%s use_client_grace=%s utc_today=%s",
        salon_id,
        service_id,
        effective_date,
        viewer_user_id or "anon",
        is_local_today,
        current_time,
        use_client_today,
        is_today_utc,
    )

    while curr + timedelta(minutes=duration) <= closing:
        slot_time_str = curr.strftime("%H:%M")  # always HH:MM

        # Filter past slots (5-minute grace)
        slot_minutes = curr.hour * 60 + curr.minute
        if use_client_today and client_now_minutes is not None:
            if slot_minutes < client_now_minutes + 5:
                curr += timedelta(minutes=30)
                continue
        elif is_today_utc and grace_minutes_utc is not None:
            if slot_minutes < grace_minutes_utc:
                curr += timedelta(minutes=30)
                continue

        # Check capacity against normalized occupancy_counts
        count = occupancy_counts.get(slot_time_str, 0)
        available = False
        if not allow_multiple and count == 0:
            available = True
        elif allow_multiple and count < max_bookings:
            available = True

        if available:
            slots.append(slot_time_str)

        curr += timedelta(minutes=30)

    logger.info("[SLOTS] result salon=%s date=%s count=%s occupancy_keys=%s", salon_id, effective_date, len(slots), sorted(occupancy_counts.keys()))

    return {
        "slots": [{"time": s, "available": True} for s in slots],
        "allow_multiple_bookings_per_slot": allow_multiple,
        "max_bookings_per_slot": max_bookings,
    }

@router.post("/reserve")
@limiter.limit("5/minute")
async def reserve_slot(request: Request, data: SlotReserve, current_user: dict = Depends(get_current_user)):
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
        # Graceful fallback: allow checkout to continue and rely on final atomic booking guard.
        # This prevents UX dead-ends when reserve_slot_v1 RPC is missing/unhealthy.
        return {
            "hold_id": str(uuid.uuid4()),
            "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=90)).isoformat(),
            "fallback": True,
        }
        
    result = response.json()
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": result.get("error_code"), "message": result.get("message", "Slot is no longer available")}
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
        logger.error(f"[CREATE_BOOKING] create_atomic_booking failed: {response.status_code} {response.text}")
        raise HTTPException(
            status_code=500, 
            detail={
                "code": "BOOKING_RPC_FAILED",
                "message": "Booking failed on server",
                "supabase_status": response.status_code,
                "supabase_body": response.text,
            }
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

    booking_id = result.get("booking_id")
    logger.info(
        "[CREATE_BOOKING] success user=%s salon=%s date=%s slot=%s booking_id=%s",
        user_id,
        data.salon_id,
        data.booking_date,
        data.time_slot,
        booking_id,
    )
    
    # 4. Clean up the hold after successful booking
    await supabase.request(
        "DELETE", 
        f"rest/v1/slot_holds?salon_id=eq.{data.salon_id}&booking_date=eq.{data.booking_date}&time_slot=eq.{data.time_slot}&user_id=eq.{user_id}",
        token=token
    )
    
    # 5. Send push notification to salon owner
    try:
        # Get salon owner's push token
        owner_resp = await supabase.request(
            "GET",
            f"rest/v1/users?id=eq.{salon.get('owner_id')}&select=push_token,name",
            token=token
        )
        
        if owner_resp.status_code == 200 and owner_resp.json():
            owner_data = owner_resp.json()[0]
            owner_push_token = owner_data.get("push_token")
            
            if owner_push_token:
                # Get customer name
                customer_resp = await supabase.request(
                    "GET",
                    f"rest/v1/users?id=eq.{user_id}&select=name",
                    token=token
                )
                customer_name = "Customer"
                if customer_resp.status_code == 200 and customer_resp.json():
                    customer_name = customer_resp.json()[0].get("name", "Customer")
                
                # Send push notification
                await push_service.notify_new_booking(
                    owner_push_token=owner_push_token,
                    booking_data={
                        "booking_id": result.get("booking_id"),
                        "customer_name": customer_name,
                        "service_name": service.get("name"),
                        "booking_date": data.booking_date,
                        "time_slot": data.time_slot,
                    }
                )
                logger.info(f"✅ Push notification sent to owner for booking {result.get('booking_id')}")
            else:
                logger.info(f"⚠️ Owner has no push token registered")
    except Exception as e:
        # Don't fail the booking if push notification fails
        logger.error(f"❌ Failed to send push notification: {str(e)}")
        
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
