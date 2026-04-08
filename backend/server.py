from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date, time, timedelta, timezone
from enum import Enum
import httpx
import os
import uuid
import json
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

app = FastAPI(title="TrimiT API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase config
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')

# Enums
class UserRole(str, Enum):
    customer = "customer"
    owner = "owner"

class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"

class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class SalonCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    city: str
    latitude: float
    longitude: float
    phone: str
    opening_time: str = "09:00"
    closing_time: str = "21:00"
    images: List[str] = []

class SalonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    images: Optional[List[str]] = None

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration: int  # minutes

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[int] = None

class BookingCreate(BaseModel):
    salon_id: str
    service_id: str
    booking_date: str  # YYYY-MM-DD
    time_slot: str  # HH:MM

class BookingStatusUpdate(BaseModel):
    status: BookingStatus

class ReviewCreate(BaseModel):
    salon_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class PaymentCreate(BaseModel):
    booking_id: str

# Helper: Supabase HTTP client
async def supabase_request(method: str, endpoint: str, data: dict = None, token: str = None):
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        headers["Authorization"] = f"Bearer {SUPABASE_ANON_KEY}"
    
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    
    async with httpx.AsyncClient() as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            headers["Prefer"] = "return=representation"
            response = await client.post(url, headers=headers, json=data)
        elif method == "PATCH":
            headers["Prefer"] = "return=representation"
            response = await client.patch(url, headers=headers, json=data)
        elif method == "DELETE":
            response = await client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        return response

# Helper: Supabase Auth
async def supabase_auth(endpoint: str, data: dict, token: str = None):
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{SUPABASE_URL}/auth/v1/{endpoint}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)
        return response

# Helper: Get current user from token
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        auth_user = response.json()
        
        # Get user profile from database
        profile_response = await supabase_request("GET", f"users?id=eq.{auth_user['id']}&select=*", token=token)
        
        if profile_response.status_code == 200:
            profiles = profile_response.json()
            if profiles:
                return {**auth_user, "profile": profiles[0]}
        
        return {**auth_user, "profile": None}

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "TrimiT API"}

# ========== AUTH ENDPOINTS ==========

