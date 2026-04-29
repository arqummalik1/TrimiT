import httpx
import logging
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_push_notification(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = "default",
    badge: int = 1
):
    """
    Send push notifications using Expo's Push API.
    """
    if not push_tokens:
        return

    # Filter out empty tokens
    push_tokens = [t for t in push_tokens if t and t.startswith("ExponentPushToken")]
    if not push_tokens:
        return

    messages = []
    for token in push_tokens:
        message = {
            "to": token,
            "title": title,
            "body": body,
            "sound": sound,
            "badge": badge,
        }
        if data:
            message["data"] = data
        messages.append(message)

    try:
        async with httpx.AsyncClient() as client:
            # Expo allows up to 100 messages per request
            for i in range(0, len(messages), 100):
                chunk = messages[i:i+100]
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=chunk,
                    headers={
                        "Accept": "application/json",
                        "Accept-encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"[Notifications] Expo API error: {response.status_code} - {response.text}")
                else:
                    result = response.json()
                    # Check for individual errors in the receipt
                    for idx, item in enumerate(result.get("data", [])):
                        if item.get("status") == "error":
                            logger.error(f"[Notifications] Error sending to {chunk[idx]['to']}: {item.get('message')}")
                            
    except Exception as e:
        logger.error(f"[Notifications] Exception sending notifications: {str(e)}")

async def notify_owner_new_booking(owner_token: str, salon_name: str, service_name: str, time: str):
    """Notify salon owner about a new booking request"""
    await send_push_notification(
        [owner_token],
        "New Booking Alert! ✂️",
        f"New appointment for {service_name} at {time}.",
        data={"type": "new_booking", "salon": salon_name}
    )

async def notify_customer_booking_confirmed(customer_token: str, salon_name: str, time: str):
    """Notify customer that their booking was confirmed"""
    await send_push_notification(
        [customer_token],
        "Booking Confirmed! ✅",
        f"Your appointment at {salon_name} for {time} is confirmed.",
        data={"type": "booking_update", "status": "confirmed", "salon": salon_name}
    )

async def notify_customer_booking_cancelled(customer_token: str, salon_name: str, time: str, reason: str = ""):
    """Notify customer that their booking was cancelled"""
    body = f"Your appointment at {salon_name} for {time} was cancelled."
    if reason:
        body += f" Reason: {reason}"
        
    await send_push_notification(
        [customer_token],
        "Booking Cancelled ❌",
        body,
        data={"type": "booking_update", "status": "cancelled", "salon": salon_name}
    )
