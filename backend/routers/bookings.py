from fastapi import APIRouter, Request, HTTPException, Depends, status, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
import logging
import json

from config import settings
from core.supabase import supabase
from core.limiter import limiter
from core.idempotency import idempotency_required
from dependencies.auth import get_current_user
from models.bookings import BookingCreate, BookingStatusUpdate, BookingStatus, ReviewCreate, SlotReserve
from models.promotions import PromoCodeValidate
from models.reschedule import RescheduleRequest
from services import booking_push
logger = logging.getLogger("trimit")

router = APIRouter(prefix="/bookings", tags=["Bookings"])

BOOKING_LIST_SELECT = "*,salons(*),services(*),users(*)"
BOOKING_DETAIL_SELECT = "*,salons(*),services(*),users(*)"


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
        salon_ids = [s["id"] for s in salon_resp.json()]
        salon_filter = ",".join(salon_ids)
        resp = await supabase.request(
            "GET",
            f"rest/v1/bookings?salon_id=in.({salon_filter})&select={BOOKING_LIST_SELECT}&order=created_at.desc",
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
    old_status = booking.get("status")
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

    patch_json: dict = {"status": body.status.value}

    if role == "owner" and body.status == BookingStatus.completed:
        b_full = await supabase.request(
            "GET",
            f"rest/v1/bookings?id=eq.{booking_id}&select=payment_method,payment_status",
            token=token,
        )
        pay_method = ""
        pay_status = ""
        if b_full.status_code == 200 and b_full.json():
            row = b_full.json()[0]
            pay_method = str(row.get("payment_method") or "")
            pay_status = str(row.get("payment_status") or "")
        if pay_method == "online" and pay_status == "pending":
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "PAYMENT_PENDING",
                    "message": "Cannot complete booking until online payment is verified",
                },
            )
        if pay_method == "salon_cash" or pay_status == "paid":
            patch_json["payment_status"] = "paid"

    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{booking_id}",
        json=patch_json,
        token=token,
    )
    if patch.status_code not in (200, 201, 204):
        raise HTTPException(status_code=400, detail="Failed to update status")
    
    try:
        ctx = await booking_push.fetch_booking_push_context(booking_id, token)
        if ctx:
            await booking_push.after_status_change(
                booking_id=booking_id,
                old_status=old_status or "",
                new_status=body.status.value,
                role=role,
                ctx=ctx,
            )
    except Exception as e:
        logger.error("[STATUS] push failed booking_id=%s err=%s", booking_id, str(e))
    
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


def _time_ranges_overlap(start_a: int, duration_a: int, start_b: int, duration_b: int) -> bool:
    return start_a < start_b + duration_b and start_b < start_a + duration_a


def _has_active_hold(hold_rows: list, user_id: str, normalized_slot: str) -> bool:
    now_iso = datetime.now(timezone.utc).isoformat()
    for row in hold_rows or []:
        if _slot_time_key(row.get("time_slot")) != normalized_slot:
            continue
        if str(row.get("user_id", "")) != str(user_id):
            continue
        exp = row.get("expires_at")
        if exp and str(exp) > now_iso:
            return True
    return False


