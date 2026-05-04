from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
import uuid
import logging

from core.supabase import supabase
from dependencies.auth import get_current_user
from models.bookings import ReviewCreate

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/")
async def create_review(data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("id")
    token = current_user.get("access_token")

    br = await supabase.request(
        "GET",
        (
            f"rest/v1/bookings?salon_id=eq.{data.salon_id}&user_id=eq.{uid}"
            "&status=eq.completed&select=id&order=created_at.desc&limit=1"
        ),
        token=token,
    )
    booking_id = None
    if br.status_code == 200 and br.json():
        booking_id = br.json()[0]["id"]

    row = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "user_id": uid,
        "salon_id": data.salon_id,
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    ins = await supabase.request("POST", "rest/v1/reviews", json=row, token=token)
    if ins.status_code not in (200, 201):
        logger.error(f"[reviews] insert failed: {ins.status_code} {ins.text}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not submit review")
    return {"message": "Review submitted"}
