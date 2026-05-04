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
    from core.middleware import RequestIDMiddleware, SignatureMiddleware
    print("✅ Core modules imported")
except Exception as e:
    print(f"❌ FATAL: Failed to import core modules: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    print("📦 Importing routers...")
    from routers import auth, salons, bookings, payments, promotions, staff
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
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
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

# Middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SignatureMiddleware)

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "https://trimit.com,http://localhost:3000,http://localhost:8081").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (Versioned)
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(auth.router)
v1_router.include_router(salons.router)
v1_router.include_router(bookings.router)
v1_router.include_router(payments.router)
v1_router.include_router(promotions.router)
v1_router.include_router(staff.router)

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
            "auth": "/api/v1/auth",
            "salons": "/api/v1/salons",
            "bookings": "/api/v1/bookings",
            "payments": "/api/v1/payments",
            "promotions": "/api/v1/promotions",
            "staff": "/api/v1/staff"
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
