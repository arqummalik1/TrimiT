from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
import logging
import httpx
import uuid
import io

from PIL import Image

from config import settings
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/uploads", tags=["Uploads"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_UPLOAD_MB = 10


def _public_storage_url(bucket: str, path: str) -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/{bucket}/{path}"


def _normalize_image_bytes(data: bytes) -> bytes:
    """Decode with Pillow and re-encode as JPEG for consistent storage."""
    with Image.open(io.BytesIO(data)) as img:
        img.load()
        if img.mode != "RGB":
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=86, optimize=True)
        return out.getvalue()


async def _upload_owner_image(
    *,
    current_user: dict,
    file: UploadFile,
    folder: str,
    log_label: str,
) -> dict:
    profile = current_user.get("profile") or {}
    if profile.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Only salon owners may upload images"},
        )

    if not file:
        raise HTTPException(status_code=400, detail={"code": "NO_FILE", "message": "No file provided"})

    raw_content_type = (file.content_type or "").lower()
    if raw_content_type and not raw_content_type.startswith("image/"):
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
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"Image is too large to upload. Maximum size is {MAX_UPLOAD_MB} MB.",
            },
        )

    try:
        data = _normalize_image_bytes(data)
    except Exception as exc:
        logger.warning("[%s] decode failed: %s", log_label, exc)
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_IMAGE", "message": "File is not a valid image"},
        ) from exc

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"Image is too large to upload. Maximum size is {MAX_UPLOAD_MB} MB.",
            },
        )

    content_type = "image/jpeg"
    bucket = "salon-images"
    path = f"{folder}/{current_user.get('id')}/{uuid.uuid4().hex}.jpg"

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
        logger.error("[%s] failed: %s %s", log_label, resp.status_code, resp.text[:200])
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


@router.post("/service-image")
async def upload_service_image(
    current_user: dict = Depends(get_current_user),
    file: UploadFile = File(...),
):
    return await _upload_owner_image(
        current_user=current_user,
        file=file,
        folder="services",
        log_label="upload_service_image",
    )


@router.post("/staff-image")
async def upload_staff_image(
    current_user: dict = Depends(get_current_user),
    file: UploadFile = File(...),
):
    """Upload a staff (stylist) profile photo. Returns public_url for staff.image_url."""
    return await _upload_owner_image(
        current_user=current_user,
        file=file,
        folder="staff",
        log_label="upload_staff_image",
    )
