from fastapi import APIRouter, Request, HTTPException, Depends, status, Header
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
import uuid
import logging
import hmac
from math import radians, sin, cos, sqrt, atan2

from core.supabase import supabase
from core.salon_auth import assert_salon_owner
from config import settings
from dependencies.auth import get_current_user
from dependencies.subscription import require_active_subscription
from models.salons import SalonCreate, SalonUpdate, ServiceCreate, ServiceUpdate, SalonAvailabilityUpdate
from services import salon_availability
from services.gender_serve import normalize_discover_filter, salon_matches_discover_filter, default_service_audience_for_salon

router = APIRouter(prefix="/salons", tags=["Salons"])

# ── Sensitive field stripping ───────────────────────────────────────────────
_BANK_FIELDS = ("bank_account_number", "bank_ifsc", "bank_account_holder_name")


def _strip_bank_details(salon: dict) -> dict:
    """Remove banking details from salon dicts before returning to customers."""
    for key in _BANK_FIELDS:
        salon.pop(key, None)
    return salon


def _sync_salon_image_fields(data: dict) -> dict:
    """Keep images[] and image_url aligned for list cards and RPC consumers."""
    images = data.get("images")
    if isinstance(images, list) and images:
        if not data.get("image_url"):
            data["image_url"] = images[0]
    elif data.get("image_url") and (not images or images == []):
        data["images"] = [data["image_url"]]
    return data


def _safe_response_json(response) -> Optional[object]:
    try:
        return response.json()
    except Exception:
        logger.error(
            "[postgrest] invalid JSON status=%s body=%s",
            response.status_code,
            (response.text or "")[:500],
        )
        return None


def _first_postgrest_row(data: Optional[object]) -> Optional[dict]:
    """PostgREST may return a list or a single object with Prefer: return=representation."""
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return data[0]
    if isinstance(data, dict):
        if data.get("id"):
            return data
        # PostgREST error payload — not a row.
        if data.get("code") and data.get("message"):
            return None
    return None

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth's radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c


async def _fallback_nearby_salons(
    p_lat: float,
    p_lng: float,
    radius: float,
    search: Optional[str],
    limit: int,
    offset: int,
    gender_filter: Optional[str] = None,
) -> List[dict]:
    """
    Used when RPC get_nearby_salons_v1 is missing or errors (e.g. migration not applied).
    Mirrors RPC shape enough for mobile list + SalonCard.
    """
    resp = await supabase.request("GET", "rest/v1/salons", params={"select": "*"})
    if resp.status_code != 200:
        logger.error(f"[get_salons fallback] salons fetch failed: {resp.text}")
        return []
    rows = resp.json() or []
    q = (search or "").strip().lower()

    enriched: List[dict] = []
    for s in rows:
        if not salon_matches_discover_filter(s.get("gender_serve"), gender_filter):
            continue
        if not s.get("subscription_active", True):
            continue
        if s.get("accepting_bookings") is False:
            continue
        closed_until = s.get("closed_until")
        if closed_until:
            try:
                closed_dt = datetime.fromisoformat(str(closed_until).replace("Z", "+00:00"))
                if closed_dt > datetime.now(timezone.utc):
                    continue
            except (ValueError, TypeError):
                if s.get("accepting_bookings") is False:
                    continue
        lat, lon = s.get("latitude"), s.get("longitude")
        if lat is None or lon is None:
            continue
        if q:
            blob = " ".join(
                [
                    str(s.get("name") or ""),
                    str(s.get("address") or ""),
                    str(s.get("description") or ""),
                ]
            ).lower()
            if q not in blob:
                continue
        if p_lat == 0.0 and p_lng == 0.0:
            dist = None
        else:
            dist = haversine(p_lat, p_lng, float(lat), float(lon))
            if dist > radius:
                continue
        item = {**s, "avg_rating": 0, "review_count": 0, "services": []}
        if dist is not None:
            item["distance"] = round(dist, 1)
        enriched.append(item)

    if p_lat == 0.0 and p_lng == 0.0:
        enriched.sort(key=lambda x: (x.get("name") or "").lower())
    else:
        enriched.sort(key=lambda x: x.get("distance") or 0)

    return enriched[offset : offset + limit]


