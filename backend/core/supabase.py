import httpx
from config import settings
import logging

logger = logging.getLogger("trimit")

class SupabaseClient:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.timeout = httpx.Timeout(30.0, connect=10.0)

    async def request(self, method: str, path: str, token: str = None, service_role: bool = False, json: dict = None, params: dict = None):
        headers = {
            "apikey": self.service_role_key if service_role else self.anon_key,
            "Authorization": f"Bearer {token if token else (self.service_role_key if service_role else self.anon_key)}",
            "Content-Type": "application/json"
        }
        
        # Clean path
        if path.startswith("/"):
            path = path[1:]
            
        full_url = f"{self.url}/{path}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=full_url,
                    headers=headers,
                    json=json,
                    params=params
                )
                return response
            except Exception as e:
                logger.error(f"Supabase request failed: {str(e)}")
                raise

supabase = SupabaseClient()
