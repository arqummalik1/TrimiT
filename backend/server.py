from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date, time, timedelta, timezone
from enum import Enum
import httpx
import os
import uuid
import json
import hmac
import hashlib
import logging
from dotenv import load_dotenv
from pathlib import Path

from services.notifications import (
    notify_owner_new_booking,
    notify_customer_booking_confirmed,
    notify_customer_booking_cancelled
)

load_dotenv(Path(__file__).parent / '.env')

logger = logging.getLogger("trimit")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="TrimiT API", version="1.0.0")

# CORS — explicit allowlist via env, comma-separated. Default to known prod + local dev.
_default_origins = "https://trimit.com,https://www.trimit.com,http://localhost:3000,http://localhost:8081"
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Default httpx timeout for all outbound calls
HTTPX_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Supabase config
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
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
    auto_accept: bool = True

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
    allow_multiple_bookings_per_slot: Optional[bool] = None
    max_bookings_per_slot: Optional[int] = None
    auto_accept: Optional[bool] = None

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration: int  # minutes
    # Offer fields
    discount_percentage: Optional[int] = None  # 0-100
    offer_start_date: Optional[str] = None  # YYYY-MM-DD
    offer_end_date: Optional[str] = None      # YYYY-MM-DD
    offer_tagline: Optional[str] = "Grab it before it's gone!"
    is_on_offer: Optional[bool] = False

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[int] = None
    # Offer fields
    discount_percentage: Optional[int] = None
    offer_start_date: Optional[str] = None
    offer_end_date: Optional[str] = None
    offer_tagline: Optional[str] = None
    is_on_offer: Optional[bool] = None

class BookingCreate(BaseModel):
    salon_id: str
    service_id: str
    booking_date: str  # YYYY-MM-DD
    time_slot: str  # HH:MM
    payment_method: str = "salon_cash"  # 'salon_cash' or 'online'

class BookingStatusUpdate(BaseModel):
    status: BookingStatus

class ReviewCreate(BaseModel):
    salon_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class PaymentCreate(BaseModel):
    booking_id: str

class PushTokenUpdate(BaseModel):
    push_token: str

# Password Reset Models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class ValidateTokenRequest(BaseModel):
    token: str

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
    
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
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