@router.get("/")
async def get_salons(
    lat: Optional[float] = None, 
    lng: Optional[float] = None, 
    radius: float = 10.0,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    gender_serve: Optional[str] = None,
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    # Default to 0,0 if no location provided (or handle as search-only)
    # In a real production app, we might use IP-based geocoding as a fallback
    p_lat = lat if lat is not None else 0.0
    p_lng = lng if lng is not None else 0.0
    
    gender_filter = normalize_discover_filter(gender_serve)

    # Call the spatial pagination RPC
    rpc_payload = {
        "p_lat": p_lat,
        "p_lng": p_lng,
        "p_radius_km": radius,
        "p_search": search,
        "p_limit": limit,
        "p_offset": offset,
        "p_gender_serve": gender_filter,
    }
    
    response = await supabase.request(
        "POST", 
        "rest/v1/rpc/get_nearby_salons_v1", 
        json=rpc_payload
    )
    
    if response.status_code != 200:
        logger.error(f"RPC get_nearby_salons_v1 failed ({response.status_code}): {response.text}")
        salons = await _fallback_nearby_salons(p_lat, p_lng, radius, search, limit, offset, gender_filter)
    else:
        salons = response.json()

    for s in salons:
        _sync_salon_image_fields(s)
        _strip_bank_details(s)
        d = s.get("distance")
        if isinstance(d, (int, float)) and d is not None:
            s["distance"] = round(float(d), 1)
    
    # Return paginated envelope
    return {
        "data": salons,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "has_more": len(salons) == limit
        }
    }

