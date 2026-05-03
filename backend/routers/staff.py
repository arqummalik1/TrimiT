"""
Staff Management Router
Handles staff CRUD, service assignments, and availability checks
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from uuid import UUID
from datetime import date, time
from decimal import Decimal

from dependencies.auth import get_current_user
from models.staff import (
    StaffCreate, StaffUpdate, StaffResponse, StaffWithServices,
    StaffServiceAssignment, StaffServiceResponse, BulkStaffServiceAssignment,
    StaffAvailabilityCheck, AvailableStaffResponse, AvailableStaffMember,
    StaffPerformance, StaffStats, StaffScheduleWeek
)
from core.supabase import get_supabase_client
from core.limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/api/v1/staff", tags=["staff"])


# =====================================================
# STAFF CRUD OPERATIONS
# =====================================================

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_staff(
    request: Request,
    staff_data: StaffCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new staff member (Owner only)
    
    - Validates that user owns the salon
    - Creates staff profile with working hours
    - Returns created staff data
    """
    supabase = get_supabase_client()
    
    # Verify user owns the salon
    salon_check = supabase.table("salons").select("id").eq("id", str(staff_data.salon_id)).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add staff to this salon"
        )
    
    # Create staff member
    staff_dict = staff_data.model_dump()
    staff_dict["salon_id"] = str(staff_data.salon_id)
    
    result = supabase.table("staff").insert(staff_dict).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create staff member"
        )
    
    return result.data[0]


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
    supabase = get_supabase_client()
    
    # Build query
    query = supabase.table("staff").select("""
        *,
        staff_services (
            id,
            service_id,
            custom_price,
            custom_duration,
            services (
                id,
                name,
                price,
                duration,
                description
            )
        )
    """).eq("salon_id", str(salon_id))
    
    if not include_inactive:
        query = query.eq("is_active", True)
    
    result = query.order("average_rating", desc=True).execute()
    
    # Transform data to include services array
    staff_list = []
    for staff in result.data:
        staff_dict = {**staff}
        staff_dict["services"] = [
            {
                **ss["services"],
                "custom_price": ss.get("custom_price"),
                "custom_duration": ss.get("custom_duration")
            }
            for ss in staff.get("staff_services", [])
        ]
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
    supabase = get_supabase_client()
    
    result = supabase.table("staff").select("""
        *,
        staff_services (
            id,
            service_id,
            custom_price,
            custom_duration,
            services (
                id,
                name,
                price,
                duration,
                description
            )
        )
    """).eq("id", str(staff_id)).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    staff = result.data[0]
    staff["services"] = [
        {
            **ss["services"],
            "custom_price": ss.get("custom_price"),
            "custom_duration": ss.get("custom_duration")
        }
        for ss in staff.get("staff_services", [])
    ]
    del staff["staff_services"]
    
    return staff


@router.patch("/{staff_id}", response_model=StaffResponse)
@limiter.limit("10/minute")
async def update_staff(
    request: Request,
    staff_id: UUID,
    staff_data: StaffUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update staff member (Owner only)
    
    - Validates ownership
    - Updates only provided fields
    - Returns updated staff data
    """
    supabase = get_supabase_client()
    
    # Verify ownership
    staff_check = supabase.table("staff").select("salon_id").eq("id", str(staff_id)).execute()
    
    if not staff_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.data[0]["salon_id"]
    salon_check = supabase.table("salons").select("id").eq("id", salon_id).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this staff member"
        )
    
    # Update staff
    update_dict = staff_data.model_dump(exclude_unset=True)
    
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    result = supabase.table("staff").update(update_dict).eq("id", str(staff_id)).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update staff member"
        )
    
    return result.data[0]


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def delete_staff(
    request: Request,
    staff_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Soft delete staff member (Owner only)
    
    - Sets is_active to false
    - Preserves historical data
    """
    supabase = get_supabase_client()
    
    # Verify ownership
    staff_check = supabase.table("staff").select("salon_id").eq("id", str(staff_id)).execute()
    
    if not staff_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.data[0]["salon_id"]
    salon_check = supabase.table("salons").select("id").eq("id", salon_id).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this staff member"
        )
    
    # Soft delete
    supabase.table("staff").update({"is_active": False}).eq("id", str(staff_id)).execute()
    
    return None


# =====================================================
# STAFF SERVICE ASSIGNMENTS
# =====================================================

