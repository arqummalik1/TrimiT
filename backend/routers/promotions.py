from fastapi import APIRouter, Request, HTTPException, Depends, status
from typing import List
import uuid
import logging
from datetime import datetime, timezone

from core.supabase import supabase
from core.limiter import limiter
from dependencies.auth import get_current_user
from models.promotions import (
    PromoCodeValidate, 
    PromoCodeResponse,
    PromotionCreate,
    PromotionUpdate,
    PromotionStats
)

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/promotions", tags=["Promotions"])

@router.post("/validate", response_model=PromoCodeResponse)
@limiter.limit("10/minute")
async def validate_promo_code(
    request: Request,
    data: PromoCodeValidate,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate a promo code and calculate discount.
    Returns discount amount and final price.
    """
    try:
        # Call the database function
        response = await supabase.request(
            "POST",
            "rest/v1/rpc/validate_promo_code",
            json={
                "p_code": data.code.upper(),
                "p_salon_id": data.salon_id,
                "p_user_id": current_user.get("id"),
                "p_booking_amount": data.booking_amount
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Promo validation failed: {response.text}")
            return PromoCodeResponse(
                valid=False,
                error="Failed to validate promo code"
            )
        
        result = response.json()
        
        return PromoCodeResponse(
            valid=result.get("valid", False),
            promo_id=result.get("promo_id"),
            discount_amount=result.get("discount_amount"),
            final_amount=result.get("final_amount"),
            description=result.get("description"),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error(f"Promo validation error: {str(e)}")
        return PromoCodeResponse(
            valid=False,
            error="An error occurred while validating the promo code"
        )

@router.get("/active")
async def get_active_promotions(
    salon_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all active promotions.
    If salon_id provided, returns salon-specific + global promos.
    """
    query = "rest/v1/promotions?active=eq.true&select=*"
    
    # Filter by salon or global
    if salon_id:
        query += f"&or=(salon_id.is.null,salon_id.eq.{salon_id})"
    else:
        query += "&salon_id=is.null"
    
    # Only show non-expired
    query += f"&or=(expires_at.is.null,expires_at.gt.{datetime.now(timezone.utc).isoformat()})"
    
    response = await supabase.request("GET", query)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch promotions"
        )
    
    return response.json()

@router.post("/")
@limiter.limit("5/minute")
async def create_promotion(
    request: Request,
    promo: PromotionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new promotion.
    Owners can create salon-specific promos.
    Only admins can create global promos (salon_id = NULL).
    """
    profile = current_user.get("profile")
    
    # If salon-specific, verify ownership
    if promo.salon_id:
        check = await supabase.request(
            "GET",
            f"rest/v1/salons?id=eq.{promo.salon_id}&select=owner_id"
        )
        
        if check.status_code != 200 or not check.json():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Salon not found"
            )
        
        salon = check.json()[0]
        if salon.get("owner_id") != current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create promotions for your own salon"
            )
    else:
        # Global promos require admin role (future feature)
        # For now, block global promos
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Global promotions are not yet supported"
        )
    
    promo_data = {
        "id": str(uuid.uuid4()),
        "code": promo.code.upper(),
        "created_by": current_user.get("id"),
        **promo.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    response = await supabase.request(
        "POST",
        "rest/v1/promotions",
        json=promo_data,
        token=current_user.get("access_token")
    )
    
    if response.status_code not in [200, 201]:
        error_detail = response.json().get("message", "Failed to create promotion")
        if "duplicate key" in error_detail.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Promo code already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )
    
    return response.json()[0] if response.json() else {"message": "Promotion created"}

@router.get("/owner")
async def get_owner_promotions(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all promotions created by the current owner.
    """
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can access this endpoint"
        )
    
    # Get owner's salon
    salon_response = await supabase.request(
        "GET",
        f"rest/v1/salons?owner_id=eq.{current_user.get('id')}&select=id",
        token=current_user.get("access_token")
    )
    
    if salon_response.status_code != 200 or not salon_response.json():
        return []
    
    salon_id = salon_response.json()[0]["id"]
    
    # Get promotions for this salon
    response = await supabase.request(
        "GET",
        f"rest/v1/promotions?salon_id=eq.{salon_id}&select=*&order=created_at.desc",
        token=current_user.get("access_token")
    )
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch promotions"
        )
    
    return response.json()