@router.get("/{salon_id}")
async def get_salon(salon_id: str):
    try:
        uuid.UUID(salon_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Salon not found")
        
    response = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=*,services(*),reviews(*)")
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail={"code": "DETAIL_QUERY_FAILED", "message": "Failed to fetch salon detail"})
    if not response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    salon = _strip_bank_details(_sync_salon_image_fields(response.json()[0]))
    reviews = salon.get("reviews", [])
    if reviews:
        salon["avg_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
        salon["review_count"] = len(reviews)
    else:
        salon["avg_rating"] = 0
        salon["review_count"] = 0

    cat_resp = await supabase.request(
        "GET",
        f"rest/v1/service_categories?salon_id=eq.{salon_id}&active=eq.true&select=*&order=sort_order.asc,name.asc",
    )
    salon["service_categories"] = cat_resp.json() if cat_resp.status_code == 200 else []

    return salon

@router.post("/")
async def create_salon(salon: SalonCreate, current_user: dict = Depends(get_current_user)):
    logger.debug("[CREATE_SALON] user=%s", current_user.get("id"))

    try:
        profile = current_user.get("profile")
        if not profile or profile.get("role") != "owner":
            logger.error(
                "[CREATE_SALON] User %s is not an owner: %s",
                current_user.get("id"),
                profile,
            )
            raise HTTPException(status_code=403, detail="Only owners can create salons")

        owner_id = current_user.get("id")

        # Check if owner already has a salon
        check_existing = await supabase.request(
            "GET",
            f"rest/v1/salons?owner_id=eq.{owner_id}&select=id",
            token=current_user.get("access_token"),
        )
        existing_rows = _safe_response_json(check_existing)
        if check_existing.status_code == 200 and existing_rows:
            logger.error("[CREATE_SALON] User %s already has a salon", owner_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have a salon registered. Please update the existing one.",
            )

        payload = salon.model_dump(exclude_none=True)
        payload = _sync_salon_image_fields(payload)

        # Prefill the salon's UPI ID from the owner's signup UPI (users.upi_id) when
        # the create form didn't supply one — so "Pay with UPI" works immediately.
        if not payload.get("upi_id"):
            owner_upi = (profile or {}).get("upi_id")
            if owner_upi:
                payload["upi_id"] = owner_upi

        salon_data = {
            "id": str(uuid.uuid4()),
            "owner_id": owner_id,
            **payload,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        logger.debug("[CREATE_SALON] creating salon for owner=%s", owner_id)

        # Service role insert: owner verified above; avoids RLS edge cases on first salon.
        response = await supabase.request(
            "POST",
            "rest/v1/salons",
            json=salon_data,
            service_role=True,
        )

        if settings.ENVIRONMENT != "production":
            logger.debug("[CREATE_SALON] status=%s", response.status_code)

        if response.status_code not in [200, 201]:
            error_detail = response.text or ""
            logger.error("[CREATE_SALON] Failed to create salon: %s", error_detail)
            if "subscriptions_salon_id_fkey" in error_detail or "link_salon_to_subscription" in error_detail:
                logger.error(
                    "[CREATE_SALON] Likely missing migration 44 — apply "
                    "database/44_fix_salon_subscription_trigger_fk.sql in Supabase."
                )
            raise HTTPException(
                status_code=400,
                detail="We couldn't save your salon right now. Please try again in a moment.",
            )

        row = _first_postgrest_row(_safe_response_json(response))
        if not row:
            logger.error("[CREATE_SALON] Salon created but no row in response")
            raise HTTPException(
                status_code=500,
                detail="Salon created but no data returned",
            )

        if settings.ENVIRONMENT != "production":
            logger.debug("[CREATE_SALON] Success salon_id=%s", row.get("id"))
        return row
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[CREATE_SALON] unexpected error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="We couldn't save your salon right now. Please try again in a moment.",
        )

@router.patch("/{salon_id}")
async def update_salon(salon_id: str, data: SalonUpdate, current_user: dict = Depends(require_active_subscription)):
    await assert_salon_owner(salon_id, current_user.get("id"))

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data = _sync_salon_image_fields(update_data)
    response = await supabase.request(
        "PATCH",
        f"rest/v1/salons?id=eq.{salon_id}",
        json=update_data,
        token=current_user.get("access_token"),
    )
    if response.status_code not in (200, 204):
        logger.error("[update_salon] patch failed: %s %s", response.status_code, response.text)
        raise HTTPException(status_code=400, detail="Failed to update salon")

    fetch = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&select=*",
        token=current_user.get("access_token"),
    )
    if fetch.status_code != 200 or not fetch.json():
        raise HTTPException(status_code=500, detail="Salon updated but could not reload")
    return fetch.json()[0]