async def _reserve_slot_service_role_fallback(
    salon_id: str,
    service_id: str,
    booking_date: str,
    time_slot: str,
    user_id: str,
    hold_seconds: int = 90,
) -> tuple[str, Optional[dict]]:
    """
    When `reserve_slot_v1` RPC is not reachable, apply the same capacity rules and insert a real
    `slot_holds` row via service role (no fake client-only hold_id).

    Returns:
        ("ok", {"hold_id": str, "expires_at": str}) on success
        ("conflict", None) when slot is taken / full
        ("error", None) on configuration or persistence failure
    """
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.error("[RESERVE_FALLBACK] SUPABASE_SERVICE_ROLE_KEY missing — cannot insert hold")
        return "error", None

    norm = _slot_time_key(time_slot)
    if not norm:
        return "error", None

    salon_resp = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&select=allow_multiple_bookings_per_slot,max_bookings_per_slot",
        service_role=True,
    )
    if salon_resp.status_code != 200 or not salon_resp.json():
        return "error", None
    salon = salon_resp.json()[0]
    allow_multiple = salon.get("allow_multiple_bookings_per_slot", False)
    max_bookings = int(salon.get("max_bookings_per_slot") or 1)

    now_utc = datetime.now(timezone.utc)
    bookings_resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?salon_id=eq.{salon_id}&booking_date=eq.{booking_date}&status=neq.cancelled&select=time_slot,user_id",
        service_role=True,
    )
    holds_resp = await supabase.request(
        "GET",
        f"rest/v1/slot_holds?salon_id=eq.{salon_id}&booking_date=eq.{booking_date}&expires_at=gt.{now_utc.isoformat()}&select=time_slot,user_id",
        service_role=True,
    )
    bookings = bookings_resp.json() if bookings_resp.status_code == 200 else []
    holds = holds_resp.json() if holds_resp.status_code == 200 else []

    occ = 0
    for b in bookings:
        if _slot_time_key(b.get("time_slot")) == norm:
            occ += 1
    hold_from_others = 0
    for h in holds:
        if _slot_time_key(h.get("time_slot")) != norm:
            continue
        hid = str(h.get("user_id", ""))
        if hid and hid != str(user_id):
            hold_from_others += 1

    if not allow_multiple:
        if occ > 0 or hold_from_others > 0:
            return "conflict", None
    else:
        if occ + hold_from_others >= max_bookings:
            return "conflict", None

    expires_at = now_utc + timedelta(seconds=hold_seconds)
    expires_iso = expires_at.isoformat()

    # Remove this user's existing holds for the same slot (any time string variant)
    own_holds = await supabase.request(
        "GET",
        f"rest/v1/slot_holds?salon_id=eq.{salon_id}&booking_date=eq.{booking_date}&user_id=eq.{user_id}&select=id,time_slot",
        service_role=True,
    )
    if own_holds.status_code == 200 and own_holds.json():
        for h in own_holds.json():
            if _slot_time_key(h.get("time_slot")) == norm and h.get("id"):
                await supabase.request(
                    "DELETE",
                    f"rest/v1/slot_holds?id=eq.{h['id']}",
                    service_role=True,
                )

    insert_resp = await supabase.request(
        "POST",
        "rest/v1/slot_holds",
        json={
            "salon_id": salon_id,
            "service_id": service_id,
            "booking_date": booking_date,
            "time_slot": norm,
            "user_id": user_id,
            "expires_at": expires_iso,
        },
        service_role=True,
    )
    if insert_resp.status_code not in (200, 201):
        logger.error("[RESERVE_FALLBACK] insert failed %s %s", insert_resp.status_code, insert_resp.text)
        return "error", None
    rows = insert_resp.json()
    if not rows:
        return "error", None
    row = rows[0] if isinstance(rows, list) else rows
    hold_id = str(row.get("id"))
    exp_out = row.get("expires_at") or expires_iso
    logger.info("[RESERVE_FALLBACK] inserted hold id=%s salon=%s slot=%s user=%s", hold_id, salon_id, norm, user_id)
    return "ok", {"hold_id": hold_id, "expires_at": exp_out}