@router.post("/services/assign", response_model=StaffServiceResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def assign_service_to_staff(
    request: Request,
    assignment: StaffServiceAssignment,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign a service to a staff member (Owner only)
    
    - Validates ownership
    - Allows custom pricing and duration
    """
    supabase = get_supabase_client()
    
    # Verify ownership
    staff_check = supabase.table("staff").select("salon_id").eq("id", str(assignment.staff_id)).execute()
    
    if not staff_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.data[0]["salon_id"]
    salon_check = supabase.table("salons").select("id").eq("id", salon_id).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage this staff member"
        )
    
    # Verify service belongs to same salon
    service_check = supabase.table("services").select("id").eq("id", str(assignment.service_id)).eq("salon_id", salon_id).execute()
    
    if not service_check.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service not found or doesn't belong to this salon"
        )
    
    # Create assignment
    assignment_dict = assignment.model_dump()
    assignment_dict["staff_id"] = str(assignment.staff_id)
    assignment_dict["service_id"] = str(assignment.service_id)
    
    result = supabase.table("staff_services").insert(assignment_dict).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign service (may already be assigned)"
        )
    
    return result.data[0]


@router.post("/services/assign-bulk", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def bulk_assign_services(
    request: Request,
    assignment: BulkStaffServiceAssignment,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign multiple services to a staff member at once (Owner only)
    """
    supabase = get_supabase_client()
    
    # Verify ownership
    staff_check = supabase.table("staff").select("salon_id").eq("id", str(assignment.staff_id)).execute()
    
    if not staff_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.data[0]["salon_id"]
    salon_check = supabase.table("salons").select("id").eq("id", salon_id).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
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
    
    result = supabase.table("staff_services").insert(assignments).execute()
    
    return {
        "message": f"Successfully assigned {len(result.data)} services",
        "assigned_count": len(result.data)
    }


@router.delete("/services/{staff_service_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def remove_service_from_staff(
    request: Request,
    staff_service_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Remove a service assignment from a staff member (Owner only)"""
    supabase = get_supabase_client()
    
    # Verify ownership through staff -> salon
    assignment_check = supabase.table("staff_services").select("staff_id").eq("id", str(staff_service_id)).execute()
    
    if not assignment_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service assignment not found"
        )
    
    staff_id = assignment_check.data[0]["staff_id"]
    staff_check = supabase.table("staff").select("salon_id").eq("id", staff_id).execute()
    salon_id = staff_check.data[0]["salon_id"]
    
    salon_check = supabase.table("salons").select("id").eq("id", salon_id).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage this staff member"
        )
    
    # Delete assignment
    supabase.table("staff_services").delete().eq("id", str(staff_service_id)).execute()
    
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
    supabase = get_supabase_client()
    
    # Call RPC function
    result = supabase.rpc(
        "get_available_staff",
        {
            "p_salon_id": str(salon_id),
            "p_service_id": str(service_id),
            "p_booking_date": booking_date.isoformat(),
            "p_time_slot": time_slot.strftime("%H:%M:%S")
        }
    ).execute()
    
    available_staff = [
        AvailableStaffMember(
            staff_id=staff["staff_id"],
            staff_name=staff["staff_name"],
            staff_image_url=staff.get("staff_image_url"),
            staff_bio=staff.get("staff_bio"),
            average_rating=Decimal(str(staff["average_rating"])),
            total_reviews=staff["total_reviews"],
            custom_price=Decimal(str(staff["custom_price"])) if staff.get("custom_price") else None,
            custom_duration=staff.get("custom_duration")
        )
        for staff in result.data
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
    supabase = get_supabase_client()
    
    result = supabase.rpc(
        "check_staff_availability",
        {
            "p_staff_id": str(check.staff_id),
            "p_service_id": str(check.service_id),
            "p_booking_date": check.booking_date.isoformat(),
            "p_time_slot": check.time_slot.strftime("%H:%M:%S"),
            "p_duration": check.duration
        }
    ).execute()
    
    is_available = result.data if isinstance(result.data, bool) else False
    
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
    supabase = get_supabase_client()
    
    # Verify ownership
    staff_check = supabase.table("staff").select("salon_id").eq("id", str(staff_id)).execute()
    
    if not staff_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    salon_id = staff_check.data[0]["salon_id"]
    salon_check = supabase.table("salons").select("id").eq("id", salon_id).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this staff member's stats"
        )
    
    # Get booking stats
    bookings = supabase.table("bookings").select("*").eq("staff_id", str(staff_id)).execute()
    
    total_bookings = len(bookings.data)
    completed = len([b for b in bookings.data if b["status"] == "completed"])
    cancelled = len([b for b in bookings.data if b["status"] == "cancelled"])
    total_revenue = sum(Decimal(str(b["total_amount"])) for b in bookings.data if b["status"] == "completed")
    
    # Get staff rating
    staff = supabase.table("staff").select("average_rating, total_reviews").eq("id", str(staff_id)).execute()
    
    return StaffStats(
        staff_id=staff_id,
        total_bookings=total_bookings,
        completed_bookings=completed,
        cancelled_bookings=cancelled,
        total_revenue=total_revenue,
        average_rating=Decimal(str(staff.data[0]["average_rating"])),
        total_reviews=staff.data[0]["total_reviews"]
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
    supabase = get_supabase_client()
    
    # Verify ownership
    salon_check = supabase.table("salons").select("id").eq("id", str(salon_id)).eq("owner_id", current_user["id"]).execute()
    
    if not salon_check.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this salon's staff performance"
        )
    
    # Get staff performance from view
    result = supabase.table("staff_performance").select("*").eq("salon_id", str(salon_id)).order("total_bookings", desc=True).execute()
    
    return [
        StaffPerformance(
            staff_id=staff["id"],
            staff_name=staff["name"],
            total_bookings=staff["total_bookings"],
            total_reviews=staff["total_reviews"],
            average_rating=Decimal(str(staff["average_rating"])),
            services_count=staff["services_count"]
        )
        for staff in result.data
    ]
