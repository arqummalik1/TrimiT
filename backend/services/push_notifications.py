"""
Push Notification Service — Expo Push API with retries and stale-token handling.

Defaults are soft (default sound / updates channel). Urgent owner booking/payment
pushes pass custom sound + bookings channel + optional interactive categoryId.
"""

from __future__ import annotations

import asyncio
import json
import httpx
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from services.push_preferences import clear_user_push_token

logger = logging.getLogger("trimit")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
_MAX_ATTEMPTS = 3
_RETRY_DELAY_SEC = 0.6

_STALE_TOKEN_ERRORS = frozenset({"DeviceNotRegistered", "InvalidCredentials"})

# Shared with mobile via shared/push-constants.json (single source of truth).
_PUSH_CONSTANTS_PATH = Path(__file__).resolve().parents[2] / "shared" / "push-constants.json"
with _PUSH_CONSTANTS_PATH.open(encoding="utf-8") as _f:
    _PUSH = json.load(_f)

BOOKING_PUSH_SOUND = _PUSH["bookingSoundFile"]
BOOKING_CHANNEL_ID = _PUSH["bookingChannelId"]
UPDATES_CHANNEL_ID = _PUSH["updatesChannelId"]
PROMOTIONS_CHANNEL_ID = _PUSH["promotionsChannelId"]
BOOKING_INTERRUPTION_LEVEL = _PUSH["iosInterruptionLevel"]
PUSH_TTL_SECONDS = int(_PUSH["pushTtlSeconds"])
OWNER_BOOKING_CATEGORY_ID = _PUSH["ownerBookingCategoryId"]
OWNER_PAYMENT_CATEGORY_ID = _PUSH["ownerPaymentCategoryId"]
OWNER_URGENT_EVENT_TYPES = frozenset(_PUSH["ownerUrgentEventTypes"])


def _is_valid_expo_push_token(push_token: Optional[str]) -> bool:
    if not push_token or not isinstance(push_token, str):
        return False
    t = push_token.strip()
    return t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")


def _parse_expo_ticket(ticket: Dict[str, Any]) -> tuple[bool, Optional[str], Optional[str]]:
    status = ticket.get("status")
    if status == "ok":
        return True, None, None
    details = ticket.get("details") or {}
    error = details.get("error") if isinstance(details, dict) else None
    message = ticket.get("message") or error or "unknown"
    return False, str(message), error