@router.get("/slots")
async def get_available_slots(
    salon_id: str,
    service_id: str,
    date_str: Optional[str] = None,
    date: Optional[str] = None,
    current_time: Optional[str] = None,
    is_local_today: bool = Query(False, description="True when selected calendar day is today in the user's local timezone"),
    staff_id: Optional[str] = Query(
        None,
        description="When set, hide slots where this staff member already has a booking at that time",
    ),
    current_user: dict = Depends(get_current_user),
):
    effective_date = date_str or date
    if not effective_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="date or date_str is required")

    viewer_user_id = current_user.get("id")

    staff_busy_slots: set[str] = set()
    if staff_id:
        staff_chk = await supabase.request(
            "GET",
            f"rest/v1/staff?id=eq.{staff_id}&salon_id=eq.{salon_id}&select=id",
            service_role=True,
        )
        if staff_chk.status_code != 200 or not staff_chk.json():
            raise HTTPException(status_code=404, detail="Staff not found for this salon")
        staff_bookings = await supabase.request(
            "GET",
            f"rest/v1/bookings?salon_id=eq.{salon_id}&booking_date=eq.{effective_date}&staff_id=eq.{staff_id}&status=neq.cancelled&select=time_slot",
            service_role=True,
        )
        if staff_bookings.status_code == 200:
            for b in staff_bookings.json() or []:
                k = _slot_time_key(b.get("time_slot"))
                if k:
                    staff_busy_slots.add(k)

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
    bookings_resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?salon_id=eq.{salon_id}&booking_date=eq.{effective_date}&status=neq.cancelled&select=time_slot,service_id",
        service_role=True,
    )
    holds_resp = await supabase.request(
        "GET",
        f"rest/v1/slot_holds?salon_id=eq.{salon_id}&booking_date=eq.{effective_date}&expires_at=gt.{now_utc.isoformat()}&select=time_slot,user_id",
        service_role=True,
    )
    services_resp = await supabase.request(
        "GET",
        f"rest/v1/services?salon_id=eq.{salon_id}&select=id,duration",
        service_role=True,
    )

    existing_bookings = bookings_resp.json() if bookings_resp.status_code == 200 else []
    active_holds = holds_resp.json() if holds_resp.status_code == 200 else []
    duration_by_service: dict[str, int] = {}
    if services_resp.status_code == 200:
        for svc in services_resp.json() or []:
            sid = svc.get("id")
            if sid:
                duration_by_service[str(sid)] = int(svc.get("duration") or 30)

    booking_blocked_ranges: list[tuple[int, int]] = []
    for b in existing_bookings:
        start = _parse_hh_mm_minutes(_slot_time_key(b.get("time_slot")))
        if start is None:
            continue
        svc_dur = duration_by_service.get(str(b.get("service_id")), 30)
        booking_blocked_ranges.append((start, svc_dur))

    # Normalize time_slot to HH:MM and group occupancy (bookings + holds)
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
            continue
        occupancy_counts[slot] = occupancy_counts.get(slot, 0) + 1
        hold_start = _parse_hh_mm_minutes(slot)
        if hold_start is not None:
            booking_blocked_ranges.append((hold_start, duration))

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
        "[SLOTS] salon=%s service=%s date=%s viewer=%s is_local_today=%s current_time=%s use_client_grace=%s utc_today=%s staff_id=%s staff_busy=%s",
        salon_id,
        service_id,
        effective_date,
        viewer_user_id or "anon",
        is_local_today,
        current_time,
        use_client_today,
        is_today_utc,
        staff_id or "",
        sorted(staff_busy_slots),
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
            for blocked_start, blocked_dur in booking_blocked_ranges:
                if _time_ranges_overlap(slot_minutes, duration, blocked_start, blocked_dur):
                    available = False
                    break

        if available and staff_id and slot_time_str in staff_busy_slots:
            available = False

        slot_payload = {
            "time": slot_time_str,
            "available": available,
            "booking_count": count,
            "max_bookings": max_bookings,
            "allow_multiple": allow_multiple,
        }
        if available or allow_multiple:
            slots.append(slot_payload)

        curr += timedelta(minutes=30)

    logger.info("[SLOTS] result salon=%s date=%s count=%s occupancy_keys=%s", salon_id, effective_date, len(slots), sorted(occupancy_counts.keys()))

    return {
        "slots": slots,
        "allow_multiple_bookings_per_slot": allow_multiple,
        "max_bookings_per_slot": max_bookings,
    }


@router.get("/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Single booking with salon, service, and customer embeds (same shape as list)."""
    token = current_user.get("access_token")
    resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?id=eq.{booking_id}&select={BOOKING_DETAIL_SELECT}",
        token=token,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to load booking")
    rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = rows[0]
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
    return booking


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

    if response.status_code == 200:
        result = response.json()
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": result.get("error_code"), "message": result.get("message", "Slot is no longer available")},
            )
        return {
            "hold_id": result.get("hold_id"),
            "expires_at": result.get("expires_at"),
        }

    logger.error("[RESERVE] reserve_slot_v1 HTTP error: %s %s", response.status_code, response.text)
    if settings.ENVIRONMENT != "production":
        fb_status, fb_payload = await _reserve_slot_service_role_fallback(
            data.salon_id,
            data.service_id,
            data.booking_date,
            data.time_slot,
            str(user_id),
        )
        if fb_status == "ok" and fb_payload:
            return {**fb_payload, "fallback": True}
        if fb_status == "conflict":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "SLOT_TAKEN",
                    "message": "This slot is already booked or held by another user",
                },
            )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "code": "RESERVE_UNAVAILABLE",
            "message": "Could not place a hold on this slot. Please try again in a moment.",
        },
    )

