from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
import logging
import httpx
from datetime import datetime, timezone
import uuid

from config import settings
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/uploads", tags=["Uploads"])


def _public_storage_url(bucket: str, path: str) -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/{bucket}/{path}"


@router.post("/service-image")
async def upload_service_image(
    current_user: dict = Depends(get_current_user),
    file: UploadFile = File(...),
):
    """
    Upload a service image to Supabase Storage using SERVICE ROLE.

    Why: mobile app does not have a Supabase auth session; direct uploads with anon key
    fail under Storage RLS. This endpoint securely uploads and returns a public URL.
    """
    if not file:
        raise HTTPException(status_code=400, detail={"code": "NO_FILE", "message": "No file provided"})

    content_type = file.content_type or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILE_TYPE", "message": "Only image uploads are supported"},
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_FILE", "message": "Empty file"})

    bucket = "salon-images"
    # Keep paths tidy and unique.
    ext = "jpg"
    if content_type.endswith("png"):
        ext = "png"
    path = f"services/{current_user.get('id')}/{uuid.uuid4().hex}.{ext}"

    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{path}"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.put(url, headers=headers, content=data)

    if resp.status_code not in (200, 201):
        logger.error(f"[upload_service_image] failed: {resp.status_code} {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "UPLOAD_FAILED",
                "message": "Could not upload image",
                "storage_status": resp.status_code,
                "storage_body": resp.text,
                "timestamp": int(datetime.now(timezone.utc).timestamp()),
            },
        )

    return {
        "bucket": bucket,
        "path": path,
        "public_url": _public_storage_url(bucket, path),
    }

