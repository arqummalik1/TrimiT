from fastapi import APIRouter, Depends, HTTPException, Query
import httpx
import logging

from config import settings
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/geocode", tags=["Geocode"])


@router.get("/")
async def geocode_address(
    address: str = Query(..., min_length=3, max_length=500),
    current_user: dict = Depends(get_current_user),
):
    """Proxy Google Geocoding so the Maps API key stays server-side."""
    _ = current_user
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Geocoding is not configured")

    params = {"address": address, "key": settings.GOOGLE_MAPS_API_KEY}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params=params,
        )

    if resp.status_code != 200:
        logger.error("[Geocode] upstream status=%s", resp.status_code)
        raise HTTPException(status_code=502, detail="Geocoding request failed")

    data = resp.json()
    status = data.get("status")
    if status == "ZERO_RESULTS":
        raise HTTPException(status_code=404, detail="No locations found for this address")
    if status != "OK":
        raise HTTPException(status_code=400, detail=f"Geocoding error: {status}")

    result = data["results"][0]
    loc = result["geometry"]["location"]
    return {
        "coordinates": {"latitude": loc["lat"], "longitude": loc["lng"]},
        "formattedAddress": result.get("formatted_address", address),
    }
