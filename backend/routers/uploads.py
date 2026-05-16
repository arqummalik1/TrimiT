from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
import logging
import httpx
from datetime import datetime, timezone
import uuid
import io

from PIL import Image

from config import settings
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/uploads", tags=["Uploads"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _public_storage_url(bucket: str, path: str) -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/{bucket}/{path}"


@router.post("/service-image")
async def upload_service_image(
    current_user: dict = Depends(get_current_user),
    file: UploadFile = File(...),
):
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

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail={"code": "FILE_TOO_LARGE", "message": "Image must be 5 MB or smaller"},
        )

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_IMAGE", "message": "File is not a valid image"},
        )

    bucket = "salon-images"
    ext = "png" if content_type.endswith("png") else "jpg"
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
        logger.error("[upload_service_image] failed: %s %s", resp.status_code, resp.text[:200])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "UPLOAD_FAILED",
                "message": "Could not upload image",
                "storage_status": resp.status_code,
            },
        )

    return {
        "bucket": bucket,
        "path": path,
        "public_url": _public_storage_url(bucket, path),
    }