# Helper: Supabase Public Request (uses service role key to bypass RLS for public data)
async def supabase_public_request(method: str, endpoint: str, data: dict = None):
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
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
    
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
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
    
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        response = await client.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        auth_user = response.json()
        
        # Get user profile from database using SERVICE ROLE KEY to bypass RLS
        print(f"[DEBUG get_current_user] Fetching profile for user: {auth_user.get('id')}")
        profile_response = await supabase_public_request("GET", f"users?id=eq.{auth_user['id']}&select=*")
        
        print(f"[DEBUG get_current_user] Profile response status: {profile_response.status_code}")
        
        if profile_response.status_code == 200:
            profiles = profile_response.json()
            print(f"[DEBUG get_current_user] Found {len(profiles)} profiles")
            if profiles:
                print(f"[DEBUG get_current_user] Profile role: {profiles[0].get('role')}")
                return {**auth_user, "profile": profiles[0], "access_token": token}
        else:
            print(f"[ERROR get_current_user] Failed to fetch profile: {profile_response.status_code} - {profile_response.text}")
        
        return {**auth_user, "profile": None, "access_token": token}

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
        error_msg = error_data.get("msg", "Signup failed")
        
        # Handle specific Supabase errors with user-friendly messages
        if "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429, 
                detail="Too many signup attempts. Please wait 1-2 minutes and try again."
            )
        elif "email" in error_msg.lower() and ("invalid" in error_msg.lower() or "not valid" in error_msg.lower()):
            raise HTTPException(status_code=400, detail="Please enter a valid email address.")
        elif "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(status_code=400, detail="This email is already registered. Please log in instead.")
        elif "password" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Password is too weak. Please use at least 6 characters.")
        else:
            raise HTTPException(status_code=400, detail=f"Signup failed: {error_msg}")
    
    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id")
    
    if user_id:
        # Create user profile using SERVICE ROLE KEY to bypass RLS
        profile_data = {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "phone": user.phone,
            "role": user.role.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        print(f"[DEBUG signup] Creating profile for user {user_id} with role {user.role.value}")
        profile_response = await supabase_public_request("POST", "users", profile_data)
        
        if profile_response.status_code == 201:
            print(f"[DEBUG signup] Profile created successfully")
        elif profile_response.status_code == 409:
            print(f"[DEBUG signup] Profile already exists (duplicate)")
        else:
            print(f"[ERROR signup] Failed to create profile: {profile_response.status_code} - {profile_response.text}")
    
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
        error_msg = error_data.get("error_description", "Login failed")
        
        # Handle specific login errors
        if "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please wait 1-2 minutes and try again."
            )
        elif "invalid" in error_msg.lower() or "incorrect" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password. Please try again.")
        else:
            raise HTTPException(status_code=401, detail=f"Login failed: {error_msg}")
    
    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id")
    
    # Get user profile using SERVICE ROLE KEY to bypass RLS
    if user_id:
        print(f"[DEBUG login] Fetching profile for user_id: {user_id}")
        # Use supabase_public_request which uses service role key
        profile_response = await supabase_public_request("GET", f"users?id=eq.{user_id}&select=*")
        
        print(f"[DEBUG login] Profile response status: {profile_response.status_code}")
        
        if profile_response.status_code == 200:
            profiles = profile_response.json()
            print(f"[DEBUG login] Found {len(profiles)} profiles")
            if profiles:
                auth_data["profile"] = profiles[0]
                print(f"[DEBUG login] Profile role: {profiles[0].get('role')}")
            else:
                print(f"[ERROR login] No profile found for user {user_id}")
        else:
            print(f"[ERROR login] Failed to fetch profile: {profile_response.status_code} - {profile_response.text}")
    
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

@app.post("/api/auth/push-token")
async def register_push_token(data: PushTokenUpdate, current_user: dict = Depends(get_current_user)):
    """Register or update the user's Expo Push Token"""
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    print(f"[DEBUG push-token] Registering token for user {user_id}: {data.push_token}")
    
    response = await supabase_request("PATCH", f"users?id=eq.{user_id}", {"push_token": data.push_token}, token=token)
    
    if response.status_code not in [200, 201, 204]:
        print(f"[ERROR push-token] Failed: {response.status_code} - {response.text}")
        raise HTTPException(status_code=400, detail="Failed to register push token")
    
    return {"message": "Push token registered successfully"}

# ========== PASSWORD RESET ENDPOINTS ==========

@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset using Supabase Auth"""
    # Use Supabase Auth's password reset
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        response = await client.post(
            f"{SUPABASE_URL}/auth/v1/recover",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={"email": request.email}
        )
    
    # Supabase returns 200 even if email doesn't exist (security)
    # But rate limits may cause 429
    if response.status_code == 429:
        raise HTTPException(
            status_code=429, 
            detail="Too many reset attempts. Please wait a few minutes and try again."
        )
    
    # Always return success message (don't reveal if email exists)
    return {"message": "If an account exists with this email, a reset link has been sent"}

@app.post("/api/auth/validate-reset-token")
async def validate_reset_token(request: ValidateTokenRequest):
    """Validate if a reset token is valid by checking with Supabase"""
    # Verify token by attempting to get user info
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {request.token}"
            }
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user_data = response.json()
    return {"valid": True, "email": user_data.get("email")}

@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using recovery token"""
    # Update password using the recovery token
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        response = await client.put(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {request.token}",
                "Content-Type": "application/json"
            },
            json={"password": request.new_password}
        )
    
    if response.status_code not in [200, 204]:
        error_data = response.json()
        raise HTTPException(
            status_code=400, 
            detail=error_data.get("msg", "Failed to reset password")
        )
    
    return {
        "message": "Password has been reset successfully. Please log in with your new password."
    }