def build_expo_push_message(
    *,
    push_token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = "default",
    priority: str = "high",
    channel_id: str = UPDATES_CHANNEL_ID,
    interruption_level: Optional[str] = None,
    badge: Optional[int] = None,
    category_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build an Expo Push API message (pure — easy to unit test).

    Urgent owner booking alerts use custom sound + bookings channel +
    interruptionLevel=critical (mute bypass needs Apple Critical Alerts).
    Soft updates use default sound + booking_updates channel.
    """
    message: Dict[str, Any] = {
        "to": push_token,
        "title": title,
        "body": body,
        "sound": sound,
        "priority": priority,
        "data": data or {},
        "channelId": channel_id,
        # Keep alive long enough for Doze / brief offline (seconds).
        "ttl": PUSH_TTL_SECONDS,
    }
    if interruption_level:
        message["interruptionLevel"] = interruption_level
    if badge is not None:
        message["badge"] = badge
    if category_id:
        # Expo Push + APNs / FCM interactive actions (Accept/Reject).
        message["categoryId"] = category_id
    return message


class PushNotificationService:
    @staticmethod
    async def _send_once(
        client: httpx.AsyncClient,
        message: Dict[str, Any],
        *,
        recipient_user_id: Optional[str],
    ) -> bool:
        response = await client.post(
            EXPO_PUSH_URL,
            json=[message],
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

        if response.status_code != 200:
            logger.error(
                "[Push] Expo API HTTP %s body=%s",
                response.status_code,
                response.text[:500],
            )
            return False

        tickets = response.json().get("data") or []
        if not tickets:
            logger.error("[Push] Expo API returned no tickets")
            return False

        ticket = tickets[0]
        ok, err, error_code = _parse_expo_ticket(ticket)
        if ok:
            return True

        logger.error("[Push] delivery failed: %s (code=%s)", err, error_code)
        if recipient_user_id and error_code in _STALE_TOKEN_ERRORS:
            await clear_user_push_token(recipient_user_id)
            logger.info("[Push] Cleared stale token for user %s", recipient_user_id[:8])
        return False

    @staticmethod
    async def send_notification(
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = "default",
        priority: str = "high",
        *,
        channel_id: str = UPDATES_CHANNEL_ID,
        interruption_level: Optional[str] = None,
        badge: Optional[int] = None,
        category_id: Optional[str] = None,
        recipient_user_id: Optional[str] = None,
    ) -> bool:
        if not _is_valid_expo_push_token(push_token):
            logger.warning("[Push] Invalid or missing Expo push token")
            return False

        message = build_expo_push_message(
            push_token=push_token,
            title=title,
            body=body,
            data=data,
            sound=sound,
            priority=priority,
            channel_id=channel_id,
            interruption_level=interruption_level,
            badge=badge,
            category_id=category_id,
        )

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                for attempt in range(1, _MAX_ATTEMPTS + 1):
                    ok = await PushNotificationService._send_once(
                        client,
                        message,
                        recipient_user_id=recipient_user_id,
                    )
                    if ok:
                        logger.info(
                            "[Push] sent title=%r recipient=%s attempt=%s channel=%s",
                            title,
                            recipient_user_id[:8] if recipient_user_id else push_token[:24],
                            attempt,
                            channel_id,
                        )
                        return True
                    if attempt < _MAX_ATTEMPTS:
                        await asyncio.sleep(_RETRY_DELAY_SEC * attempt)
                return False
        except Exception as e:
            logger.error("[Push] send_notification exception: %s", str(e))
            return False

    @staticmethod
    async def send_batch_notifications(notifications: List[Dict]) -> Dict[str, int]:
        if not notifications:
            return {"success": 0, "failed": 0}

        messages = []
        for notif in notifications:
            push_token = notif.get("push_token")
            if not _is_valid_expo_push_token(push_token):
                continue
            messages.append(
                build_expo_push_message(
                    push_token=push_token,
                    title=notif.get("title", "TrimiT"),
                    body=notif.get("body", ""),
                    data=notif.get("data", {}),
                    sound=notif.get("sound", "default"),
                    priority=notif.get("priority", "high"),
                    channel_id=notif.get("channelId", UPDATES_CHANNEL_ID),
                    interruption_level=notif.get("interruptionLevel"),
                    badge=notif.get("badge"),
                    category_id=notif.get("categoryId"),
                )
            )

        if not messages:
            return {"success": 0, "failed": 0}

        # Expo push API accepts max 100 messages per request. Chunk to be safe.
        success_total = 0
        failed_total = 0
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                for i in range(0, len(messages), 100):
                    chunk = messages[i : i + 100]
                    response = await client.post(
                        EXPO_PUSH_URL,
                        json=chunk,
                        headers={"Content-Type": "application/json"},
                    )
                    if response.status_code != 200:
                        logger.error(
                            "[Push] batch HTTP %s body=%s",
                            response.status_code,
                            response.text[:300],
                        )
                        failed_total += len(chunk)
                        continue
                    tickets = response.json().get("data", []) or []
                    chunk_success = sum(1 for t in tickets if t.get("status") == "ok")
                    success_total += chunk_success
                    failed_total += len(tickets) - chunk_success
            return {"success": success_total, "failed": failed_total}
        except Exception as e:
            logger.error("[Push] batch exception: %s", str(e))
            return {"success": success_total, "failed": failed_total + len(messages) - success_total - failed_total}


push_service = PushNotificationService()
