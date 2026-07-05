"""Checkout pricing — Lane A salon promo vs Lane B platform grant (best single discount wins)."""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from core.supabase import supabase
from services import campaigns


def service_list_and_offer_price(service: Dict[str, Any]) -> Tuple[float, float]:
    price = float(service.get("price") or 0)
    original = service.get("original_price")
    if service.get("is_on_offer") and original is not None:
        return float(original), price
    return price, price


async def validate_salon_promo_rpc(
    *,
    code: str,
    salon_id: str,
    user_id: str,
    booking_amount: float,
) -> Dict[str, Any]:
    resp = await supabase.request(
        "POST",
        "rest/v1/rpc/validate_promo_code",
        json={
            "p_code": code.upper(),
            "p_salon_id": salon_id,
            "p_user_id": user_id,
            "p_booking_amount": booking_amount,
        },
    )
    if resp.status_code != 200:
        return {"valid": False, "error": "Failed to validate promo code"}
    result = resp.json()
    return result if isinstance(result, dict) else {"valid": False, "error": "Invalid response"}


async def resolve_checkout_pricing(
    *,
    service: Dict[str, Any],
    salon_id: str,
    user_id: str,
    promo_code: Optional[str] = None,
) -> Dict[str, Any]:
    list_price, offer_price = service_list_and_offer_price(service)
    base = {
        "list_price": list_price,
        "offer_price": offer_price,
        "original_amount": list_price,
        "final_amount": offer_price,
        "discount_amount": max(list_price - offer_price, 0),
        "discount_source": "service_offer" if offer_price < list_price else "none",
        "promo_code": None,
    }

    if not promo_code:
        return base

    code_upper = promo_code.upper()

    platform = await campaigns.validate_campaign_rpc(
        code=code_upper,
        salon_id=salon_id,
        user_id=user_id,
        booking_amount=list_price,
    )
    salon = await validate_salon_promo_rpc(
        code=code_upper,
        salon_id=salon_id,
        user_id=user_id,
        booking_amount=list_price,
    )

    candidates = []
    for result, source in ((platform, "platform"), (salon, "salon")):
        if result.get("valid"):
            candidates.append({**result, "discount_source": source})

    if not candidates:
        err = platform.get("error") or salon.get("error") or "Invalid promo code"
        return {**base, "promo_error": err}

    best = min(candidates, key=lambda c: float(c.get("final_amount", list_price)))
    promo_final = float(best.get("final_amount", list_price))

    if promo_final >= offer_price:
        return {
            **base,
            "promo_error": "The salon offer is already better than this code",
        }

    return {
        "list_price": list_price,
        "offer_price": offer_price,
        "original_amount": list_price,
        "final_amount": promo_final,
        "discount_amount": float(best.get("discount_amount", 0)),
        "discount_source": best.get("discount_source", "salon"),
        "promo_code": best.get("code") or code_upper,
        "promo_description": best.get("description"),
    }


async def get_checkout_offers(
    *,
    salon_id: str,
    user_id: str,
    list_price: float,
    offer_price: float,
) -> Dict[str, Any]:
    """Salon promos + user platform grants with preview amounts for checkout UI."""
    now_iso = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    salon_resp = await supabase.request(
        "GET",
        f"rest/v1/promotions?active=eq.true&salon_id=eq.{salon_id}"
        f"&or=(expires_at.is.null,expires_at.gt.{now_iso})&select=*",
        service_role=True,
    )
    salon_promos = salon_resp.json() if salon_resp.status_code == 200 else []

    grants = await campaigns.get_user_grants(user_id, active_only=True)
    salon_offers = []
    platform_offers = []
    auto_apply = None

    for promo in salon_promos:
        validated = await validate_salon_promo_rpc(
            code=promo["code"],
            salon_id=salon_id,
            user_id=user_id,
            booking_amount=list_price,
        )
        if not validated.get("valid"):
            continue
        final = float(validated.get("final_amount", list_price))
        if final >= offer_price:
            continue
        salon_offers.append({
            "code": promo["code"],
            "description": validated.get("description") or promo.get("description"),
            "discount_amount": validated.get("discount_amount"),
            "final_amount": final,
            "source": "salon",
        })

    for grant in grants:
        code = grant.get("code") or ""
        campaign = grant.get("platform_campaigns") or {}
        excluded = await campaigns.is_salon_excluded(grant["campaign_id"], salon_id)
        if excluded:
            continue
        validated = await campaigns.validate_campaign_rpc(
            code=code,
            salon_id=salon_id,
            user_id=user_id,
            booking_amount=list_price,
        )
        if not validated.get("valid"):
            continue
        final = float(validated.get("final_amount", list_price))
        if final >= offer_price:
            continue
        offer = {
            "code": code,
            "description": validated.get("description") or campaign.get("description"),
            "discount_amount": validated.get("discount_amount"),
            "final_amount": final,
            "source": "platform",
            "expires_at": grant.get("expires_at"),
            "auto_apply": validated.get("auto_apply", False),
        }
        platform_offers.append(offer)

    best_price = offer_price if offer_price < list_price else list_price
    best_source = "service_offer" if offer_price < list_price else "none"

    all_offers = salon_offers + platform_offers
    if all_offers:
        best_offer = min(all_offers, key=lambda o: float(o["final_amount"]))
        if float(best_offer["final_amount"]) < best_price:
            best_price = float(best_offer["final_amount"])
            best_source = best_offer["source"]

    for offer in platform_offers:
        if offer.get("auto_apply") and offer["final_amount"] == best_price:
            auto_apply = offer
            break

    return {
        "salon_offers": salon_offers,
        "platform_offers": platform_offers,
        "best_price": best_price,
        "discount_source": best_source,
        "auto_apply": auto_apply,
    }
