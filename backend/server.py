from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import logging
import os
import time
import sys

# Add startup logging
print("=" * 50)
print("🚀 TrimiT Backend Starting...")
print("=" * 50)
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")
print(f"PORT: {os.getenv('PORT', '8000')}")
print("=" * 50)

try:
    print("📦 Importing config...")
    from config import settings
    print("✅ Config imported successfully")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Supabase URL: {settings.SUPABASE_URL[:30]}...")
except Exception as e:
    print(f"❌ FATAL: Failed to import config: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    print("📦 Importing core modules...")
    from core.limiter import limiter
    from core.exceptions import setup_exception_handlers
    from core.middleware import RequestIDMiddleware
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    print("✅ Core modules imported")
except Exception as e:
    print(f"❌ FATAL: Failed to import core modules: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    print("📦 Importing routers...")
    from routers import auth
    from routers import salons
    from routers import bookings
    from routers import payments
    from routers import promotions
    from routers import staff_availability
    # staff CRUD router disabled until rewritten for httpx supabase wrapper (BC2)
    from routers import owner
    from routers import reviews
    from routers import uploads
    from routers import geocode
    print("✅ Routers imported successfully")
except Exception as e:
    print(f"❌ FATAL: Failed to import routers: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.2,
        profiles_sample_rate=0.2,
    )

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trimit")

app = FastAPI(
    title="TrimiT API",
    description="Backend API for TrimiT Salon Booking App",
    version="1.1.0"
)

# Exception Handlers
setup_exception_handlers(app)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestIDMiddleware)

# CORSMiddleware must be added LAST to be the outermost layer (executes first on request)
ALLOWED_ORIGINS_STR = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://trimit.online,https://www.trimit.online",
)
ALLOWED_ORIGINS_LIST = [o.strip() for o in ALLOWED_ORIGINS_STR.split(",") if o.strip()]

if settings.ENVIRONMENT != "production":
    ALLOWED_ORIGINS_LIST.extend([
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:19006",
    ])

ALLOWED_ORIGINS_LIST = list(dict.fromkeys(ALLOWED_ORIGINS_LIST))

logger.info(f"CORS Configuration - Environment: {settings.ENVIRONMENT}")
logger.info(f"CORS Allowed origins: {ALLOWED_ORIGINS_LIST}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Routers (Versioned)
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(auth.router)
v1_router.include_router(salons.router)
v1_router.include_router(bookings.router)
v1_router.include_router(payments.router)
v1_router.include_router(promotions.router)
v1_router.include_router(staff_availability.router)
# v1_router.include_router(staff.router)  # BC2: full CRUD after staff.py rewrite
v1_router.include_router(owner.router)
v1_router.include_router(reviews.router)
v1_router.include_router(uploads.router)
v1_router.include_router(geocode.router)

app.include_router(v1_router)

# Root endpoint - API info
@app.get("/")
async def root():
    """
    API Root - Returns welcome message and available endpoints.
    """
    return {
        "name": "TrimiT API",
        "version": "1.1.0",
        "description": "Backend API for TrimiT Salon Booking App",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "api_v1_base": "/api/v1",
            "auth": "/api/v1/auth",
            "salons": "/api/v1/salons",
            "bookings": "/api/v1/bookings",
            "payments": "/api/v1/payments",
            "promotions": "/api/v1/promotions",
            "owner": "/api/v1/owner",
            "reviews": "/api/v1/reviews",
        }
    }

# Health Check (Global)
@app.get("/health")
async def health_check():
    """
    Checks the status of the API and its dependencies (Supabase).
    """
    from core.supabase import supabase
    
    supabase_status = "ok"
    try:
        # Ping Supabase rest endpoint
        resp = await supabase.request("GET", "rest/v1/", service_role=True)
        if resp.status_code != 200:
            supabase_status = f"unhealthy (status: {resp.status_code})"
    except Exception as e:
        supabase_status = f"unhealthy ({str(e)})"
        
    return {
        "status": "ok" if supabase_status == "ok" else "degraded",
        "version": "1.1.0",
        "timestamp": time.time(),
        "dependencies": {
            "supabase": supabase_status
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
