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
            f"rest/v1/bookings?id=eq.{data.booking_id}"
            f"&user_id=eq.{uid}&salon_id=eq.{data.salon_id}"
            "&status=eq.completed&select=id"
        ),
        token=token,
    )
    if br.status_code != 200 or not br.json():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review a completed booking you attended",
        )

    existing = await supabase.request(
        "GET",
        f"rest/v1/reviews?booking_id=eq.{data.booking_id}&user_id=eq.{uid}&select=id",
        token=token,
    )
    if existing.status_code == 200 and existing.json():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this booking",
        )

    row = {
        "id": str(uuid.uuid4()),
        "booking_id": data.booking_id,
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
