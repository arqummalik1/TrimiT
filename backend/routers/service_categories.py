"""Owner service category CRUD — salon menu sections."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import uuid
import logging
from datetime import datetime, timezone

from core.supabase import supabase
from core.salon_auth import assert_salon_owner
from dependencies.auth import get_current_user
from dependencies.subscription import require_active_subscription
from models.service_categories import (
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
)

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/owner/categories", tags=["Service Categories"])

# Zomato-style quick-start presets for Indian salons
CATEGORY_PRESETS: List[dict] = [
    {"name": "Hair", "sort_order": 0},
    {"name": "Face", "sort_order": 1},
    {"name": "Beard", "sort_order": 2},
    {"name": "Body", "sort_order": 3},
    {"name": "Spa", "sort_order": 4},
    {"name": "Makeup", "sort_order": 5},
    {"name": "Nails", "sort_order": 6},
    {"name": "Waxing & Threading", "sort_order": 7},
]


async def _owner_salon_id(user: dict) -> str:
    profile = user.get("profile") or {}
    if profile.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only salon owners can manage categories")
    resp = await supabase.request(
        "GET",
        f"rest/v1/salons?owner_id=eq.{user.get('id')}&select=id",
        token=user.get("access_token"),
    )
    if resp.status_code != 200 or not resp.json():
        raise HTTPException(status_code=404, detail="No salon found for this owner")
    return resp.json()[0]["id"]


async def _attach_service_counts(categories: list, salon_id: str) -> list:
    if not categories:
        return []
    svc_resp = await supabase.request(
        "GET",
        f"rest/v1/services?salon_id=eq.{salon_id}&select=category_id",
        service_role=True,
    )
    counts: dict = {}
    if svc_resp.status_code == 200:
        for row in svc_resp.json() or []:
            cid = row.get("category_id")
            if cid:
                counts[cid] = counts.get(cid, 0) + 1
    for cat in categories:
        cat["service_count"] = counts.get(cat["id"], 0)
    return categories


@router.get("/presets")
async def list_category_presets():
    """Platform quick-start category names (owner picks one-tap setup)."""
    return {"presets": CATEGORY_PRESETS}


@router.get("")
async def list_categories(current_user: dict = Depends(get_current_user)):
    salon_id = await _owner_salon_id(current_user)
    resp = await supabase.request(
        "GET",
        f"rest/v1/service_categories?salon_id=eq.{salon_id}&select=*&order=sort_order.asc,name.asc",
        token=current_user.get("access_token"),
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch categories")
    return await _attach_service_counts(resp.json() or [], salon_id)


@router.post("")
async def create_category(
    data: ServiceCategoryCreate,
    current_user: dict = Depends(require_active_subscription),
):
    salon_id = await _owner_salon_id(current_user)
    await assert_salon_owner(salon_id, current_user.get("id"))

    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name is required")

    sort_order = data.sort_order
    if sort_order is None:
        existing = await supabase.request(
            "GET",
            f"rest/v1/service_categories?salon_id=eq.{salon_id}&select=sort_order&order=sort_order.desc&limit=1",
            service_role=True,
        )
        sort_order = 0
        if existing.status_code == 200 and existing.json():
            sort_order = int(existing.json()[0].get("sort_order", 0)) + 1

    row = {
        "id": str(uuid.uuid4()),
        "salon_id": salon_id,
        "name": name,
        "sort_order": sort_order,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    ins = await supabase.request(
        "POST",
        "rest/v1/service_categories",
        json=row,
        token=current_user.get("access_token"),
    )
    if ins.status_code not in (200, 201):
        body = ins.text or ""
        if "duplicate" in body.lower() or "unique" in body.lower():
            raise HTTPException(
                status_code=400,
                detail={"code": "DUPLICATE_CATEGORY", "message": "A category with this name already exists."},
            )
        raise HTTPException(status_code=400, detail="Failed to create category")
    created = ins.json()[0] if ins.json() else row
    created["service_count"] = 0
    return created


@router.post("/quick-start")
async def quick_start_categories(current_user: dict = Depends(require_active_subscription)):
    """One-tap create preset categories (skips names that already exist)."""
    salon_id = await _owner_salon_id(current_user)
    await assert_salon_owner(salon_id, current_user.get("id"))

    existing_resp = await supabase.request(
        "GET",
        f"rest/v1/service_categories?salon_id=eq.{salon_id}&select=name",
        service_role=True,
    )
    existing_names = set()
    if existing_resp.status_code == 200:
        existing_names = {(r.get("name") or "").lower() for r in existing_resp.json() or []}

    created = []
    for preset in CATEGORY_PRESETS:
        if preset["name"].lower() in existing_names:
            continue
        row = {
            "id": str(uuid.uuid4()),
            "salon_id": salon_id,
            "name": preset["name"],
            "sort_order": preset["sort_order"],
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        ins = await supabase.request("POST", "rest/v1/service_categories", json=row, service_role=True)
        if ins.status_code in (200, 201) and ins.json():
            item = ins.json()[0]
            item["service_count"] = 0
            created.append(item)

    return {"created": created, "count": len(created)}


@router.patch("/{category_id}")
async def update_category(
    category_id: str,
    data: ServiceCategoryUpdate,
    current_user: dict = Depends(require_active_subscription),
):
    salon_id = await _owner_salon_id(current_user)
    check = await supabase.request(
        "GET",
        f"rest/v1/service_categories?id=eq.{category_id}&select=salon_id",
        token=current_user.get("access_token"),
    )
    if check.status_code != 200 or not check.json():
        raise HTTPException(status_code=404, detail="Category not found")
    if check.json()[0].get("salon_id") != salon_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "name" in update_data:
        update_data["name"] = update_data["name"].strip()

    resp = await supabase.request(
        "PATCH",
        f"rest/v1/service_categories?id=eq.{category_id}",
        json=update_data,
        token=current_user.get("access_token"),
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=400, detail="Failed to update category")
    return {"message": "Category updated"}


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(require_active_subscription),
):
    salon_id = await _owner_salon_id(current_user)
    check = await supabase.request(
        "GET",
        f"rest/v1/service_categories?id=eq.{category_id}&select=salon_id",
        token=current_user.get("access_token"),
    )
    if check.status_code != 200 or not check.json():
        raise HTTPException(status_code=404, detail="Category not found")
    if check.json()[0].get("salon_id") != salon_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    svc_count = await supabase.request(
        "GET",
        f"rest/v1/services?category_id=eq.{category_id}&select=id&limit=1",
        service_role=True,
    )
    if svc_count.status_code == 200 and svc_count.json():
        raise HTTPException(
            status_code=409,
            detail={
                "code": "CATEGORY_HAS_SERVICES",
                "message": "Remove or reassign all services in this category before deleting it.",
            },
        )

    resp = await supabase.request(
        "DELETE",
        f"rest/v1/service_categories?id=eq.{category_id}",
        token=current_user.get("access_token"),
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=400, detail="Failed to delete category")
    return {"message": "Category deleted"}
