import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from urllib.parse import quote
from core.supabase import supabase

logger = logging.getLogger("trimit")

def _normalize_email(email: str) -> str:
    return email.strip().lower()

async def add_early_access_email(email: str) -> Tuple[int, Dict[str, Any]]:
    normalized = _normalize_email(email)
    email_norm = quote(normalized, safe="")
    
    # Check if already exists in early_access_emails table
    check_resp = await supabase.request(
        "GET",
        f"rest/v1/early_access_emails?email=eq.{email_norm}&select=id",
        service_role=True
    )
    
    if check_resp.status_code == 200 and check_resp.json():
        return 400, {
            "code": "ALREADY_REGISTERED",
            "message": "This email has already registered for early access."
        }
        
    # Insert new record
    row = {
        "email": normalized,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    insert_resp = await supabase.request(
        "POST",
        "rest/v1/early_access_emails",
        json=row,
        service_role=True
    )
    
    if insert_resp.status_code not in (200, 201):
        logger.error(f"[early_access] insert failed: {insert_resp.status_code} {insert_resp.text}")
        return 400, {
            "code": "INSERT_FAILED",
            "message": "Could not register email for early access."
        }
        
    return 201, {
        "message": "Successfully registered for early access."
    }