@app.post("/api/auth/signup")
async def signup(user: UserCreate):
    # Sign up with Supabase Auth
    response = await supabase_auth("signup", {
        "email": user.email,
        "password": user.password,
    })
    
    if response.status_code != 200:
        error_data = response.json()
        raise HTTPException(status_code=400, detail=error_data.get("msg", "Signup failed"))
    
    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id")
    
    if user_id:
        # Create user profile
        profile_data = {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "phone": user.phone,
            "role": user.role.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await supabase_request("POST", "users", profile_data)
    
    return {
        "message": "Signup successful",
        "user": auth_data.get("user"),
        "session": auth_data.get("session"),
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    response = await supabase_auth("token?grant_type=password", {
        "email": user.email,
        "password": user.password,
    })
    
    if response.status_code != 200:
        error_data = response.json()
        raise HTTPException(status_code=401, detail=error_data.get("error_description", "Login failed"))
    
    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id")
    
    # Get user profile
    if user_id:
        token = auth_data.get("access_token")
        profile_response = await supabase_request("GET", f"users?id=eq.{user_id}&select=*", token=token)
        if profile_response.status_code == 200:
            profiles = profile_response.json()
            if profiles:
                auth_data["profile"] = profiles[0]
    
    return auth_data

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.patch("/api/auth/profile")
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    response = await supabase_request("PATCH", f"users?id=eq.{user_id}", update_data, token=token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    
    return {"message": "Profile updated", "data": response.json()[0] if response.json() else None}

# ========== SALON ENDPOINTS ==========

@app.get("/api/salons")
async def get_salons(
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = 10,  # km
    search: Optional[str] = None,
):
    query = "salons?select=*,services(*),reviews(rating)"
    
    if city:
        query += f"&city=ilike.%{city}%"
    
    if search:
        query += f"&name=ilike.%{search}%"
    
    response = await supabase_request("GET", query)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch salons")
    
    salons = response.json()
    
    # Calculate distance if lat/lng provided and filter by radius
    if lat is not None and lng is not None:
        from math import radians, sin, cos, sqrt, atan2
        
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371  # Earth's radius in km
            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)
            a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            return R * c
        
        for salon in salons:
            if salon.get("latitude") and salon.get("longitude"):
                salon["distance"] = round(haversine(lat, lng, salon["latitude"], salon["longitude"]), 2)
            else:
                salon["distance"] = None
        
        # Filter by radius and sort by distance
        salons = [s for s in salons if s.get("distance") is not None and s["distance"] <= radius]
        salons.sort(key=lambda x: x.get("distance", float("inf")))
    
    # Calculate average rating
    for salon in salons:
        reviews = salon.get("reviews", [])
        if reviews:
            salon["avg_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
            salon["review_count"] = len(reviews)
        else:
            salon["avg_rating"] = 0
            salon["review_count"] = 0
        del salon["reviews"]
    
    return salons

@app.get("/api/salons/{salon_id}")
async def get_salon(salon_id: str):
    response = await supabase_request("GET", f"salons?id=eq.{salon_id}&select=*,services(*),reviews(*,users(name))")
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch salon")
    
    salons = response.json()
    if not salons:
        raise HTTPException(status_code=404, detail="Salon not found")
    
    salon = salons[0]
    
    # Calculate average rating
    reviews = salon.get("reviews", [])
    if reviews:
        salon["avg_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
        salon["review_count"] = len(reviews)
    else:
        salon["avg_rating"] = 0
        salon["review_count"] = 0
    
    return salon

@app.post("/api/salons")
async def create_salon(salon: SalonCreate, current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only salon owners can create salons")
    
    salon_data = {
        "id": str(uuid.uuid4()),
        "owner_id": current_user.get("id"),
        **salon.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    response = await supabase_request("POST", "salons", salon_data)
    
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail="Failed to create salon")
    
    return response.json()[0]

@app.patch("/api/salons/{salon_id}")
async def update_salon(salon_id: str, data: SalonUpdate, current_user: dict = Depends(get_current_user)):
    # Verify ownership
    response = await supabase_request("GET", f"salons?id=eq.{salon_id}&select=owner_id")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    if response.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    response = await supabase_request("PATCH", f"salons?id=eq.{salon_id}", update_data)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update salon")
    
    return response.json()[0] if response.json() else {"message": "Updated"}

@app.delete("/api/salons/{salon_id}")
async def delete_salon(salon_id: str, current_user: dict = Depends(get_current_user)):
    # Verify ownership
    response = await supabase_request("GET", f"salons?id=eq.{salon_id}&select=owner_id")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    if response.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    response = await supabase_request("DELETE", f"salons?id=eq.{salon_id}")
    
    return {"message": "Salon deleted"}

@app.get("/api/owner/salon")
async def get_owner_salon(current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only salon owners can access this")
    
    response = await supabase_request("GET", f"salons?owner_id=eq.{current_user.get('id')}&select=*,services(*)")
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch salon")
    
    salons = response.json()
    return salons[0] if salons else None

# ========== SERVICE ENDPOINTS ==========

@app.post("/api/salons/{salon_id}/services")
async def create_service(salon_id: str, service: ServiceCreate, current_user: dict = Depends(get_current_user)):
    # Verify ownership
    response = await supabase_request("GET", f"salons?id=eq.{salon_id}&select=owner_id")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    if response.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    service_data = {
        "id": str(uuid.uuid4()),
        "salon_id": salon_id,
        **service.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    response = await supabase_request("POST", "services", service_data)
    
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail="Failed to create service")
    
    return response.json()[0]

@app.patch("/api/services/{service_id}")
async def update_service(service_id: str, data: ServiceUpdate, current_user: dict = Depends(get_current_user)):
    # Get service and salon
    response = await supabase_request("GET", f"services?id=eq.{service_id}&select=*,salons(owner_id)")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Service not found")
    
    service = response.json()[0]
    if service.get("salons", {}).get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    response = await supabase_request("PATCH", f"services?id=eq.{service_id}", update_data)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update service")
    
    return response.json()[0] if response.json() else {"message": "Updated"}

@app.delete("/api/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    # Get service and salon
    response = await supabase_request("GET", f"services?id=eq.{service_id}&select=*,salons(owner_id)")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Service not found")
    
    service = response.json()[0]
    if service.get("salons", {}).get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    response = await supabase_request("DELETE", f"services?id=eq.{service_id}")
    
    return {"message": "Service deleted"}

# ========== BOOKING ENDPOINTS ==========

@app.get("/api/salons/{salon_id}/slots")
async def get_available_slots(salon_id: str, date: str, service_id: str):
    # Get salon and service
    salon_response = await supabase_request("GET", f"salons?id=eq.{salon_id}&select=opening_time,closing_time")
    service_response = await supabase_request("GET", f"services?id=eq.{service_id}&select=duration")
    
    if salon_response.status_code != 200 or not salon_response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    if service_response.status_code != 200 or not service_response.json():
        raise HTTPException(status_code=404, detail="Service not found")
    
    salon = salon_response.json()[0]
    service = service_response.json()[0]
    
    opening = datetime.strptime(salon.get("opening_time", "09:00"), "%H:%M")
    closing = datetime.strptime(salon.get("closing_time", "21:00"), "%H:%M")
    duration = service.get("duration", 30)
    
    # Get existing bookings for the date
    bookings_response = await supabase_request(
        "GET", 
        f"bookings?salon_id=eq.{salon_id}&booking_date=eq.{date}&status=neq.cancelled&select=time_slot,service_id,services(duration)"
    )
    
    booked_slots = set()
    if bookings_response.status_code == 200:
        for booking in bookings_response.json():
            slot_time = datetime.strptime(booking["time_slot"], "%H:%M")
            slot_duration = booking.get("services", {}).get("duration", 30)
            # Mark all slots covered by this booking as unavailable
            for i in range(0, slot_duration, 30):
                blocked_time = (slot_time + timedelta(minutes=i)).strftime("%H:%M")
                booked_slots.add(blocked_time)
    
    # Generate available slots
    slots = []
    current = opening
    while current + timedelta(minutes=duration) <= closing:
        slot_str = current.strftime("%H:%M")
        # Check if all required slots for this service are available
        all_clear = True
        for i in range(0, duration, 30):
            check_time = (current + timedelta(minutes=i)).strftime("%H:%M")
            if check_time in booked_slots:
                all_clear = False
                break
        
        slots.append({
            "time": slot_str,
            "available": all_clear
        })
        current += timedelta(minutes=30)
    
    return slots

@app.post("/api/bookings")
async def create_booking(booking: BookingCreate, current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can make bookings")
    
    # Check slot availability
    slots = await get_available_slots(booking.salon_id, booking.booking_date, booking.service_id)
    slot_info = next((s for s in slots if s["time"] == booking.time_slot), None)
    
    if not slot_info or not slot_info["available"]:
        raise HTTPException(status_code=400, detail="Time slot not available")
    
    # Get service price
    service_response = await supabase_request("GET", f"services?id=eq.{booking.service_id}&select=price,name")
    if service_response.status_code != 200 or not service_response.json():
        raise HTTPException(status_code=404, detail="Service not found")
    
    service = service_response.json()[0]
    
    booking_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.get("id"),
        "salon_id": booking.salon_id,
        "service_id": booking.service_id,
        "booking_date": booking.booking_date,
        "time_slot": booking.time_slot,
        "status": BookingStatus.pending.value,
        "payment_status": PaymentStatus.pending.value,
        "amount": service.get("price", 0),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    response = await supabase_request("POST", "bookings", booking_data)
    
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail="Failed to create booking")
    
    return response.json()[0]

@app.get("/api/bookings")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    
    if profile.get("role") == "customer":
        query = f"bookings?user_id=eq.{current_user.get('id')}&select=*,salons(name,address,phone),services(name,duration)&order=booking_date.desc,time_slot.desc"
    else:
        # Get owner's salon bookings
        salon_response = await supabase_request("GET", f"salons?owner_id=eq.{current_user.get('id')}&select=id")
        if salon_response.status_code != 200 or not salon_response.json():
            return []
        
        salon_id = salon_response.json()[0].get("id")
        query = f"bookings?salon_id=eq.{salon_id}&select=*,users(name,phone),services(name,duration)&order=booking_date.desc,time_slot.desc"
    
    response = await supabase_request("GET", query)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch bookings")
    
    return response.json()

@app.patch("/api/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, data: BookingStatusUpdate, current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    
    # Get booking
    response = await supabase_request("GET", f"bookings?id=eq.{booking_id}&select=*,salons(owner_id)")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = response.json()[0]
    
    # Check authorization
    is_customer = booking.get("user_id") == current_user.get("id")
    is_owner = booking.get("salons", {}).get("owner_id") == current_user.get("id")
    
    if not is_customer and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Customers can only cancel
    if is_customer and data.status != BookingStatus.cancelled:
        raise HTTPException(status_code=403, detail="Customers can only cancel bookings")
    
    response = await supabase_request("PATCH", f"bookings?id=eq.{booking_id}", {"status": data.status.value})
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update booking")
    
    return {"message": "Booking updated", "status": data.status}

# ========== PAYMENT ENDPOINTS ==========

@app.post("/api/payments/create-order")
async def create_payment_order(data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    # Get booking
    response = await supabase_request("GET", f"bookings?id=eq.{data.booking_id}&select=*")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = response.json()[0]
    
    if booking.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")
    
    # Create Razorpay order (mock for now since keys are placeholders)
    amount = int(booking.get("amount", 0) * 100)  # Convert to paise
    
    order_id = f"order_{uuid.uuid4().hex[:16]}"
    
    # In production, this would call Razorpay API
    # For now, return mock order
    return {
        "order_id": order_id,
        "amount": amount,
        "currency": "INR",
        "booking_id": data.booking_id,
        "key_id": RAZORPAY_KEY_ID,
    }

@app.post("/api/payments/verify")
async def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    # In production, verify signature with Razorpay
    # For now, mock successful payment
    
    # Update booking payment status
    response = await supabase_request("PATCH", f"bookings?id=eq.{booking_id}", {
        "payment_status": PaymentStatus.paid.value,
        "status": BookingStatus.confirmed.value,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
    })
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update payment status")
    
    return {"message": "Payment verified", "status": "success"}

# ========== REVIEW ENDPOINTS ==========

@app.post("/api/reviews")
async def create_review(review: ReviewCreate, current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can leave reviews")
    
    # Check if user has a completed booking at this salon
    booking_response = await supabase_request(
        "GET", 
        f"bookings?user_id=eq.{current_user.get('id')}&salon_id=eq.{review.salon_id}&status=eq.completed&select=id"
    )
    
    if booking_response.status_code != 200 or not booking_response.json():
        raise HTTPException(status_code=403, detail="You can only review salons you have visited")
    
    review_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.get("id"),
        "salon_id": review.salon_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    response = await supabase_request("POST", "reviews", review_data)
    
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail="Failed to create review")
    
    return response.json()[0]

# ========== ANALYTICS ENDPOINTS ==========

@app.get("/api/owner/analytics")
async def get_owner_analytics(current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only salon owners can access analytics")
    
    # Get salon
    salon_response = await supabase_request("GET", f"salons?owner_id=eq.{current_user.get('id')}&select=id")
    if salon_response.status_code != 200 or not salon_response.json():
        return {"total_bookings": 0, "total_earnings": 0, "pending_bookings": 0, "completed_bookings": 0}
    
    salon_id = salon_response.json()[0].get("id")
    
    # Get bookings
    bookings_response = await supabase_request("GET", f"bookings?salon_id=eq.{salon_id}&select=*")
    
    if bookings_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch analytics")
    
    bookings = bookings_response.json()
    
    total_earnings = sum(b.get("amount", 0) for b in bookings if b.get("payment_status") == "paid")
    pending = len([b for b in bookings if b.get("status") == "pending"])
    confirmed = len([b for b in bookings if b.get("status") == "confirmed"])
    completed = len([b for b in bookings if b.get("status") == "completed"])
    cancelled = len([b for b in bookings if b.get("status") == "cancelled"])
    
    # Get today's bookings
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_bookings = [b for b in bookings if b.get("booking_date") == today]
    
    return {
        "total_bookings": len(bookings),
        "total_earnings": total_earnings,
        "pending_bookings": pending,
        "confirmed_bookings": confirmed,
        "completed_bookings": completed,
        "cancelled_bookings": cancelled,
        "today_bookings": len(today_bookings),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
