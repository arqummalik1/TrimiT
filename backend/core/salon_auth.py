"""Salon ownership checks using service role + Python enforcement."""

from fastapi import HTTPException
from core.supabase import supabase


async def assert_salon_owner(salon_id: str, user_id: str) -> None:
    response = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&select=owner_id",
        service_role=True,
    )
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    if response.json()[0].get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
