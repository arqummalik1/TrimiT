from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import logging
import os
import time

from config import settings
from core.limiter import limiter
from core.exceptions import setup_exception_handlers
from core.middleware import RequestIDMiddleware, SignatureMiddleware
from routers import auth, salons, bookings, payments, promotions, staff

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
