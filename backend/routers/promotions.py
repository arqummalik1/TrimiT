from fastapi import APIRouter, Request, HTTPException, Depends, status
from typing import List
import uuid
import logging
from datetime import datetime, timezone

from core.supabase import supabase
from core.salon_auth import assert_salon_owner
from core.limiter import limiter
from dependencies.auth import get_current_user
from dependencies.subscription import require_active_subscription
from models.promotions import (
    PromoCodeValidate,
    PromoCodeResponse,
    PromotionCreate,
    PromotionUpdate,
    PromotionStats,
)
from models.campaigns import CheckoutOffersRequest, CheckoutOffersResponse, CampaignGrantResponse
from services import promo_pricing
from services import campaigns as campaign_service

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
        platform = await campaign_service.validate_campaign_rpc(
            code=data.code,
            salon_id=data.salon_id,
            user_id=current_user.get("id"),
            booking_amount=data.booking_amount,
        )
        salon = await promo_pricing.validate_salon_promo_rpc(
            code=data.code,
            salon_id=data.salon_id,
            user_id=current_user.get("id"),
            booking_amount=data.booking_amount,
        )

        result = None
        if platform.get("valid"):
            result = platform
        elif salon.get("valid"):
            result = salon
        else:
            result = platform if platform.get("error") else salon

        if not result.get("valid"):
            return PromoCodeResponse(
                valid=False,
                error=result.get("error", "Invalid promo code"),
            )

        return PromoCodeResponse(
            valid=True,
            promo_id=result.get("promo_id") or result.get("grant_id"),
            code=result.get("code"),
            discount_amount=result.get("discount_amount"),
            final_amount=result.get("final_amount"),
            description=result.get("description"),
            source=result.get("source"),
        )
        
    except Exception as e:
        logger.error(f"Promo validation error: {str(e)}")
        return PromoCodeResponse(
            valid=False,
            error="An error occurred while validating the promo code"
        )

@router.post("/checkout-offers", response_model=CheckoutOffersResponse)
@limiter.limit("30/minute")
async def get_checkout_offers(
    request: Request,
    data: CheckoutOffersRequest,
    current_user: dict = Depends(get_current_user),
):
    """Zomato-style offers list for checkout + auto-apply candidate for welcome voucher."""
    offers = await promo_pricing.get_checkout_offers(
        salon_id=data.salon_id,
        user_id=current_user.get("id"),
        list_price=data.list_price,
        offer_price=data.offer_price,
    )
    return CheckoutOffersResponse(**offers)


@router.get("/my-grants", response_model=list[CampaignGrantResponse])
async def get_my_grants(current_user: dict = Depends(get_current_user)):
    """Customer wallet — active platform vouchers (Profile → My Offers)."""
    grants = await campaign_service.get_user_grants(current_user.get("id"), active_only=False)
    out = []
    for g in grants:
        camp = g.get("platform_campaigns") or {}
        out.append(
            CampaignGrantResponse(
                id=g["id"],
                code=g["code"],
                issued_at=g["issued_at"],
                expires_at=g["expires_at"],
                redeemed_at=g.get("redeemed_at"),
                description=camp.get("description"),
                discount_type=camp.get("discount_type"),
                discount_value=camp.get("discount_value"),
                min_order_value=camp.get("min_order_value"),
                campaign_name=camp.get("name"),
            )
        )
    return out


@router.get("/active")
async def get_active_promotions(
    salon_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Active salon promos for checkout display (Lane A only).
    """
    if not salon_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="salon_id is required",
        )

    query = f"rest/v1/promotions?active=eq.true&salon_id=eq.{salon_id}&select=*"
    
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
    current_user: dict = Depends(require_active_subscription)
):
    """
    Create a new promotion.
    Owners can create salon-specific promos.
    Only admins can create global promos (salon_id = NULL).
    """
    profile = current_user.get("profile")

    salon_id = promo.salon_id
    if not salon_id:
        salon_response = await supabase.request(
            "GET",
            f"rest/v1/salons?owner_id=eq.{current_user.get('id')}&select=id",
            token=current_user.get("access_token"),
        )
        if salon_response.status_code != 200 or not salon_response.json():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No salon found for this owner",
            )
        salon_id = salon_response.json()[0]["id"]
        await assert_salon_owner(str(salon_id), current_user.get("id"))
    else:
        await assert_salon_owner(str(salon_id), current_user.get("id"))

    promo_payload = promo.model_dump()
    promo_payload["salon_id"] = salon_id
    promo_payload.pop("usage_limit", None)

    promo_data = {
        "id": str(uuid.uuid4()),
        "code": promo.code.upper(),
        "created_by": current_user.get("id"),
        **promo_payload,
        "usage_limit": promo.usage_limit,
        "created_at": datetime.now(timezone.utc).isoformat(),
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
    current_user: dict = Depends(require_active_subscription)
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
        await assert_salon_owner(str(salon_id), current_user.get("id"))

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
    current_user: dict = Depends(require_active_subscription)
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
        await assert_salon_owner(str(salon_id), current_user.get("id"))

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
