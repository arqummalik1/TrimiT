"""
Push Notification Service
────────────────────────────────────────────────────────────────────────────
Handles sending push notifications to mobile devices using Expo Push API.
Supports notifications when app is:
- Open (in-app)
- Background (minimized)
- Closed (fully terminated)
"""

import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger("trimit")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _is_valid_expo_push_token(push_token: Optional[str]) -> bool:
    """Expo classic + newer token prefixes (EAS / dev builds)."""
    if not push_token or not isinstance(push_token, str):
        return False
    t = push_token.strip()
    return t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")


class PushNotificationService:
    """Service for sending push notifications via Expo Push API"""
    
    @staticmethod
    async def send_notification(
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = "default",
        priority: str = "high"
    ) -> bool:
        """
        Send a push notification to a single device.
        
        Args:
            push_token: Expo push token (starts with ExponentPushToken[...])
            title: Notification title
            body: Notification body
            data: Additional data payload
            sound: Sound to play ("default" or None)
            priority: "high" or "normal"
            
        Returns:
            bool: True if sent successfully
        """
        if not _is_valid_expo_push_token(push_token):
            logger.warning("Invalid or missing Expo push token (expected ExponentPushToken[…] or ExpoPushToken[…])")
            return False
            
        message = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": sound,
            "priority": priority,
            "data": data or {},
            "channelId": "bookings",  # Android notification channel
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=[message],
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("data") and len(result["data"]) > 0:
                        ticket = result["data"][0]
                        if ticket.get("status") == "ok":
                            logger.info(f"✅ Push notification sent to {push_token[:20]}...")
                            return True
                        else:
                            logger.error(f"❌ Push notification failed: {ticket.get('message')}")
                            return False
                else:
                    logger.error(f"❌ Expo Push API error: {response.status_code} {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Failed to send push notification: {str(e)}")
            return False
    
    @staticmethod
    async def send_batch_notifications(
        notifications: List[Dict]
    ) -> Dict[str, int]:
        """
        Send multiple push notifications in a batch.
        
        Args:
            notifications: List of notification dicts with keys:
                - push_token: str
                - title: str
                - body: str
                - data: dict (optional)
                
        Returns:
            Dict with success/failure counts
        """
        if not notifications:
            return {"success": 0, "failed": 0}
            
        messages = []
        for notif in notifications:
            push_token = notif.get("push_token")
            if not _is_valid_expo_push_token(push_token):
                continue
                
            messages.append({
                "to": push_token,
                "title": notif.get("title", "TrimiT"),
                "body": notif.get("body", ""),
                "sound": notif.get("sound", "default"),
                "priority": notif.get("priority", "high"),
                "data": notif.get("data", {}),
                "channelId": "bookings",
            })
        
        if not messages:
            return {"success": 0, "failed": 0}
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=messages,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    tickets = result.get("data", [])
                    success = sum(1 for t in tickets if t.get("status") == "ok")
                    failed = len(tickets) - success
                    
                    logger.info(f"📤 Batch notifications: {success} sent, {failed} failed")
                    return {"success": success, "failed": failed}
                else:
                    logger.error(f"❌ Batch notification failed: {response.status_code}")
                    return {"success": 0, "failed": len(messages)}
                    
        except Exception as e:
            logger.error(f"❌ Batch notification error: {str(e)}")
            return {"success": 0, "failed": len(messages)}
    
    @staticmethod
    async def notify_new_booking(
        owner_push_token: str,
        booking_data: Dict
    ) -> bool:
        """
        Send notification to salon owner about new booking.
        
        Args:
            owner_push_token: Owner's Expo push token
            booking_data: Booking information
            
        Returns:
            bool: True if sent successfully
        """
        customer_name = booking_data.get("customer_name", "Customer")
        service_name = booking_data.get("service_name", "Service")
        booking_date = booking_data.get("booking_date", "")
        time_slot = booking_data.get("time_slot", "")
        booking_id = booking_data.get("booking_id", "")
        
        title = "🔔 New Booking Received!"
        body = f"{customer_name} booked {service_name} on {booking_date} at {time_slot}"
        
        data = {
            "type": "new_booking",
            "booking_id": booking_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        return await PushNotificationService.send_notification(
            push_token=owner_push_token,
            title=title,
            body=body,
            data=data,
            sound="default",
            priority="high"
        )
    
    @staticmethod
    async def notify_booking_status_change(
        customer_push_token: str,
        booking_data: Dict,
        new_status: str
    ) -> bool:
        """
        Send notification to customer about booking status change.
        
        Args:
            customer_push_token: Customer's Expo push token
            booking_data: Booking information
            new_status: New booking status
            
        Returns:
            bool: True if sent successfully
        """
        service_name = booking_data.get("service_name", "Service")
        booking_date = booking_data.get("booking_date", "")
        time_slot = booking_data.get("time_slot", "")
        booking_id = booking_data.get("booking_id", "")
        
        status_messages = {
            "confirmed": "✅ Booking Confirmed!",
            "cancelled": "❌ Booking Cancelled",
            "completed": "✨ Booking Completed",
        }
        
        title = status_messages.get(new_status, "📋 Booking Updated")
        body = f"Your {service_name} booking on {booking_date} at {time_slot} is now {new_status}"
        
        data = {
            "type": "status_change",
            "booking_id": booking_id,
            "status": new_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        return await PushNotificationService.send_notification(
            push_token=customer_push_token,
            title=title,
            body=body,
            data=data,
            sound="default",
            priority="high"
        )


# Singleton instance
push_service = PushNotificationService()
