"""
Staff Management Router
Handles staff CRUD, service assignments, and availability checks
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List
from uuid import UUID
from datetime import date, time
from decimal import Decimal

from dependencies.auth import get_current_user
from dependencies.subscription import require_active_subscription
from models.staff import (
    StaffCreate, StaffUpdate, StaffResponse, StaffWithServices,
    StaffServiceAssignment, StaffServiceResponse, BulkStaffServiceAssignment,
    StaffAvailabilityCheck, AvailableStaffResponse, AvailableStaffMember,
    StaffPerformance, StaffStats
)
from core.supabase import supabase
from core.limiter import limiter

router = APIRouter(prefix="/staff", tags=["staff"])


# =====================================================
# STAFF CRUD OPERATIONS
# =====================================================

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_staff(
    request: Request,
    staff_data: StaffCreate,
    current_user: dict = Depends(require_active_subscription)
):
    """
    Create a new staff member (Owner only)
    
    - Validates that user owns the salon
    - Creates staff profile with working hours
    - Returns created staff data
    """
    token = current_user.get("access_token")
    
    # Verify user owns the salon
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{staff_data.salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add staff to this salon"
        )
    
    # Create staff member
    staff_dict = staff_data.model_dump(exclude_none=True)
    staff_dict["salon_id"] = str(staff_data.salon_id)
    if staff_dict.get("image_url") == "":
        staff_dict.pop("image_url", None)
    
    result = await supabase.request(
        "POST",
        "rest/v1/staff",
        json=staff_dict,
        token=token
    )
    
    if result.status_code not in (200, 201, 204) or not result.json():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create staff member"
        )
    
    return result.json()[0]


@router.get("/salon/{salon_id}", response_model=List[StaffWithServices])
@limiter.limit("30/minute")
async def get_salon_staff(
    request: Request,
    salon_id: UUID,
    include_inactive: bool = False
):
    """
    Get all staff members for a salon
    
    - Returns staff with their assigned services
    - Optionally include inactive staff
    - Sorted by rating (highest first)
    """
    select_query = "*,staff_services(*,services(*))"
    query_url = f"rest/v1/staff?salon_id=eq.{salon_id}&select={select_query}&order=average_rating.desc"
    
    if not include_inactive:
        query_url += "&is_active=eq.true"
        
    response = await supabase.request("GET", query_url)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch staff"
        )
    
    # Transform data to include services array
    staff_list = []
    for staff in response.json() or []:
        staff_dict = {**staff}
        staff_dict["services"] = []
        for ss in staff.get("staff_services", []):
            if ss.get("services"):
                staff_dict["services"].append({
                    **ss["services"],
                    "custom_price": ss.get("custom_price"),
                    "custom_duration": ss.get("custom_duration")
                })
        if "staff_services" in staff_dict:
            del staff_dict["staff_services"]
        staff_list.append(staff_dict)
    
    return staff_list


@router.get("/{staff_id}", response_model=StaffWithServices)
@limiter.limit("30/minute")
async def get_staff(
    request: Request,
    staff_id: UUID
):
    """Get single staff member with their services"""
    select_query = "*,staff_services(*,services(*))"
    response = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{staff_id}&select={select_query}"
    )
    
    if response.status_code != 200 or not response.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    staff = response.json()[0]
    staff_dict = {**staff}
    staff_dict["services"] = []
    for ss in staff.get("staff_services", []):
        if ss.get("services"):
            staff_dict["services"].append({
                **ss["services"],
                "custom_price": ss.get("custom_price"),
                "custom_duration": ss.get("custom_duration")
            })
    if "staff_services" in staff_dict:
        del staff_dict["staff_services"]
    
    return staff_dict


@router.patch("/{staff_id}", response_model=StaffResponse)
@limiter.limit("10/minute")
async def update_staff(
    request: Request,
    staff_id: UUID,
    staff_data: StaffUpdate,
    current_user: dict = Depends(require_active_subscription)
):
    """
    Update staff member (Owner only)
    
    - Validates ownership
    - Updates only provided fields
    - Returns updated staff data
    """
    token = current_user.get("access_token")
    
    # Verify ownership
    staff_check = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{staff_id}&select=salon_id",
        token=token
    )
    
    if staff_check.status_code != 200 or not staff_check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.json()[0]["salon_id"]
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this staff member"
        )
    
    # Update staff
    update_dict = staff_data.model_dump(exclude_unset=True)
    if "image_url" in update_dict and update_dict["image_url"] == "":
        update_dict["image_url"] = None

    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    result = await supabase.request(
        "PATCH",
        f"rest/v1/staff?id=eq.{staff_id}",
        json=update_dict,
        token=token
    )
    
    if result.status_code not in (200, 201, 204) or not result.json():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update staff member"
        )
    
    return result.json()[0]


@router.post("/{staff_id}/invite-app")
@limiter.limit("10/minute")
async def invite_staff_to_app(
    request: Request,
    staff_id: UUID,
    current_user: dict = Depends(require_active_subscription),
):
    """
    Owner: invite a staff member to log into the TrimiT app as an employee.

    Sets app_access_status=pending. The employee must sign up with the same
    phone number and choose 'Salon Employee' at complete-profile.
    """
    token = current_user.get("access_token")
    staff_check = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{staff_id}&select=salon_id,phone,email,user_id,app_access_status",
        token=token,
    )
    if staff_check.status_code != 200 or not staff_check.json():
        raise HTTPException(status_code=404, detail="Staff member not found")

    staff_row = staff_check.json()[0]
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{staff_row['salon_id']}&owner_id=eq.{current_user['id']}&select=id",
        token=token,
    )
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(status_code=403, detail="You don't have permission to invite this staff member")

    if staff_row.get("user_id") and staff_row.get("app_access_status") == "active":
        return {"message": "This staff member already has app access.", "status": "active"}

    phone = (staff_row.get("phone") or "").strip()
    if not phone:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "PHONE_REQUIRED",
                "message": "Add a phone number to this staff profile before inviting them to the app.",
            },
        )

    patch = await supabase.request(
        "PATCH",
        f"rest/v1/staff?id=eq.{staff_id}",
        json={"app_access_status": "pending"},
        token=token,
    )
    if patch.status_code not in (200, 204):
        raise HTTPException(status_code=400, detail="Failed to create app invite")

    return {
        "message": "Invite created. Ask them to download TrimiT, sign up with this phone number, and choose Salon Employee.",
        "status": "pending",
        "phone_hint": phone[-4:].rjust(len(phone), "*") if len(phone) >= 4 else "****",
    }


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def delete_staff(
    request: Request,
    staff_id: UUID,
    current_user: dict = Depends(require_active_subscription)
):
    """
    Soft delete staff member (Owner only)
    
    - Sets is_active to false
    - Preserves historical data
    """
    token = current_user.get("access_token")
    
    # Verify ownership
    staff_check = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{staff_id}&select=salon_id",
        token=token
    )
    
    if staff_check.status_code != 200 or not staff_check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.json()[0]["salon_id"]
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this staff member"
        )
    
    # Soft delete
    result = await supabase.request(
        "PATCH",
        f"rest/v1/staff?id=eq.{staff_id}",
        json={"is_active": False},
        token=token
    )
    
    if result.status_code not in (200, 201, 204):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete staff member"
        )
    
    return None


# =====================================================
# STAFF SERVICE ASSIGNMENTS
# =====================================================

@router.post("/services/assign", response_model=StaffServiceResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def assign_service_to_staff(
    request: Request,
    assignment: StaffServiceAssignment,
    current_user: dict = Depends(require_active_subscription)
):
    """
    Assign a service to a staff member (Owner only)
    
    - Validates ownership
    - Allows custom pricing and duration
    """
    token = current_user.get("access_token")
    
    # Verify ownership
    staff_check = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{assignment.staff_id}&select=salon_id",
        token=token
    )
    
    if staff_check.status_code != 200 or not staff_check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.json()[0]["salon_id"]
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage this staff member"
        )
    
    # Verify service belongs to same salon
    service_check = await supabase.request(
        "GET",
        f"rest/v1/services?id=eq.{assignment.service_id}&salon_id=eq.{salon_id}&select=id",
        token=token
    )
    
    if service_check.status_code != 200 or not service_check.json():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service not found or doesn't belong to this salon"
        )
    
    # Create assignment
    assignment_dict = assignment.model_dump()
    assignment_dict["staff_id"] = str(assignment.staff_id)
    assignment_dict["service_id"] = str(assignment.service_id)
    
    result = await supabase.request(
        "POST",
        "rest/v1/staff_services",
        json=assignment_dict,
        token=token
    )
    
    if result.status_code not in (200, 201, 204) or not result.json():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign service (may already be assigned)"
        )
    
    return result.json()[0]


@router.post("/services/assign-bulk", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def bulk_assign_services(
    request: Request,
    assignment: BulkStaffServiceAssignment,
    current_user: dict = Depends(require_active_subscription)
):
    """
    Assign multiple services to a staff member at once (Owner only)
    """
    token = current_user.get("access_token")
    
    # Verify ownership
    staff_check = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{assignment.staff_id}&select=salon_id",
        token=token
    )
    
    if staff_check.status_code != 200 or not staff_check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.json()[0]["salon_id"]
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage this staff member"
        )
    
    # Create assignments
    assignments = [
        {
            "staff_id": str(assignment.staff_id),
            "service_id": str(service_id)
        }
        for service_id in assignment.service_ids
    ]
    
    result = await supabase.request(
        "POST",
        "rest/v1/staff_services",
        json=assignments,
        token=token
    )
    
    count = len(result.json()) if result.status_code in (200, 201, 204) and result.json() else 0
    return {
        "message": f"Successfully assigned {count} services",
        "assigned_count": count
    }


@router.delete("/services/{staff_service_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def remove_service_from_staff(
    request: Request,
    staff_service_id: UUID,
    current_user: dict = Depends(require_active_subscription)
):
    """Remove a service assignment from a staff member (Owner only)"""
    token = current_user.get("access_token")
    
    # Verify ownership through staff -> salon
    assignment_check = await supabase.request(
        "GET",
        f"rest/v1/staff_services?id=eq.{staff_service_id}&select=staff_id",
        token=token
    )
    
    if assignment_check.status_code != 200 or not assignment_check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service assignment not found"
        )
    
    staff_id = assignment_check.json()[0]["staff_id"]
    staff_check = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{staff_id}&select=salon_id",
        token=token
    )
    salon_id = staff_check.json()[0]["salon_id"]
    
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage this staff member"
        )
    
    # Delete assignment
    result = await supabase.request(
        "DELETE",
        f"rest/v1/staff_services?id=eq.{staff_service_id}",
        token=token
    )
    
    if result.status_code not in (200, 201, 204):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete service assignment"
        )
    
    return None


# =====================================================
# STAFF AVAILABILITY
# =====================================================

@router.get("/available/{salon_id}/{service_id}")
@limiter.limit("30/minute")
async def get_available_staff(
    request: Request,
    salon_id: UUID,
    service_id: UUID,
    booking_date: date,
    time_slot: time
):
    """
    Get list of staff members available for a specific service/date/time
    
    - Checks staff working hours
    - Checks existing bookings
    - Returns sorted by rating
    """
    payload = {
        "p_salon_id": str(salon_id),
        "p_service_id": str(service_id),
        "p_booking_date": booking_date.isoformat(),
        "p_time_slot": time_slot.strftime("%H:%M:%S"),
    }
    response = await supabase.request("POST", "rest/v1/rpc/get_available_staff", json=payload)

    if response.status_code != 200:
        # Graceful fallback for production continuity if RPC is missing/broken.
        return AvailableStaffResponse(
            salon_id=salon_id,
            service_id=service_id,
            booking_date=booking_date,
            time_slot=time_slot,
            available_staff=[],
            any_available=True,
        )

    rows = response.json() or []
    available_staff = [
        AvailableStaffMember(
            staff_id=staff["staff_id"],
            staff_name=staff["staff_name"],
            staff_image_url=staff.get("staff_image_url"),
            staff_bio=staff.get("staff_bio"),
            average_rating=Decimal(str(staff["average_rating"])),
            total_reviews=staff["total_reviews"],
            custom_price=Decimal(str(staff["custom_price"])) if staff.get("custom_price") else None,
            custom_duration=staff.get("custom_duration"),
        )
        for staff in rows
    ]
    
    return AvailableStaffResponse(
        salon_id=salon_id,
        service_id=service_id,
        booking_date=booking_date,
        time_slot=time_slot,
        available_staff=available_staff,
        any_available=len(available_staff) > 0
    )


@router.post("/check-availability")
@limiter.limit("30/minute")
async def check_staff_availability(
    request: Request,
    check: StaffAvailabilityCheck
):
    """
    Check if a specific staff member is available
    
    - Returns boolean availability status
    - Includes reason if not available
    """
    payload = {
        "p_staff_id": str(check.staff_id),
        "p_service_id": str(check.service_id),
        "p_booking_date": check.booking_date.isoformat(),
        "p_time_slot": check.time_slot.strftime("%H:%M:%S"),
        "p_duration": check.duration
    }
    response = await supabase.request("POST", "rest/v1/rpc/check_staff_availability", json=payload)
    
    is_available = response.json() if response.status_code == 200 else False
    
    return {
        "staff_id": check.staff_id,
        "is_available": is_available,
        "booking_date": check.booking_date,
        "time_slot": check.time_slot
    }


# =====================================================
# STAFF PERFORMANCE & ANALYTICS
# =====================================================

@router.get("/{staff_id}/stats", response_model=StaffStats)
@limiter.limit("20/minute")
async def get_staff_stats(
    request: Request,
    staff_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed statistics for a staff member (Owner only)
    
    - Total bookings, revenue, ratings
    - Most booked service
    - Busiest day and time slot
    """
    token = current_user.get("access_token")
    
    # Verify ownership
    staff_check = await supabase.request(
        "GET",
        f"rest/v1/staff?id=eq.{staff_id}&select=salon_id,average_rating,total_reviews",
        token=token
    )
    
    if staff_check.status_code != 200 or not staff_check.json():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.json()[0]["salon_id"]
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this staff member's stats"
        )
    
    # Get booking stats
    bookings_resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?staff_id=eq.{staff_id}&select=status,total_amount",
        token=token
    )
    
    if bookings_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch booking stats"
        )
        
    bookings = bookings_resp.json() or []
    total_bookings = len(bookings)
    completed = len([b for b in bookings if b.get("status") == "completed"])
    cancelled = len([b for b in bookings if b.get("status") == "cancelled"])
    total_revenue = sum(Decimal(str(b.get("total_amount") or 0)) for b in bookings if b.get("status") == "completed")
    
    staff_info = staff_check.json()[0]
    return StaffStats(
        staff_id=staff_id,
        total_bookings=total_bookings,
        completed_bookings=completed,
        cancelled_bookings=cancelled,
        total_revenue=total_revenue,
        average_rating=Decimal(str(staff_info.get("average_rating") or 0)),
        total_reviews=staff_info.get("total_reviews") or 0
    )


@router.get("/salon/{salon_id}/performance", response_model=List[StaffPerformance])
@limiter.limit("20/minute")
async def get_salon_staff_performance(
    request: Request,
    salon_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get performance metrics for all staff in a salon (Owner only)
    
    - Sorted by total bookings
    - Includes ratings and revenue
    """
    token = current_user.get("access_token")
    
    # Verify ownership
    salon_check = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{salon_id}&owner_id=eq.{current_user['id']}&select=id",
        token=token
    )
    
    if salon_check.status_code != 200 or not salon_check.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this salon's staff performance"
        )
    
    # Get staff performance from view
    result = await supabase.request(
        "GET",
        f"rest/v1/staff_performance?salon_id=eq.{salon_id}&select=*&order=total_bookings.desc",
        token=token
    )
    
    if result.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch staff performance metrics"
        )
        
    return [
        StaffPerformance(
            staff_id=staff["id"],
            staff_name=staff["name"],
            total_bookings=staff["total_bookings"],
            total_reviews=staff["total_reviews"],
            average_rating=Decimal(str(staff["average_rating"] or 0)),
            services_count=staff["services_count"]
        )
        for staff in result.json() or []
    ]
