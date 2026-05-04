from fastapi import APIRouter, Request, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
import uuid
import logging
from math import radians, sin, cos, sqrt, atan2

from core.supabase import supabase
from dependencies.auth import get_current_user
from models.salons import SalonCreate, SalonUpdate, ServiceCreate, ServiceUpdate

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/salons", tags=["Salons"])

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth's radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

@router.get("/")
async def get_salons(
    lat: Optional[float] = None, 
    lng: Optional[float] = None, 
    radius: float = 10.0,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
):
    # Default to 0,0 if no location provided (or handle as search-only)
    # In a real production app, we might use IP-based geocoding as a fallback
    p_lat = lat if lat is not None else 0.0
    p_lng = lng if lng is not None else 0.0
    
    # Call the spatial pagination RPC
    rpc_payload = {
        "p_lat": p_lat,
        "p_lng": p_lng,
        "p_radius_km": radius,
        "p_search": search,
        "p_limit": limit,
        "p_offset": offset
    }
    
    response = await supabase.request(
        "POST", 
        "rest/v1/rpc/get_nearby_salons_v1", 
        json=rpc_payload
    )
    
    if response.status_code != 200:
        logger.error(f"RPC get_nearby_salons_v1 failed: {response.text}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Failed to fetch nearby salons"
        )
    
    salons = response.json()
    
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
    response = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=*,services(*,reviews(*,users(name)))")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    salon = response.json()[0]
    reviews = salon.get("reviews", [])
    if reviews:
        salon["avg_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
        salon["review_count"] = len(reviews)
    else:
        salon["avg_rating"] = 0
        salon["review_count"] = 0
        
    return salon

@router.post("/")
async def create_salon(salon: SalonCreate, current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can create salons")
    
    salon_data = {
        "id": str(uuid.uuid4()),
        "owner_id": current_user.get("id"),
        **salon.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    response = await supabase.request("POST", "rest/v1/salons", json=salon_data, token=current_user.get("access_token"))
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail="Failed to create salon")
        
    return response.json()[0]

@router.patch("/{salon_id}")
async def update_salon(salon_id: str, data: SalonUpdate, current_user: dict = Depends(get_current_user)):
    # Ownership check
    check = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=owner_id")
    if check.status_code != 200 or not check.json() or check.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    response = await supabase.request("PATCH", f"rest/v1/salons?id=eq.{salon_id}", json=update_data, token=current_user.get("access_token"))
    return {"message": "Updated"}

@router.post("/{salon_id}/services")
async def create_service(salon_id: str, service: ServiceCreate, current_user: dict = Depends(get_current_user)):
    # Ownership check... (omitted for brevity in this step, but I'll include it)
    check = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=owner_id")
    if check.status_code != 200 or not check.json() or check.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    service_data = {
        "id": str(uuid.uuid4()),
        "salon_id": salon_id,
        **service.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await supabase.request("POST", "rest/v1/services", json=service_data, token=current_user.get("access_token"))
    return {"message": "Service created"}