@router.post("/")
@limiter.limit("10/minute")
@idempotency_required(required=True)
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
        f"&user_id=eq.{user_id}"
        f"&expires_at=gt.{datetime.now(timezone.utc).isoformat()}"
    )
    hold_resp = await supabase.request("GET", holds_query, token=token)
    hold_rows = hold_resp.json() if hold_resp.status_code == 200 else []
    norm_slot = _slot_time_key(data.time_slot)
    if not norm_slot or not _has_active_hold(hold_rows, str(user_id), norm_slot):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "HOLD_REQUIRED",
                "message": "Reserve this slot before confirming your booking.",
            },
        )

    # 3. Create booking via RPC (Atomic)
    rpc_payload = {
        "p_user_id": user_id,
        "p_salon_id": data.salon_id,
        "p_service_id": data.service_id,
        "p_booking_date": data.booking_date,
        "p_time_slot": data.time_slot,
        "p_status": "confirmed" if salon.get("auto_accept") else "pending",
        "p_payment_method": data.payment_method,
        "p_payment_status": "paid" if data.payment_method == "salon_cash" else "pending",
        "p_amount": final_amount,
        "p_promo_code": promo_code_upper,
        "p_discount_amount": discount_amount,
        "p_original_amount": original_amount if promo_code_upper else None,
        "p_staff_id": data.staff_id,
        "p_any_staff": data.any_staff,
    }
    
    response = await supabase.request("POST", "rest/v1/rpc/create_atomic_booking", json=rpc_payload, token=token)
    if response.status_code != 200:
        logger.error(
            "[CREATE_BOOKING] create_atomic_booking failed: %s %s",
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=500,
            detail={
                "code": "BOOKING_RPC_FAILED",
                "message": "Booking failed on server",
            },
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
    
    try:
        initial_status = result.get("status") or ("confirmed" if salon.get("auto_accept") else "pending")
        customer_name = await booking_push.fetch_user_name(user_id)
        is_premium = final_amount >= 500
        await booking_push.after_booking_created(
            booking_id=booking_id,
            salon_owner_id=salon.get("owner_id"),
            customer_id=user_id,
            customer_name=customer_name,
            service_name=service.get("name", "Service"),
            booking_date=data.booking_date,
            time_slot=data.time_slot,
            initial_status=initial_status,
            is_premium=is_premium,
            payment_method=data.payment_method,
        )
    except Exception as e:
        logger.error("[CREATE_BOOKING] push failed booking_id=%s err=%s", booking_id, str(e))

    return JSONResponse(
        status_code=201,
        content={"message": "Booking created", "booking_id": booking_id},
    )


def _unwrap_rpc_json_payload(raw: object) -> dict:
    """PostgREST may return a single JSON object or a one-element array depending on config."""
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        return raw[0]
    logger.warning("[RESCHEDULE] Unexpected RPC JSON shape: type=%s", type(raw).__name__)
    return {}


@router.patch("/{booking_id}/reschedule")
@limiter.limit("5/minute")
async def reschedule_booking(
    request: Request,
    booking_id: str,
    body: RescheduleRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Reschedule a booking to a new date/time.
    Uses atomic database operation to prevent race conditions.
    """
    profile = current_user.get("profile") or {}
    raw_role = str(profile.get("role") or "customer").strip().lower()
    user_role = raw_role if raw_role in ("customer", "owner") else "customer"
    user_id = current_user.get("id")
    token = current_user.get("access_token")

    new_date = body.new_date.isoformat()
    new_time_slot = body.new_time_slot
    reason = body.reason

    logger.info(
        "[RESCHEDULE] start booking_id=%s user_id=%s role=%s new_date=%s new_time=%s",
        booking_id,
        user_id,
        user_role,
        new_date,
        new_time_slot,
    )

    try:
        response = await supabase.request(
            "POST",
            "rest/v1/rpc/reschedule_booking_atomic",
            json={
                "p_booking_id": booking_id,
                "p_new_date": new_date,
                "p_new_time_slot": new_time_slot,
                "p_user_id": user_id,
                "p_user_role": user_role,
                "p_reason": reason,
            },
            token=token,
        )

        if response.status_code != 200:
            logger.error(
                "[RESCHEDULE] RPC HTTP error status=%s body=%s",
                response.status_code,
                response.text[:2000],
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "code": "RESCHEDULE_RPC_HTTP",
                    "message": "Could not complete reschedule. Please try again.",
                    "status": response.status_code,
                },
            )

        result = _unwrap_rpc_json_payload(response.json())
        logger.info(
            "[RESCHEDULE] rpc_payload success=%s keys=%s",
            result.get("success"),
            list(result.keys()),
        )

        if not result.get("success"):
            error_msg = result.get("error") or "Failed to reschedule booking"
            logger.warning("[RESCHEDULE] rpc business_failure booking_id=%s error=%s", booking_id, error_msg)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "RESCHEDULE_REJECTED", "message": error_msg},
            )

        logger.info("[RESCHEDULE] ok booking_id=%s by %s %s", booking_id, user_role, user_id)

        try:
            bk = await supabase.request(
                "GET",
                f"rest/v1/bookings?id=eq.{booking_id}&select=user_id,services(name),salons(owner_id,name)",
                service_role=True,
            )
            if bk.status_code == 200 and bk.json():
                row = bk.json()[0]
                svc = row.get("services")
                if isinstance(svc, list) and svc:
                    service_name = (svc[0] or {}).get("name", "Service")
                elif isinstance(svc, dict):
                    service_name = svc.get("name", "Service")
                else:
                    service_name = "Service"
                salons = row.get("salons") or {}
                owner_id = salons.get("owner_id") if isinstance(salons, dict) else None
                salon_name = salons.get("name", "Salon") if isinstance(salons, dict) else "Salon"
                await booking_push.after_reschedule(
                    booking_id=booking_id,
                    user_role=user_role,
                    user_id=user_id,
                    owner_id=owner_id,
                    customer_uid=row.get("user_id"),
                    service_name=service_name,
                    salon_name=salon_name,
                    nd=result.get("new_date") or new_date,
                    nt=result.get("new_time_slot") or new_time_slot,
                    od=result.get("old_date", ""),
                    ot=result.get("old_time_slot", ""),
                )
        except Exception as push_exc:
            logger.error("[RESCHEDULE] push failed booking_id=%s err=%s", booking_id, str(push_exc))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[RESCHEDULE] unexpected_error booking_id=%s", booking_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "RESCHEDULE_INTERNAL", "message": "An error occurred while rescheduling"},
        ) from e


@router.get("/{booking_id}/reschedule-history")
async def get_reschedule_history(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get reschedule history for a booking.

    Returns:
        List of reschedule records with old/new dates and times
    """
    token = current_user.get("access_token")
    try:
        response = await supabase.request(
            "POST",
            "rest/v1/rpc/get_booking_reschedule_history",
            json={"p_booking_id": booking_id},
            token=token,
        )

        if response.status_code != 200:
            logger.error(
                "[RESCHEDULE_HISTORY] HTTP %s booking_id=%s body=%s",
                response.status_code,
                booking_id,
                response.text[:1000],
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "RESCHEDULE_HISTORY_FAILED", "message": "Failed to fetch reschedule history"},
            )

        raw = response.json()
        history = raw if isinstance(raw, list) else (raw.get("history") if isinstance(raw, dict) else [])
        return {"history": history or []}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[RESCHEDULE_HISTORY] booking_id=%s", booking_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "RESCHEDULE_HISTORY_INTERNAL", "message": "An error occurred while fetching history"},
        ) from e
