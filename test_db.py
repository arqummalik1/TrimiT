import asyncio
import os
from dotenv import load_dotenv

load_dotenv("mobile/.env")

from supabase import create_client, Client

url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
key = os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

async def check():
    print("Checking bookings...")
    # we have to use service role key or we'll hit RLS!
    # wait, we don't have service role key in mobile/.env.
    # Let's get it from backend/.env
    pass

if __name__ == "__main__":
    asyncio.run(check())
