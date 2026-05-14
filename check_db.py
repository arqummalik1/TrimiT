import asyncio
import httpx
from dotenv import dotenv_values

env = dotenv_values("backend/.env")
url = env.get("SUPABASE_URL")
key = env.get("SUPABASE_SERVICE_ROLE_KEY")

async def check():
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        # Check bookings for the salon db89fece-7dab-4911-85a2-4f1235766dab on 2026-05-08
        resp = await client.get(f"{url}/rest/v1/bookings?salon_id=eq.db89fece-7dab-4911-85a2-4f1235766dab&booking_date=eq.2026-05-08", headers=headers)
        print("Bookings:", resp.json())

        # Check holds
        resp = await client.get(f"{url}/rest/v1/slot_holds?salon_id=eq.db89fece-7dab-4911-85a2-4f1235766dab&booking_date=eq.2026-05-08", headers=headers)
        print("Holds:", resp.json())

if __name__ == "__main__":
    asyncio.run(check())
