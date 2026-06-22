from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException
from core.supabase import supabase

logger = logging.getLogger("trimit")

async def register_bank_account(salon_id: UUID, account_name: str, account_number: str, ifsc_code: str, email: str, name: str) -> Dict[str, Any]:
    # Saving raw bank details for when the new payment gateway is integrated
    account_number_last4 = account_number[-4:] if len(account_number) >= 4 else account_number
    
    data = {
        "salon_id": str(salon_id),
        "account_name": account_name,
        "account_number_last4": account_number_last4,
        "ifsc_code": ifsc_code,
        "status": "active"
    }
    
    # Upsert logic - one bank account per salon
    existing_resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}&select=id",
        service_role=True
    )
    
    existing_data = existing_resp.json() if existing_resp.status_code == 200 else []
    if existing_data:
        resp = await supabase.request(
            "PATCH",
            f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}",
            json=data,
            service_role=True
        )
    else:
        resp = await supabase.request(
            "POST",
            "rest/v1/salon_bank_accounts",
            json=data,
            service_role=True
        )
        
    if resp.status_code not in [200, 201, 204]:
        logger.error("[BankAccount] Failed to save bank account: %s", resp.text)
        raise HTTPException(status_code=500, detail="Failed to save bank account to database")
        
    final_resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}&select=*",
        service_role=True
    )
    return final_resp.json()[0] if final_resp.status_code == 200 and final_resp.json() else data

async def get_bank_account(salon_id: UUID) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}&select=*",
        service_role=True
    )
    data = resp.json() if resp.status_code == 200 else []
    return data[0] if data else None

