from fastapi import APIRouter, Request, HTTPException, Depends, status
from typing import Dict, Any
from datetime import datetime, timezone
import httpx
import logging

from config import settings
from core.supabase import supabase
from core.limiter import limiter
from models.auth import (
    UserCreate, UserLogin, UserUpdate, PushTokenUpdate,
    ForgotPasswordRequest, ValidateTokenRequest, ResetPasswordRequest
)
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
@limiter.limit("3/minute")
async def signup(request: Request, user: UserCreate):
    # Sign up with Supabase Auth
    response = await supabase.request("POST", "auth/v1/signup", json={
        "email": user.email,
        "password": user.password,
    })
    
    if response.status_code != 200:
        error_data = response.json()
        error_msg = error_data.get("msg", "Signup failed")
        
        if "rate limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Too many signup attempts. Please wait.")
        elif "email" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Invalid email or already registered.")
        else:
            raise HTTPException(status_code=400, detail=f"Signup failed: {error_msg}")
    
    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id")
    
    if user_id:
        profile_data = {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "phone": user.phone,
            "role": user.role.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Create user profile using SERVICE ROLE
        await supabase.request("POST", "rest/v1/users", json=profile_data, service_role=True)
    
    return {
        "message": "Signup successful",
        "user": auth_data.get("user"),
        "session": auth_data.get("session"),
    }

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, user: UserLogin):
    response = await supabase.request("POST", "auth/v1/token?grant_type=password", json={
        "email": user.email,
        "password": user.password,
    })
    
    if response.status_code != 200:
        error_data = response.json()
        error_msg = error_data.get("error_description", "Login failed")
        raise HTTPException(status_code=401, detail=f"Login failed: {error_msg}")
    
    auth_data = response.json()
    user_id = auth_data.get("user", {}).get("id")
    
    if user_id:
        profile_response = await supabase.request(
            "GET", 
            f"rest/v1/users?id=eq.{user_id}&select=*", 
            token=auth_data["access_token"]
        )
        if profile_response.status_code == 200:
            profiles = profile_response.json()
            if profiles:
                auth_data["profile"] = profiles[0]
    
    return auth_data

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.patch("/profile")
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    response = await supabase.request("PATCH", f"rest/v1/users?id=eq.{user_id}", json=update_data, token=token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    
    return {"message": "Profile updated"}

@router.post("/push-token")
async def register_push_token(data: PushTokenUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    token = current_user.get("access_token")
    
    response = await supabase.request("PATCH", f"rest/v1/users?id=eq.{user_id}", json={"push_token": data.push_token}, token=token)
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to register push token")
    
    return {"message": "Push token registered successfully"}

@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    response = await supabase.request("POST", "auth/v1/recover", json={"email": data.email})
    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="Too many reset attempts.")
    return {"message": "If an account exists, a reset link has been sent"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    response = await supabase.request("PUT", "auth/v1/user", token=data.token, json={"password": data.password})
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to reset password")
    return {"message": "Password reset successful"}