@router.patch("/{promo_id}")
async def update_promotion(
    promo_id: str,
    data: PromotionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a promotion. Only the creator can update.
    """
    # Verify ownership
    check = await supabase.request(
        "GET",
        f"rest/v1/promotions?id=eq.{promo_id}&select=salon_id",
        token=current_user.get("access_token")
    )
    
    if check.status_code != 200 or not check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found"
        )
    
    promo = check.json()[0]
    salon_id = promo.get("salon_id")
    
    # Verify salon ownership
    if salon_id:
        salon_check = await supabase.request(
            "GET",
            f"rest/v1/salons?id=eq.{salon_id}&select=owner_id"
        )
        
        if salon_check.status_code != 200 or not salon_check.json():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized"
            )
        
        if salon_check.json()[0].get("owner_id") != current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized"
            )
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    response = await supabase.request(
        "PATCH",
        f"rest/v1/promotions?id=eq.{promo_id}",
        json=update_data,
        token=current_user.get("access_token")
    )
    
    if response.status_code not in [200, 204]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update promotion"
        )
    
    return {"message": "Promotion updated successfully"}

@router.delete("/{promo_id}")
async def delete_promotion(
    promo_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Soft delete (deactivate) a promotion.
    """
    # Verify ownership (same as update)
    check = await supabase.request(
        "GET",
        f"rest/v1/promotions?id=eq.{promo_id}&select=salon_id",
        token=current_user.get("access_token")
    )
    
    if check.status_code != 200 or not check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found"
        )
    
    promo = check.json()[0]
    salon_id = promo.get("salon_id")
    
    if salon_id:
        salon_check = await supabase.request(
            "GET",
            f"rest/v1/salons?id=eq.{salon_id}&select=owner_id"
        )
        
        if salon_check.status_code != 200 or not salon_check.json():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized"
            )
        
        if salon_check.json()[0].get("owner_id") != current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized"
            )
    
    # Soft delete by setting active = false
    response = await supabase.request(
        "PATCH",
        f"rest/v1/promotions?id=eq.{promo_id}",
        json={"active": False},
        token=current_user.get("access_token")
    )
    
    if response.status_code not in [200, 204]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete promotion"
        )
    
    return {"message": "Promotion deleted successfully"}

@router.get("/{promo_id}/stats", response_model=PromotionStats)
async def get_promotion_stats(
    promo_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get usage statistics for a promotion.
    """
    # Verify ownership
    check = await supabase.request(
        "GET",
        f"rest/v1/promotions?id=eq.{promo_id}&select=salon_id,used_count",
        token=current_user.get("access_token")
    )
    
    if check.status_code != 200 or not check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found"
        )
    
    promo = check.json()[0]
    
    # Get detailed usage stats
    usage_response = await supabase.request(
        "GET",
        f"rest/v1/promo_usage?promo_id=eq.{promo_id}&select=discount_applied,user_id",
        token=current_user.get("access_token")
    )
    
    if usage_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch stats"
        )
    
    usage_data = usage_response.json()
    
    total_usage = len(usage_data)
    total_discount = sum(u["discount_applied"] for u in usage_data)
    unique_users = len(set(u["user_id"] for u in usage_data))
    
    # Calculate conversion rate (simplified - would need more data in production)
    conversion_rate = (total_usage / max(promo.get("used_count", 1), 1)) * 100
    
    return PromotionStats(
        total_usage=total_usage,
        total_discount_given=total_discount,
        unique_users=unique_users,
        conversion_rate=round(conversion_rate, 2)
    )
