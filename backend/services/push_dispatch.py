"""
Central booking push dispatch — preferences, dedupe, structured payloads.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from services.push_notifications import push_service
from services.push_preferences import record_notification_event, should_send_push

logger = logging.getLogger("trimit")

PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.trimit.app"


def _payload(
    event_type: str,
    booking_id: str,
    role_hint: str,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    data: Dict[str, Any] = {
        "type": event_type,
        "booking_id": booking_id,
        "bookingId": booking_id,
        "role_hint": role_hint,
    }
    if extra:
        data.update(extra)
    return data


async def send_booking_push(
    *,
    recipient_user_id: str,
    booking_id: str,
    event_type: str,
    category: str,
    role_hint: str,
    title: str,
    body: str,
    extra_data: Optional[Dict[str, Any]] = None,
) -> bool:
    allowed, token, reason = await should_send_push(recipient_user_id, category)
    if not allowed:
        logger.info(
            "[Push] skipped user=%s event=%s reason=%s",
            recipient_user_id[:8] if recipient_user_id else "?",
            event_type,
            reason,
        )
        return False

    if not await record_notification_event(booking_id, event_type, recipient_user_id):
        return False

    ok = await push_service.send_notification(
        push_token=token,
        title=title,
        body=body,
        data=_payload(event_type, booking_id, role_hint, extra_data),
    )
    if ok:
        logger.info("[Push] sent event=%s booking_id=%s recipient=%s", event_type, booking_id, recipient_user_id[:8])
    return ok


async def notify_owner_new_booking(
    owner_id: str,
    booking_id: str,
    customer_name: str,
    service_name: str,
    booking_date: str,
    time_slot: str,
) -> bool:
    return await send_booking_push(
        recipient_user_id=owner_id,
        booking_id=booking_id,
        event_type="new_booking",
        category="bookings",
        role_hint="owner",
        title="New booking",
        body=f"{customer_name} booked {service_name} on {booking_date} at {time_slot}",
    )


async def notify_customer_booking_confirmed(
    customer_id: str,
    booking_id: str,
    service_name: str,
    booking_date: str,
    time_slot: str,
) -> bool:
    return await send_booking_push(
        recipient_user_id=customer_id,
        booking_id=booking_id,
        event_type="booking_confirmed",
        category="booking_updates",
        role_hint="customer",
        title="Booking confirmed",
        body=f"Your {service_name} on {booking_date} at {time_slot} is confirmed.",
        extra_data={"status": "confirmed"},
    )


async def notify_customer_booking_completed(
    customer_id: str,
    booking_id: str,
) -> bool:
    return await send_booking_push(
        recipient_user_id=customer_id,
        booking_id=booking_id,
        event_type="booking_completed",
        category="booking_updates",
        role_hint="customer",
        title="Thank you for using TrimiT",
        body=(
            "Your booking has been completed successfully. "
            "Please take a moment to rate us on the Google Play Store."
        ),
        extra_data={"status": "completed", "play_store_url": PLAY_STORE_URL},
    )


async def notify_customer_booking_rejected(
    customer_id: str,
    booking_id: str,
    service_name: str,
    booking_date: str,
    time_slot: str,
) -> bool:
    return await send_booking_push(
        recipient_user_id=customer_id,
        booking_id=booking_id,
        event_type="booking_rejected",
        category="booking_updates",
        role_hint="customer",
        title="Booking not accepted",
        body=f"Your {service_name} on {booking_date} at {time_slot} was not accepted.",
        extra_data={"status": "cancelled"},
    )


async def notify_owner_booking_cancelled(
    owner_id: str,
    booking_id: str,
    customer_name: str,
    service_name: str,
    booking_date: str,
    time_slot: str,
) -> bool:
    return await send_booking_push(
        recipient_user_id=owner_id,
        booking_id=booking_id,
        event_type="booking_cancelled",
        category="bookings",
        role_hint="owner",
        title="Booking cancelled",
        body=f"{customer_name} cancelled {service_name} on {booking_date} at {time_slot}.",
        extra_data={"status": "cancelled"},
    )


async def notify_booking_rescheduled(
    recipient_user_id: str,
    booking_id: str,
    role_hint: str,
    title: str,
    body: str,
    initiated_by: str,
) -> bool:
    return await send_booking_push(
        recipient_user_id=recipient_user_id,
        booking_id=booking_id,
        event_type="booking_rescheduled",
        category="booking_updates",
        role_hint=role_hint,
        title=title,
        body=body,
        extra_data={"initiated_by": initiated_by},
    )