# ========== SALON ENDPOINTS ==========

@app.get("/api/salons")
async def get_salons(
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = 10,  # km
    search: Optional[str] = None,
):
    print(f"[DEBUG] get_salons called - city={city}, lat={lat}, lng={lng}, search={search}")
    
    query = "salons?select=*,services(*),reviews(rating)"
    
    if city:
        query += f"&city=ilike.%{city}%"
    
    if search:
        query += f"&name=ilike.%{search}%"
    
    print(f"[DEBUG] Supabase query: {query}")
    
    response = await supabase_public_request("GET", query)
    
    print(f"[DEBUG] Supabase response status: {response.status_code}")
    
    if response.status_code != 200:
        error_text = response.text
        print(f"[ERROR] Failed to fetch salons: {response.status_code} - {error_text}")
        logger.error(f"Failed to fetch salons: {response.status_code} - {error_text}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch salons: {error_text}")
    
    salons = response.json()
    print(f"[DEBUG] Found {len(salons)} salons")
    
    if salons:
        for i, salon in enumerate(salons[:3]):  # Log first 3 salons
            print(f"[DEBUG] Salon {i+1}: {salon.get('name')} (ID: {salon.get('id')[:8]}...), Services: {len(salon.get('services', []))}")
    else:
        print("[DEBUG] No salons found in database!")
    
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
    response = await supabase_public_request("GET", f"salons?id=eq.{salon_id}&select=*,services(*),reviews(*,users(name))")
    
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
    
    # Get the user's access token from the request
    user_token = current_user.get("access_token")
    response = await supabase_request("POST", "salons", salon_data, token=user_token)
    
    if response.status_code not in [200, 201]:
        try:
            logger.error("create_salon failed: status=%s body=%s", response.status_code, response.text)
        except Exception:
            logger.exception("create_salon failed (unreadable response)")
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
    
    response = await supabase_request("PATCH", f"salons?id=eq.{salon_id}", update_data, token=current_user.get("access_token"))

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
    
    response = await supabase_request("DELETE", f"salons?id=eq.{salon_id}", token=current_user.get("access_token"))

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

