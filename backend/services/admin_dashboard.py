"""Admin dashboard data — owners, customers, subscriptions, visitor analytics.

Read-only aggregations over the existing tables (service-role reads). Owner
subscription status + trial-days-left are computed with the same source of truth
the rest of the app uses (`subscription_service.compute_access`), so the
dashboard never disagrees with enforcement.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from core.supabase import supabase
from services import subscription_service as subs

logger = logging.getLogger("trimit")


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _get(path: str) -> List[Dict[str, Any]]:
    resp = await supabase.request("GET", path, service_role=True)
    if resp.status_code == 200 and isinstance(resp.json(), list):
        return resp.json()
    return []


async def list_owners() -> List[Dict[str, Any]]:
    """Salon owners with their salon + subscription status + trial days left."""
    owners = await _get(
        "rest/v1/users?role=eq.owner&select=id,name,email,phone,created_at,upi_id&order=created_at.desc"
    )
    salons = await _get("rest/v1/salons?select=id,owner_id,name,city,subscription_active")
    subscriptions = await _get("rest/v1/subscriptions?select=*")

    salon_by_owner: Dict[str, Dict[str, Any]] = {}
    for s in salons:
        salon_by_owner.setdefault(str(s.get("owner_id")), s)
    sub_by_owner: Dict[str, Dict[str, Any]] = {
        str(s.get("owner_id")): s for s in subscriptions
    }

    out: List[Dict[str, Any]] = []
    for o in owners:
        oid = str(o.get("id"))
        salon = salon_by_owner.get(oid)
        sub = sub_by_owner.get(oid)
        access = subs.compute_access(sub) if sub else {
            "effective_status": "none",
            "has_access": False,
            "is_trial": False,
            "trial_days_remaining": 0,
        }
        out.append({
            "owner_id": oid,
            "name": o.get("name"),
            "email": o.get("email"),
            "phone": o.get("phone"),
            "upi_id": o.get("upi_id"),
            "created_at": o.get("created_at"),
            "salon_id": salon.get("id") if salon else None,
            "salon_name": salon.get("name") if salon else None,
            "city": salon.get("city") if salon else None,
            "subscription_active": (salon.get("subscription_active") if salon else False),
            "subscription_status": access["effective_status"],
            "has_access": access["has_access"],
            "is_trial": access["is_trial"],
            "trial_days_remaining": access["trial_days_remaining"],
            "current_period_end": (sub.get("current_period_end") if sub else None),
            "next_renewal_at": (sub.get("next_renewal_at") if sub else None),
        })
    return out


async def list_customers() -> List[Dict[str, Any]]:
    customers = await _get(
        "rest/v1/users?role=eq.customer&select=id,name,email,phone,created_at&order=created_at.desc&limit=2000"
    )
    return [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "email": c.get("email"),
            "phone": c.get("phone"),
            "created_at": c.get("created_at"),
        }
        for c in customers
    ]


async def get_visitor_stats() -> Dict[str, Any]:
    now = _now()
    d1 = (now - timedelta(days=1)).isoformat()
    d7 = (now - timedelta(days=7)).isoformat()
    d30 = (now - timedelta(days=30)).isoformat()

    last_30 = await _get(
        f"rest/v1/page_views?created_at=gte.{d30}&select=session_id,created_at&limit=100000"
    )
    total_rows = await _get("rest/v1/page_views?select=id&limit=1")  # cheap existence probe

    views_24h = sum(1 for r in last_30 if str(r.get("created_at") or "") >= d1)
    views_7d = sum(1 for r in last_30 if str(r.get("created_at") or "") >= d7)
    views_30d = len(last_30)
    unique_30d = len({r.get("session_id") for r in last_30 if r.get("session_id")})

    return {
        "page_views_24h": views_24h,
        "page_views_7d": views_7d,
        "page_views_30d": views_30d,
        "unique_visitors_30d": unique_30d,
        "tracking_active": bool(total_rows) or views_30d > 0,
    }


async def get_overview() -> Dict[str, Any]:
    owners = await list_owners()
    customers = await _get("rest/v1/users?role=eq.customer&select=id&limit=100000")
    salons = await _get("rest/v1/salons?select=id&limit=100000")
    bookings = await _get("rest/v1/bookings?select=id&limit=100000")

    # Subscription breakdown from the owners projection (effective statuses).
    breakdown: Dict[str, int] = {}
    trialing = active = expired = 0
    for o in owners:
        st = o["subscription_status"]
        breakdown[st] = breakdown.get(st, 0) + 1
        if st == "trial":
            trialing += 1
        elif st == "active":
            active += 1
        elif st in ("expired", "cancelled", "past_due", "payment_failed"):
            expired += 1

    try:
        analytics = await subs.admin_analytics()
    except Exception as exc:
        logger.error("[Admin] admin_analytics failed: %s", exc)
        analytics = {}

    visitors = await get_visitor_stats()

    return {
        "totals": {
            "owners": len(owners),
            "customers": len(customers),
            "salons": len(salons),
            "bookings": len(bookings),
        },
        "subscriptions": {
            "active": active,
            "trialing": trialing,
            "expired_or_lapsed": expired,
            "status_breakdown": breakdown,
            "mrr": analytics.get("mrr", 0),
            "arr": analytics.get("arr", 0),
            "total_revenue_collected": analytics.get("total_revenue_collected", 0),
            "currency": "INR",
        },
        "visitors": visitors,
        "generated_at": _now().isoformat(),
    }
