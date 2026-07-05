from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging
import re

from pydantic import BaseModel, field_validator

from core.supabase import supabase
from config import settings
from services.salon_access import (
    assert_salon_manager,
    get_managed_salon_ids,
    get_primary_salon_for_manager,
    is_salon_manager_role,
)
from dependencies.auth import get_current_user
from dependencies.subscription import require_active_subscription

logger = logging.getLogger("trimit")

# IFSC: 4 uppercase letters + '0' + 6 alphanumeric chars
_IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")

router = APIRouter(prefix="/owner", tags=["Owner"])


class BankDetailsUpdate(BaseModel):
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_account_holder_name: Optional[str] = None

    @field_validator("bank_ifsc")
    @classmethod
    def validate_ifsc(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        v = v.strip().upper()
        if not _IFSC_RE.match(v):
            raise ValueError("Invalid IFSC code format (e.g. SBIN0001234)")
        return v


def _mask_account_number(acct: Optional[str]) -> Optional[str]:
    """Return only last 4 digits: ****1234."""
    if not acct or len(acct) < 4:
        return acct
    return "*" * (len(acct) - 4) + acct[-4:]

@router.get("/salon")
async def get_owner_salon(current_user: dict = Depends(get_current_user)):
    """
    Get the salon for the current owner or linked staff employee.
    Returns 404 if no salon is associated.
    """
    user_id = current_user.get("id")
    profile = current_user.get("profile") or {}
    role = profile.get("role", "customer")

    if not is_salon_manager_role(role):
        raise HTTPException(status_code=403, detail="Salon access required")

    logger.debug("[GET_OWNER_SALON] Fetching salon for user %s role=%s", user_id, role)

    salon = await get_primary_salon_for_manager(
        user_id,
        role,
        token=current_user.get("access_token"),
    )

    if not salon:
        logger.warning("[GET_OWNER_SALON] No salon found for user %s", user_id)
        raise HTTPException(status_code=404, detail="No salon found for this account")
    # Align thumbnail fields for mobile (images[] + image_url)
    images = salon.get("images") or []
    if isinstance(images, list) and images and not salon.get("image_url"):
        salon["image_url"] = images[0]
    elif salon.get("image_url") and (not images or images == []):
        salon["images"] = [salon["image_url"]]

    salon_id = salon.get('id')
    logger.info(f"[GET_OWNER_SALON] Salon found: {salon_id}")
    
    # Step 2: Fetch services separately
    services_response = await supabase.request(
        "GET",
        f"rest/v1/services?salon_id=eq.{salon_id}&select=*",
        token=current_user.get("access_token")
    )
    
    logger.info(f"[GET_OWNER_SALON] Services query status: {services_response.status_code}")
    
    if services_response.status_code == 200:
        services = services_response.json()
        salon['services'] = services
        logger.info(f"[GET_OWNER_SALON] Found {len(services)} services")
    else:
        logger.warning(f"[GET_OWNER_SALON] Failed to fetch services: {services_response.text}")
        salon['services'] = []

    categories_response = await supabase.request(
        "GET",
        f"rest/v1/service_categories?salon_id=eq.{salon_id}&select=*&order=sort_order.asc,name.asc",
        token=current_user.get("access_token"),
    )
    if categories_response.status_code == 200:
        salon['service_categories'] = categories_response.json() or []
    else:
        salon['service_categories'] = []
    
    logger.info(f"[GET_OWNER_SALON] Returning salon with {len(salon.get('services', []))} services")
    return salon

@router.get("/analytics")
async def get_owner_analytics(period: str = "today", current_user: dict = Depends(require_active_subscription)):
    """
    Get business analytics for the current owner's salon.
    """
    user_id = current_user.get("id")
    profile = current_user.get("profile") or {}
    role = profile.get("role", "customer")

    if role == "employee":
        raise HTTPException(status_code=403, detail="Only salon owners can view analytics")

    # 1. Get the owner's salon ID
    salon_resp = await supabase.request(
        "GET",
        f"rest/v1/salons?owner_id=eq.{user_id}&select=id",
        token=current_user.get("access_token")
    )
    
    if salon_resp.status_code != 200 or not salon_resp.json():
        raise HTTPException(status_code=404, detail="Salon not found for this owner")
        
    salon_id = salon_resp.json()[0]["id"]
    
    # 2. Fetch all bookings for this salon to aggregate
    # In a real production app with millions of records, we would use a dedicated aggregation service or RPC.
    # For now, we'll fetch and aggregate in memory or use a more efficient query.
    
    now = datetime.now(timezone.utc)
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=365) # All time / Year
        
    bookings_resp = await supabase.request(
        "GET", 
        f"rest/v1/bookings?salon_id=eq.{salon_id}&booking_date=gte.{start_date.date().isoformat()}&select=*,services(name,price)", 
        token=current_user.get("access_token")
    )
    
    if bookings_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch bookings for analytics")
        
    bookings = bookings_resp.json()
    
    # 3. Aggregate data
    total_bookings = len(bookings)
    total_earnings = sum(b.get("amount", 0) for b in bookings if b.get("status") == "completed")
    pending = len([b for b in bookings if b.get("status") == "pending"])
    confirmed = len([b for b in bookings if b.get("status") == "confirmed"])
    completed = len([b for b in bookings if b.get("status") == "completed"])
    cancelled = len([b for b in bookings if b.get("status") == "cancelled"])
    
    # Today's bookings specifically
    today_iso = now.date().isoformat()
    today_bookings = len([b for b in bookings if b.get("booking_date") == today_iso])
    
    # Popular services
    service_stats = {}
    for b in bookings:
        service = b.get("services")
        if service:
            name = service.get("name")
            if name not in service_stats:
                service_stats[name] = {"bookings": 0, "revenue": 0}
            service_stats[name]["bookings"] += 1
            if b.get("status") == "completed":
                service_stats[name]["revenue"] += b.get("amount", 0)
    
    popular_services = [
        {"name": name, "bookings": s["bookings"], "revenue": s["revenue"]}
        for name, s in service_stats.items()
    ]
    popular_services.sort(key=lambda x: x["bookings"], reverse=True)
    
    # Status distribution
    status_counts = {
        "pending": pending,
        "confirmed": confirmed,
        "completed": completed,
        "cancelled": cancelled
    }
    status_distribution = [
        {"status": k.capitalize(), "count": v, "color": "#FF9500" if k == "pending" else "#34C759" if k == "confirmed" else "#007AFF" if k == "completed" else "#FF3B30"}
        for k, v in status_counts.items()
    ]
    
    # Placeholder for trend data (would need more complex grouping)
    analytics_data = {
        "period": period,
        "total_bookings": total_bookings,
        "total_earnings": total_earnings,
        "pending_bookings": pending,
        "confirmed_bookings": confirmed,
        "completed_bookings": completed,
        "cancelled_bookings": cancelled,
        "today_bookings": today_bookings,
        "bookings_trend": [], # Simplified for now
        "peak_hours": [],
        "popular_services": popular_services[:5],
        "status_distribution": status_distribution,
        "customer_trends": []
    }
    
    return analytics_data