@router.patch("/{salon_id}/availability")
async def update_salon_availability(
    salon_id: str,
    data: SalonAvailabilityUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Owner kill-switch: turn new bookings ON/OFF with an optional timed reopen.

    Separate from subscription. Does NOT touch existing bookings — only blocks
    NEW bookings while closed. Deliberately NOT behind require_active_subscription
    so a frozen owner can still reopen once they re-subscribe.
    """
    await assert_salon_owner(salon_id, current_user.get("id"))

    now_iso = datetime.now(timezone.utc).isoformat()
    if data.accepting_bookings:
        # Reopen now: clear the closed window + reason.
        update_data = {
            "accepting_bookings": True,
            "closed_until": None,
            "closed_at": None,
            "closed_reason": None,
        }
    else:
        update_data = {
            "accepting_bookings": False,
            "closed_until": data.closed_until,  # None = indefinite
            "closed_at": now_iso,
            "closed_reason": data.reason,
        }

    response = await supabase.request(
        "PATCH",
        f"rest/v1/salons?id=eq.{salon_id}",
        json=update_data,
        token=current_user.get("access_token"),
    )
    if response.status_code not in (200, 204):
        logger.error(
            "[update_salon_availability] patch failed: %s %s",
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=400,
            detail={"code": "AVAILABILITY_UPDATE_FAILED", "message": "Could not update availability."},
        )

    fetch = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&select=*",
        token=current_user.get("access_token"),
    )
    if fetch.status_code != 200 or not fetch.json():
        raise HTTPException(status_code=500, detail="Availability updated but could not reload")
    return _strip_bank_details(fetch.json()[0])


@router.post("/internal/run-availability")
async def run_availability(request: Request, authorization: Optional[str] = Header(None)):
    """Cron-triggered: auto-reopen elapsed closed windows + remind owners closed >24h.

    Admin-token protected (same pattern as subscription reminders).
    """
    if not settings.ADMIN_API_TOKEN:
        raise HTTPException(status_code=404, detail="Not Found")
    token = authorization.split(" ", 1)[-1].strip() if authorization else ""
    if not token or not hmac.compare_digest(token, settings.ADMIN_API_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")
    from services import salon_availability_notifications as avail_notify
    result = await avail_notify.run_availability_sweep()
    return {"status": "ok", **result}

@router.post("/{salon_id}/services")
async def create_service(salon_id: str, service: ServiceCreate, current_user: dict = Depends(require_active_subscription)):
    # Ownership check... (omitted for brevity in this step, but I'll include it)
    await assert_salon_owner(salon_id, current_user.get("id"))

    salon_resp = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&select=gender_serve",
        service_role=True,
    )
    salon_gender = "unisex"
    if salon_resp.status_code == 200 and salon_resp.json():
        salon_gender = salon_resp.json()[0].get("gender_serve") or "unisex"

    service_data = {
        "id": str(uuid.uuid4()),
        "salon_id": salon_id,
        # Exclude nulls so PostgREST doesn't try to write unknown columns like `category`
        # when DB schema is behind the backend model.
        **service.model_dump(exclude_none=True),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if not service_data.get("audience"):
        service_data["audience"] = default_service_audience_for_salon(salon_gender)
    ins = await supabase.request("POST", "rest/v1/services", json=service_data, token=current_user.get("access_token"))
    if ins.status_code not in (200, 201):
        logger.error(f"[create_service] insert failed: {ins.status_code} {ins.text}")
        raise HTTPException(
            status_code=400,
            detail={
                "code": "SERVICE_CREATE_FAILED",
                "message": "Could not create service",
                "supabase_status": ins.status_code,
                "supabase_body": ins.text,
            },
        )
    rows = ins.json() if hasattr(ins, "json") else None
    # Return created row for immediate UI update/debug.
    return rows[0] if rows else {"message": "Service created"}


@router.patch("/{salon_id}/services/{service_id}")
async def update_service(
    salon_id: str,
    service_id: str,
    data: ServiceUpdate,
    current_user: dict = Depends(require_active_subscription),
):
    await assert_salon_owner(salon_id, current_user.get("id"))
    svc = await supabase.request(
        "GET",
        f"rest/v1/services?id=eq.{service_id}&select=id,salon_id",
        token=current_user.get("access_token"),
    )
    if svc.status_code != 200 or not svc.json() or svc.json()[0].get("salon_id") != salon_id:
        raise HTTPException(status_code=404, detail="Service not found")
    update_data = {k: v for k, v in data.model_dump(exclude_none=True).items() if v is not None}
    if not update_data:
        return {"message": "No changes"}
    await supabase.request(
        "PATCH",
        f"rest/v1/services?id=eq.{service_id}",
        json=update_data,
        token=current_user.get("access_token"),
    )
    return {"message": "Service updated"}


@router.delete("/{salon_id}/services/{service_id}")
async def delete_service(
    salon_id: str,
    service_id: str,
    current_user: dict = Depends(require_active_subscription),
):
    await assert_salon_owner(salon_id, current_user.get("id"))
    svc = await supabase.request(
        "GET",
        f"rest/v1/services?id=eq.{service_id}&select=salon_id",
        token=current_user.get("access_token"),
    )
    if svc.status_code != 200 or not svc.json() or svc.json()[0].get("salon_id") != salon_id:
        raise HTTPException(status_code=404, detail="Service not found")
    await supabase.request(
        "DELETE",
        f"rest/v1/services?id=eq.{service_id}",
        token=current_user.get("access_token"),
    )
    return {"message": "Service deleted"}
