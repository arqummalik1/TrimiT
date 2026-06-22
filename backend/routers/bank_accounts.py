import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any

from dependencies.auth import get_current_user
from models.bank_accounts import BankAccountCreate, BankAccountResponse
from services.bank_account_service import register_bank_account, get_bank_account
from core.supabase import supabase

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/owner/bank-accounts", tags=["Bank Accounts"])

@router.post("/", response_model=BankAccountResponse)
async def upsert_bank_account(
    account: BankAccountCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Creates or updates the salon owner's bank account details.
    """
    owner_id = current_user["id"]
    profile = current_user.get("profile", {})
    
    if profile.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can register bank accounts")
        
    salon_id = profile.get("salon_id")
    if not salon_id:
        raise HTTPException(status_code=400, detail="Owner has no associated salon")

    email = profile.get("email") or current_user.get("email")
    name = profile.get("name") or "Salon Owner"
    
    try:
        account_data = await register_bank_account(
            salon_id=salon_id,
            account_name=account.account_name,
            account_number=account.account_number,
            ifsc_code=account.ifsc_code,
            email=email,
            name=name
        )
        return account_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering bank account: {e}")
        raise HTTPException(status_code=500, detail="Failed to register bank account")

@router.get("", response_model=BankAccountResponse)
async def fetch_bank_account(user: Any = Depends(get_current_user)):
    """
    Fetches the linked bank account for the current salon owner.
    """
    salon_resp = await supabase.request(
        "GET",
        f"rest/v1/salons?owner_id=eq.{user['id']}&select=id",
        service_role=True
    )
    if salon_resp.status_code != 200 or not salon_resp.json():
        raise HTTPException(status_code=403, detail="User does not own a salon")
        
    salon_id = salon_resp.json()[0]["id"]
    
    account_data = await get_bank_account(salon_id)
    if not account_data:
        raise HTTPException(status_code=404, detail="No bank account found")
        
    return account_data
