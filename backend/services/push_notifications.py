"""
Push Notification Service — Expo Push API with retries and stale-token handling.
"""

from __future__ import annotations

import asyncio
import httpx
import logging
from typing import Any, Dict, List, Optional

from services.push_preferences import clear_user_push_token

logger = logging.getLogger("trimit")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
_MAX_ATTEMPTS = 3
_RETRY_DELAY_SEC = 0.6

_STALE_TOKEN_ERRORS = frozenset({"DeviceNotRegistered", "InvalidCredentials"})


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
        recipient_user_id: Optional[str] = None,
    ) -> bool:
        if not _is_valid_expo_push_token(push_token):
            logger.warning("[Push] Invalid or missing Expo push token")
            return False

        message = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": sound,
            "priority": priority,
            "data": data or {},
            "channelId": "bookings",
        }

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
                            "[Push] sent title=%r recipient=%s attempt=%s",
                            title,
                            recipient_user_id[:8] if recipient_user_id else push_token[:24],
                            attempt,
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
                {
                    "to": push_token,
                    "title": notif.get("title", "TrimiT"),
                    "body": notif.get("body", ""),
                    "sound": notif.get("sound", "default"),
                    "priority": notif.get("priority", "high"),
                    "data": notif.get("data", {}),
                    # Default to the bookings channel for backwards-compat;
                    # broadcasts pass channelId='promotions' so users can mute
                    # marketing without losing booking alerts.
                    "channelId": notif.get("channelId", "bookings"),
                }
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
