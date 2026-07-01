"""
Serviceability — is the customer inside a city TrimiT serves?

Model: each row in `service_areas` is a circle (centre lat/lng + radius_km).
A point is serviceable if it lies within ANY active area's radius (haversine
great-circle distance). Config-driven: add a city by inserting a row, no deploy.

FAIL-OPEN: if the area config can't be loaded (network/DB blip), we treat the
user as serviceable. We must NEVER lock a real Jammu customer out of the app
because of a transient error — the salon list itself is the final arbiter.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from math import atan2, cos, radians, sin, sqrt
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

from core.supabase import supabase
from services.email_dispatch import send_email
from config import settings

logger = logging.getLogger("trimit")


def _effective_radius_km(area: Dict[str, Any]) -> float:
    """Coverage radius for an area, honouring the optional env override.

    SERVICE_AREA_RADIUS_KM (when set > 0) overrides every area's DB radius_km so
    coverage can be tuned from Render env without a DB change. Falls back to the
    row's radius_km otherwise.
    """
    override = settings.SERVICE_AREA_RADIUS_KM
    if override is not None and override > 0:
        return float(override)
    try:
        return float(area.get("radius_km") or 0)
    except (TypeError, ValueError):
        return 0.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return r * 2 * atan2(sqrt(a), sqrt(1 - a))


async def get_service_areas() -> List[Dict[str, Any]]:
    """All service areas (active + launching_soon), ordered for display."""
    resp = await supabase.request(
        "GET",
        "rest/v1/service_areas?select=*&order=display_order.asc,name.asc",
        service_role=True,
    )
    if resp.status_code != 200:
        logger.error("[serviceability] areas fetch failed: %s %s", resp.status_code, resp.text[:200])
        return []
    return resp.json() or []


def _evaluate(lat: Optional[float], lng: Optional[float], areas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Pure geofence evaluation. No I/O."""
    active = [a for a in areas if a.get("is_active")]
    active_names = [a.get("name") for a in active if a.get("name")]

    # No coordinates → can't judge. Fail-open: let them through to the list.
    if lat is None or lng is None:
        return {
            "serviceable": True,
            "reason": "no_location",
            "matched_area": None,
            "nearest_area": None,
            "nearest_distance_km": None,
            "active_areas": active_names,
        }

    matched: Optional[Dict[str, Any]] = None
    nearest: Optional[Dict[str, Any]] = None
    nearest_dist = float("inf")

    # Consider every area for "nearest" (so we can show "launching soon" too),
    # but only active areas can mark the user serviceable.
    for a in areas:
        try:
            dist = _haversine_km(lat, lng, float(a["center_lat"]), float(a["center_lng"]))
        except (TypeError, ValueError, KeyError):
            continue
        if dist < nearest_dist:
            nearest_dist = dist
            nearest = a
        if a.get("is_active") and dist <= _effective_radius_km(a):
            if matched is None:
                matched = a

    def _slim(a: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not a:
            return None
        return {
            "name": a.get("name"),
            "slug": a.get("slug"),
            "launching_soon": bool(a.get("launching_soon")),
        }

    return {
        "serviceable": matched is not None,
        "reason": "in_area" if matched else "out_of_area",
        "matched_area": _slim(matched),
        "nearest_area": _slim(nearest),
        "nearest_distance_km": round(nearest_dist, 1) if nearest is not None else None,
        "active_areas": active_names,
    }


async def check_serviceability(lat: Optional[float], lng: Optional[float]) -> Dict[str, Any]:
    """Return serviceability for a point. Fail-open on any error."""
    try:
        areas = await get_service_areas()
        if not areas:
            # No config at all → don't gate anyone.
            return {
                "serviceable": True,
                "reason": "no_areas_configured",
                "matched_area": None,
                "nearest_area": None,
                "nearest_distance_km": None,
                "active_areas": [],
            }
        return _evaluate(lat, lng, areas)
    except Exception as e:  # noqa: BLE001 — must never break discovery
        logger.error("[serviceability] check failed, failing open: %s", e)
        return {
            "serviceable": True,
            "reason": "error_fail_open",
            "matched_area": None,
            "nearest_area": None,
            "nearest_distance_km": None,
            "active_areas": [],
        }


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def add_waitlist_lead(
    *,
    email: str,
    name: Optional[str],
    lat: Optional[float],
    lng: Optional[float],
    area_label: Optional[str],
    source: Optional[str],
    user_id: Optional[str] = None,
) -> Tuple[int, Dict[str, Any]]:
    """Insert/refresh a demand lead, then best-effort send a confirmation email."""
    normalized = _normalize_email(email)

    nearest_slug: Optional[str] = None
    nearest_dist: Optional[float] = None
    try:
        result = await check_serviceability(lat, lng)
        if result.get("nearest_area"):
            nearest_slug = result["nearest_area"].get("slug")
        nearest_dist = result.get("nearest_distance_km")
    except Exception:  # noqa: BLE001
        pass

    now_iso = datetime.now(timezone.utc).isoformat()
    row = {
        "email": normalized,
        "name": (name or "").strip() or None,
        "lat": lat,
        "lng": lng,
        "area_label": (area_label or "").strip() or None,
        "nearest_area_slug": nearest_slug,
        "nearest_distance_km": nearest_dist,
        "source": (source or "mobile")[:20],
        "user_id": user_id,
        "updated_at": now_iso,
    }

    # Upsert on the unique lower(email) index — re-submits refresh the row.
    insert_resp = await supabase.request(
        "POST",
        "rest/v1/waitlist_leads?on_conflict=email",
        json=row,
        service_role=True,
        extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )

    if insert_resp.status_code not in (200, 201, 204):
        logger.error(
            "[serviceability] waitlist insert failed: %s %s",
            insert_resp.status_code,
            insert_resp.text[:200],
        )
        return 400, {
            "code": "WAITLIST_FAILED",
            "message": "Could not add you to the waitlist. Please try again.",
        }

    # Best-effort confirmation email (no-op if RESEND_API_KEY unset; never raises).
    try:
        await _send_waitlist_confirmation(normalized, row.get("name"))
    except Exception as e:  # noqa: BLE001
        logger.warning("[serviceability] waitlist email failed (non-fatal): %s", e)

    return 201, {
        "message": "You're on the list! We'll email you the moment TrimiT reaches your area.",
        "code": "WAITLIST_JOINED",
    }


async def _send_waitlist_confirmation(email: str, name: Optional[str]) -> None:
    greeting = f"Hi {name}," if name else "Hi there,"
    html = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="margin:0 0 12px">You're on the TrimiT waitlist 🎉</h2>
      <p style="margin:0 0 12px">{greeting}</p>
      <p style="margin:0 0 12px">
        Thanks for your interest in <strong>TrimiT</strong>! We're not in your area
        just yet, but you're now on our waitlist. The moment we launch near you,
        you'll be the first to know — right here in your inbox.
      </p>
      <p style="margin:0 0 12px">TrimiT is currently live in <strong>Jammu</strong>.</p>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px">— Team TrimiT</p>
    </div>
    """
    await send_email(
        to=email,
        subject="You're on the TrimiT waitlist 🎉",
        html_body=html,
        tags={"type": "waitlist_confirmation"},
    )


async def list_waitlist_leads(limit: int = 200, offset: int = 0) -> Dict[str, Any]:
    """Admin: recent leads + demand grouped by nearest area."""
    limit = min(max(limit, 1), 500)
    offset = max(offset, 0)

    resp = await supabase.request(
        "GET",
        (
            "rest/v1/waitlist_leads"
            "?select=id,name,email,lat,lng,area_label,nearest_area_slug,"
            "nearest_distance_km,source,notified_at,created_at"
            f"&order=created_at.desc&limit={limit}&offset={offset}"
        ),
        service_role=True,
        extra_headers={"Prefer": "count=exact"},
    )
    if resp.status_code != 200:
        logger.error("[serviceability] leads list failed: %s %s", resp.status_code, resp.text[:200])
        return {"leads": [], "total": 0, "by_area": []}

    leads = resp.json() or []

    total = len(leads)
    content_range = resp.headers.get("content-range") or resp.headers.get("Content-Range")
    if content_range and "/" in content_range:
        try:
            total = int(content_range.split("/")[-1])
        except ValueError:
            pass

    # Demand grouped by nearest area (founder: "where do I launch next?").
    buckets: Dict[str, int] = {}
    for lead in leads:
        key = lead.get("nearest_area_slug") or "unknown"
        buckets[key] = buckets.get(key, 0) + 1
    by_area = sorted(
        ({"area": k, "count": v} for k, v in buckets.items()),
        key=lambda x: x["count"],
        reverse=True,
    )

    return {"leads": leads, "total": total, "by_area": by_area}


async def mark_leads_notified(lead_ids: List[str], notified: bool = True) -> Tuple[int, Dict[str, Any]]:
    """Set/clear `notified_at` for one or more leads (admin action).

    notified=True stamps now(); notified=False clears it (undo). Returns the
    count updated. Uses the service role (RLS bypass, admin-only path).
    """
    ids = [str(i).strip() for i in (lead_ids or []) if str(i).strip()]
    if not ids:
        return 400, {"code": "NO_IDS", "message": "No lead ids provided."}

    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "notified_at": now_iso if notified else None,
        "updated_at": now_iso,
    }

    # PostgREST `in` filter: id=in.(uuid1,uuid2,...)
    in_list = ",".join(ids)
    resp = await supabase.request(
        "PATCH",
        f"rest/v1/waitlist_leads?id=in.({in_list})",
        json=payload,
        service_role=True,
        extra_headers={"Prefer": "return=representation"},
    )
    if resp.status_code not in (200, 204):
        logger.error("[serviceability] mark notified failed: %s %s", resp.status_code, resp.text[:200])
        return 400, {"code": "MARK_FAILED", "message": "Could not update leads."}

    updated = 0
    try:
        updated = len(resp.json() or [])
    except Exception:  # noqa: BLE001
        updated = len(ids)

    return 200, {"updated": updated, "notified": notified}