@app.get("/api/owner/analytics")
async def get_owner_analytics(
    period: str = "all",  # 7d, 30d, all
    current_user: dict = Depends(get_current_user)
):
    """Get salon analytics for owner dashboard with charts data"""
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only salon owners can access this")
    
    user_token = current_user.get("access_token")
    
    # Get owner's salon
    salon_response = await supabase_request("GET", f"salons?owner_id=eq.{current_user.get('id')}&select=id", token=user_token)
    if salon_response.status_code != 200 or not salon_response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    salon_id = salon_response.json()[0].get("id")
    
    # Calculate date range based on period
    today = date.today()
    if period == "7d":
        start_date = today - timedelta(days=7)
    elif period == "30d":
        start_date = today - timedelta(days=30)
    else:  # all
        start_date = date(2000, 1, 1)  # Effectively all time
    
    # Fetch all bookings for the salon in the date range
    date_filter = f"&booking_date=gte.{start_date.isoformat()}" if period != "all" else ""
    bookings_response = await supabase_request(
        "GET", 
        f"bookings?salon_id=eq.{salon_id}{date_filter}&select=*,services(name)&order=booking_date.desc",
        token=user_token
    )
    
    if bookings_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch bookings")
    
    bookings = bookings_response.json()
    
    # Calculate basic stats
    total_bookings = len(bookings)
    total_earnings = sum(b.get("amount", 0) for b in bookings if b.get("status") in ["confirmed", "completed"])
    
    today_str = today.isoformat()
    today_bookings = len([b for b in bookings if b.get("booking_date") == today_str])
    
    pending_bookings = len([b for b in bookings if b.get("status") == "pending"])
    confirmed_bookings = len([b for b in bookings if b.get("status") == "confirmed"])
    completed_bookings = len([b for b in bookings if b.get("status") == "completed"])
    cancelled_bookings = len([b for b in bookings if b.get("status") == "cancelled"])
    
    # Bookings trend by day (for line chart)
    bookings_by_day = {}
    for b in bookings:
        day = b.get("booking_date")
        bookings_by_day[day] = bookings_by_day.get(day, 0) + 1
    
    # Sort by date and format for chart
    sorted_days = sorted(bookings_by_day.keys())
    bookings_trend = [
        {"date": day, "count": bookings_by_day[day]}
        for day in sorted_days
    ]
    
    # Peak hours analysis
    hour_counts = {}
    for b in bookings:
        time_slot = b.get("time_slot", "00:00")
        hour = int(time_slot.split(":")[0])
        hour_counts[hour] = hour_counts.get(hour, 0) + 1
    
    peak_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    peak_hours = [{"hour": h[0], "bookings": h[1]} for h in peak_hours]
    
    # Popular services (for bar chart)
    service_counts = {}
    service_revenue = {}
    for b in bookings:
        svc = b.get("services", {})
        svc_name = svc.get("name", "Unknown") if svc else "Unknown"
        service_counts[svc_name] = service_counts.get(svc_name, 0) + 1
        if b.get("status") in ["confirmed", "completed"]:
            service_revenue[svc_name] = service_revenue.get(svc_name, 0) + b.get("amount", 0)
    
    popular_services = sorted(service_counts.items(), key=lambda x: x[1], reverse=True)
    popular_services = [
        {"name": s[0], "bookings": s[1], "revenue": service_revenue.get(s[0], 0)}
        for s in popular_services
    ]
    
    # Status distribution (for pie chart)
    status_distribution = [
        {"status": "Pending", "count": pending_bookings, "color": "#FEF3C7"},
        {"status": "Confirmed", "count": confirmed_bookings, "color": "#DBEAFE"},
        {"status": "Completed", "count": completed_bookings, "color": "#D1FAE5"},
        {"status": "Cancelled", "count": cancelled_bookings, "color": "#FEE2E2"},
    ]
    
    # Customer trends - bookings per week
    weekly_data = {}
    for b in bookings:
        booking_date = datetime.strptime(b.get("booking_date"), "%Y-%m-%d").date()
        week_key = booking_date.strftime("%Y-W%U")
        weekly_data[week_key] = weekly_data.get(week_key, 0) + 1
    
    customer_trends = sorted(weekly_data.items())
    customer_trends = [{"week": w[0], "bookings": w[1]} for w in customer_trends]
    
    return {
        "period": period,
        "total_bookings": total_bookings,
        "total_earnings": total_earnings,
        "today_bookings": today_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "completed_bookings": completed_bookings,
        "cancelled_bookings": cancelled_bookings,
        "bookings_trend": bookings_trend,
        "peak_hours": peak_hours,
        "popular_services": popular_services,
        "status_distribution": status_distribution,
        "customer_trends": customer_trends,
    }

# ========== SERVICE ENDPOINTS ==========

