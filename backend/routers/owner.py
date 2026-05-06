from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging

from core.supabase import supabase
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/owner", tags=["Owner"])

@router.get("/salon")
async def get_owner_salon(current_user: dict = Depends(get_current_user)):
    """
    Get the salon associated with the current owner.
    Returns 404 if no salon exists yet.
    """
    user_id = current_user.get("id")
    
    logger.info(f"[GET_OWNER_SALON] Fetching salon for user {user_id}")
    logger.info(f"[GET_OWNER_SALON] Token present: {bool(current_user.get('access_token'))}")
    
    # Step 1: Query salon WITHOUT services join to isolate any RLS issues
    response = await supabase.request(
        "GET", 
        f"rest/v1/salons?owner_id=eq.{user_id}&select=*", 
        token=current_user.get("access_token")
    )
    
    logger.info(f"[GET_OWNER_SALON] Salon query response status: {response.status_code}")
    logger.info(f"[GET_OWNER_SALON] Salon query response body: {response.text}")
    
    if response.status_code != 200:
        logger.error(f"[GET_OWNER_SALON] Failed to fetch owner salon: {response.text}")
        raise HTTPException(status_code=500, detail="Failed to fetch salon data")
    
    salons = response.json()
    logger.info(f"[GET_OWNER_SALON] Found {len(salons)} salons")
    
    if not salons:
        logger.warning(f"[GET_OWNER_SALON] No salon found for user {user_id}")
        raise HTTPException(status_code=404, detail="No salon found for this owner")
    
    salon = salons[0]
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
    
    logger.info(f"[GET_OWNER_SALON] Returning salon with {len(salon.get('services', []))} services")
    return salon

@router.get("/analytics")
async def get_owner_analytics(period: str = "today", current_user: dict = Depends(get_current_user)):
    """
    Get business analytics for the current owner's salon.
    """
    user_id = current_user.get("id")
    
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