# ── Bank details \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

async def _get_owner_salon_id(current_user: dict) -> str:
    """Fetch salon ID for owner or linked employee."""
    profile = current_user.get("profile") or {}
    role = profile.get("role", "customer")
    salon_ids = await get_managed_salon_ids(current_user.get("id"), role)
    if not salon_ids:
        raise HTTPException(status_code=404, detail="No salon found for this account")
    return salon_ids[0]


@router.get("/bank-details")
async def get_bank_details(current_user: dict = Depends(get_current_user)):
    """Return (masked) bank details for the owner's salon."""
    salon_id = await _get_owner_salon_id(current_user)
    resp = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&select=bank_account_number,bank_ifsc,bank_account_holder_name",
        token=current_user.get("access_token"),
    )
    if resp.status_code != 200 or not resp.json():
        raise HTTPException(status_code=500, detail="Failed to fetch bank details")

    row = resp.json()[0]
    return {
        "bank_account_number_masked": _mask_account_number(row.get("bank_account_number")),
        "bank_ifsc": row.get("bank_ifsc"),
        "bank_account_holder_name": row.get("bank_account_holder_name"),
        "has_bank_details": bool(row.get("bank_account_number") and row.get("bank_ifsc")),
    }


@router.patch("/bank-details")
async def update_bank_details(
    data: BankDetailsUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update bank details for the owner's salon."""
    salon_id = await _get_owner_salon_id(current_user)
    update_payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = await supabase.request(
        "PATCH",
        f"rest/v1/salons?id=eq.{salon_id}",
        json=update_payload,
        token=current_user.get("access_token"),
    )
    if resp.status_code not in (200, 204):
        logger.error("[update_bank_details] failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=400, detail="Failed to update bank details")

    return {"message": "Bank details updated successfully"}