@app.post("/api/salons/{salon_id}/services")
async def create_service(salon_id: str, service: ServiceCreate, current_user: dict = Depends(get_current_user)):
    # Verify ownership
    response = await supabase_request("GET", f"salons?id=eq.{salon_id}&select=owner_id")
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    if response.json()[0].get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Prepare service data
    service_dict = service.model_dump()
    
    # Handle offer validation and calculation
    if service_dict.get('is_on_offer') and service_dict.get('discount_percentage'):
        # Validate discount range
        discount = service_dict['discount_percentage']
        if discount < 1 or discount > 99:
            raise HTTPException(status_code=400, detail="Discount percentage must be between 1 and 99")
        
        # Calculate original price if not provided
        if not service_dict.get('original_price') and service_dict.get('price'):
            price = service_dict['price']
            service_dict['original_price'] = price
            # Calculate discounted price
            service_dict['price'] = round(price * (1 - discount / 100))
    
    service_data = {
        "id": str(uuid.uuid4()),
        "salon_id": salon_id,
        **service_dict,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Get user token for RLS
    user_token = current_user.get("access_token")
    response = await supabase_request("POST", "services", service_data, token=user_token)
    
    if response.status_code not in [200, 201]:
        try:
            logger.error("create_service failed: status=%s body=%s", response.status_code, response.text)
        except Exception:
            logger.exception("create_service failed (unreadable response)")
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
    
    # Handle offer validation and calculation for updates
    if update_data.get('is_on_offer') and update_data.get('discount_percentage'):
        # Validate discount range
        discount = update_data['discount_percentage']
        if discount < 1 or discount > 99:
            raise HTTPException(status_code=400, detail="Discount percentage must be between 1 and 99")
        
        # Get current price if not updating price
        current_price = update_data.get('price') or service.get('price')
        if current_price:
            # Store original price if not already set
            if not service.get('original_price'):
                update_data['original_price'] = current_price
            # Calculate new discounted price
            update_data['price'] = round(current_price * (1 - discount / 100))
    
    response = await supabase_request("PATCH", f"services?id=eq.{service_id}", update_data, token=current_user.get("access_token"))

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
    
    response = await supabase_request("DELETE", f"services?id=eq.{service_id}", token=current_user.get("access_token"))

    return {"message": "Service deleted"}

# ========== BOOKING ENDPOINTS ==========

@app.get("/api/salons/{salon_id}/slots")
async def get_available_slots(salon_id: str, date: str, service_id: str):
    # Get salon and service (including the allow_multiple_bookings_per_slot setting)
    salon_response = await supabase_request("GET", f"salons?id=eq.{salon_id}&select=opening_time,closing_time,allow_multiple_bookings_per_slot,max_bookings_per_slot")
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
    allow_multiple = salon.get("allow_multiple_bookings_per_slot", False)
    max_per_slot = salon.get("max_bookings_per_slot", 1) or 1  # fallback if NULL

    # Get existing bookings for the date (exclude cancelled)
    bookings_response = await supabase_request(
        "GET",
        f"bookings?salon_id=eq.{salon_id}&booking_date=eq.{date}&status=neq.cancelled&select=time_slot,service_id,services(duration)"
    )

    # Track how many bookings each 30-min block has
    slot_booking_count = {}

    if bookings_response.status_code == 200:
        for booking in bookings_response.json():
            slot_time = datetime.strptime(booking["time_slot"], "%H:%M")
            slot_duration = booking.get("services", {}).get("duration", 30)
            # Mark all 30-min blocks covered by this booking
            for i in range(0, slot_duration, 30):
                blocked_time = (slot_time + timedelta(minutes=i)).strftime("%H:%M")
                slot_booking_count[blocked_time] = slot_booking_count.get(blocked_time, 0) + 1

    # Generate slots with availability
    slots = []
    current = opening
    while current + timedelta(minutes=duration) <= closing:
        slot_str = current.strftime("%H:%M")

        # Find the max booking count across all 30-min blocks this service would occupy
        max_count_in_range = 0
        for i in range(0, duration, 30):
            check_time = (current + timedelta(minutes=i)).strftime("%H:%M")
            max_count_in_range = max(max_count_in_range, slot_booking_count.get(check_time, 0))

        if allow_multiple:
            # Multiple bookings allowed — available until capacity reached
            is_available = max_count_in_range < max_per_slot
        else:
            # Single booking mode — any existing booking blocks the slot
            is_available = max_count_in_range == 0

        slots.append({
            "time": slot_str,
            "available": is_available,
            "booking_count": slot_booking_count.get(slot_str, 0),
            "max_bookings": max_per_slot if allow_multiple else 1,
            "allow_multiple": allow_multiple
        })
        current += timedelta(minutes=30)

    return {
        "slots": slots,
        "allow_multiple_bookings_per_slot": allow_multiple,
        "max_bookings_per_slot": max_per_slot
    }

@app.post("/api/bookings")
async def create_booking(data: BookingCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    # 1. Fetch salon and service details
    salon_resp = await supabase_request("GET", f"salons?id=eq.{data.salon_id}", token=token)
    if salon_resp.status_code != 200 or not salon_resp.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    
    salon = salon_resp.json()[0]
    auto_accept = salon.get("auto_accept", True)
    
    service_resp = await supabase_request("GET", f"services?id=eq.{data.service_id}", token=token)
    if service_resp.status_code != 200 or not service_resp.json():
        raise HTTPException(status_code=404, detail="Service not found")
    
    service = service_resp.json()[0]
    
    # 2. Prepare booking data
    booking_data = {
        "user_id": user_id,
        "salon_id": data.salon_id,
        "service_id": data.service_id,
        "booking_date": data.booking_date,
        "time_slot": data.time_slot,
        "status": "confirmed" if auto_accept else "pending",
        "payment_status": "pending",
        "payment_method": data.payment_method,
        "amount": service.get("price", 0)
    }
    
    # 3. Insert booking
    response = await supabase_request("POST", "bookings", booking_data, token=token)
    
    if response.status_code not in [200, 201]:
        print(f"[ERROR create_booking] Failed: {response.status_code} - {response.text}")
        raise HTTPException(status_code=400, detail="Failed to create booking")
    
    booking = response.json()[0]
    
    # 4. Trigger Notifications
    # Fetch owner's push token
    owner_resp = await supabase_request("GET", f"users?id=eq.{salon['owner_id']}", token=token)
    if owner_resp.status_code == 200 and owner_resp.json():
        owner = owner_resp.json()[0]
        if owner.get("push_token"):
            await notify_owner_new_booking(
                owner["push_token"],
                salon["name"],
                service["name"],
                f"{data.booking_date} {data.time_slot}"
            )
            
    # If auto-accepted, notify customer too
    if auto_accept:
        customer_resp = await supabase_request("GET", f"users?id=eq.{user_id}", token=token)
        if customer_resp.status_code == 200 and customer_resp.json():
            customer = customer_resp.json()[0]
            if customer.get("push_token"):
                await notify_customer_booking_confirmed(
                    customer["push_token"],
                    salon["name"],
                    f"{data.booking_date} {data.time_slot}"
                )
    
    return booking

@app.get("/api/bookings")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    profile = current_user.get("profile")
    user_token = current_user.get("access_token")
    
    if profile.get("role") == "customer":
        query = f"bookings?user_id=eq.{current_user.get('id')}&select=*,salons(name,address,phone),services(name,duration)&order=booking_date.desc,time_slot.desc"
    else:
        # Get owner's salon bookings
        salon_response = await supabase_request("GET", f"salons?owner_id=eq.{current_user.get('id')}&select=id", token=user_token)
        if salon_response.status_code != 200 or not salon_response.json():
            return []
        
        salon_id = salon_response.json()[0].get("id")
        query = f"bookings?salon_id=eq.{salon_id}&select=*,users(name,phone),services(name,duration)&order=booking_date.desc,time_slot.desc"
    
    response = await supabase_request("GET", query, token=user_token)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch bookings")
    
    return response.json()

@app.patch("/api/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, data: BookingStatusUpdate, current_user: dict = Depends(get_current_user)):
    token = current_user.get("access_token")
    
    # 1. Update status
    response = await supabase_request("PATCH", f"bookings?id=eq.{booking_id}", {"status": data.status.value}, token=token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update booking status")
        
    # 2. Trigger Notifications for status change
    # Fetch booking, salon, and customer info
    booking_resp = await supabase_request("GET", f"bookings?id=eq.{booking_id}&select=*,salons(name,owner_id),services(name),users(push_token)", token=token)
    
    if booking_resp.status_code == 200 and booking_resp.json():
        booking = booking_resp.json()[0]
        salon_name = booking.get("salons", {}).get("name", "Salon")
        customer_token = booking.get("users", {}).get("push_token")
        booking_time = f"{booking['booking_date']} {booking['time_slot']}"
        
        if customer_token:
            if data.status == "confirmed":
                await notify_customer_booking_confirmed(customer_token, salon_name, booking_time)
            elif data.status == "cancelled":
                await notify_customer_booking_cancelled(customer_token, salon_name, booking_time)
    
    return {"message": f"Booking status updated to {data.status}"}

@app.post("/api/owner/bookings/{booking_id}/accept")
async def accept_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Owner accepts a booking - sets status to confirmed"""
    user_token = current_user.get("access_token")
    
    # Get booking with salon info
    response = await supabase_request("GET", f"bookings?id=eq.{booking_id}&select=*,salons(owner_id)", token=user_token)
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = response.json()[0]
    
    # Verify owner owns the salon
    if booking.get("salons", {}).get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized - you don't own this salon")
    
    # Update status to confirmed
    response = await supabase_request("PATCH", f"bookings?id=eq.{booking_id}", {"status": "confirmed"}, token=user_token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to accept booking")
    
    return {"message": "Booking accepted successfully", "status": "confirmed"}

@app.post("/api/owner/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Owner rejects a booking - sets status to cancelled"""
    user_token = current_user.get("access_token")
    
    # Get booking with salon info
    response = await supabase_request("GET", f"bookings?id=eq.{booking_id}&select=*,salons(owner_id)", token=user_token)
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = response.json()[0]
    
    # Verify owner owns the salon
    if booking.get("salons", {}).get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized - you don't own this salon")
    
    # Update status to cancelled
    response = await supabase_request("PATCH", f"bookings?id=eq.{booking_id}", {"status": "cancelled"}, token=user_token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to reject booking")
    
    return {"message": "Booking rejected successfully", "status": "cancelled"}

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

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: str

@app.post("/api/payments/verify")
async def verify_payment(
    payload: PaymentVerifyRequest,
    current_user: dict = Depends(get_current_user)
):
    # 1. Verify HMAC-SHA256 signature against Razorpay key secret
    if not RAZORPAY_KEY_SECRET:
        logger.error("RAZORPAY_KEY_SECRET not configured")
        raise HTTPException(status_code=500, detail="Payment verification unavailable")

    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, payload.razorpay_signature):
        logger.warning("Razorpay signature mismatch for booking %s", payload.booking_id)
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # 2. Idempotency: load booking; if already paid, short-circuit success
    user_token = current_user.get("access_token")
    booking_lookup = await supabase_request(
        "GET",
        f"bookings?id=eq.{payload.booking_id}&select=id,user_id,payment_status",
        token=user_token,
    )
    if booking_lookup.status_code != 200 or not booking_lookup.json():
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = booking_lookup.json()[0]

    if booking.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")

    if booking.get("payment_status") == PaymentStatus.paid.value:
        return {"message": "Payment already verified", "status": "success", "idempotent": True}

    # 3. Update booking payment status
    response = await supabase_request("PATCH", f"bookings?id=eq.{payload.booking_id}", {
        "payment_status": PaymentStatus.paid.value,
        "status": BookingStatus.confirmed.value,
        "razorpay_order_id": payload.razorpay_order_id,
        "razorpay_payment_id": payload.razorpay_payment_id,
    }, token=user_token)

    if response.status_code not in [200, 201, 204]:
        logger.error("Failed to update booking %s after verified payment: %s", payload.booking_id, response.text)
        raise HTTPException(status_code=500, detail="Failed to update payment status")

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
    
    response = await supabase_request("POST", "reviews", review_data, token=current_user.get("access_token"))

    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail="Failed to create review")
    
    return response.json()[0]

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

