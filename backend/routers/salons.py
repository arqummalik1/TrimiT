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


async def _fallback_nearby_salons(
    p_lat: float,
    p_lng: float,
    radius: float,
    search: Optional[str],
    limit: int,
    offset: int,
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
            item["distance"] = round(dist, 2)
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
        logger.error(f"RPC get_nearby_salons_v1 failed ({response.status_code}): {response.text}")
        salons = await _fallback_nearby_salons(p_lat, p_lng, radius, search, limit, offset)
    else:
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
    response = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=*,services(*),reviews(*)")
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail={"code": "DETAIL_QUERY_FAILED", "message": "Failed to fetch salon detail"})
    if not response.json():
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
    logger.info(f"[CREATE_SALON] Received request from user {current_user.get('id')}")
    logger.info(f"[CREATE_SALON] Salon data: {salon.model_dump()}")
    
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "owner":
        logger.error(f"[CREATE_SALON] User {current_user.get('id')} is not an owner: {profile}")
        raise HTTPException(status_code=403, detail="Only owners can create salons")
    
    # Check if owner already has a salon
    check_existing = await supabase.request(
        "GET", 
        f"rest/v1/salons?owner_id=eq.{current_user.get('id')}&select=id",
        token=current_user.get("access_token")
    )
    if check_existing.status_code == 200 and check_existing.json():
        logger.error(f"[CREATE_SALON] User {current_user.get('id')} already has a salon")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="You already have a salon registered. Please update the existing one."
        )

    salon_data = {
        "id": str(uuid.uuid4()),
        "owner_id": current_user.get("id"),
        **salon.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    logger.info(f"[CREATE_SALON] Sending to Supabase: {salon_data}")
    
    response = await supabase.request("POST", "rest/v1/salons", json=salon_data, token=current_user.get("access_token"))
    
    logger.info(f"[CREATE_SALON] Supabase response status: {response.status_code}")
    logger.info(f"[CREATE_SALON] Supabase response body: {response.text}")
    
    if response.status_code not in [200, 201]:
        error_detail = response.text
        logger.error(f"[CREATE_SALON] Failed to create salon: {error_detail}")
        
        # Try to parse the error for better user feedback
        try:
            error_json = response.json()
            if 'message' in error_json:
                error_detail = error_json['message']
            elif 'details' in error_json:
                error_detail = error_json['details']
        except:
            pass
            
        raise HTTPException(status_code=400, detail=f"Database error: {error_detail}")
        
    res_data = response.json()
    if not res_data:
        logger.error("[CREATE_SALON] Salon created but no data returned")
        raise HTTPException(status_code=500, detail="Salon created but no data returned")
        
    logger.info(f"[CREATE_SALON] Success: {res_data[0]}")
    return res_data[0]

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
        # Exclude nulls so PostgREST doesn't try to write unknown columns like `category`
        # when DB schema is behind the backend model.
        **service.model_dump(exclude_none=True),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
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
    current_user: dict = Depends(get_current_user),
):
    check = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=owner_id")
    if check.status_code != 200 or not check.json() or check.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
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
    current_user: dict = Depends(get_current_user),
):
    check = await supabase.request("GET", f"rest/v1/salons?id=eq.{salon_id}&select=owner_id")
    if check.status_code != 200 or not check.json() or check.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
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
