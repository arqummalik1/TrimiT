from fastapi import APIRouter, Request, HTTPException, status
from models.early_access import EarlyAccessEmailCreate
from services.early_access import add_early_access_email
from core.limiter import limiter

router = APIRouter(prefix="/early-access", tags=["Early Access"])

@router.post("/", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_early_access(request: Request, data: EarlyAccessEmailCreate):
    status_code, response = await add_early_access_email(data.email)
    if status_code != 201:
        raise HTTPException(
            status_code=status_code,
            detail=response.get("message", "Request failed")
        )
    return response
