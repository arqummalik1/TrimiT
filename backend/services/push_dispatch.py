"""
Central booking push dispatch — preferences, dedupe, structured payloads.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from services.push_notifications import (
    BOOKING_CHANNEL_ID,
    BOOKING_INTERRUPTION_LEVEL,
    BOOKING_PUSH_SOUND,
    OWNER_BOOKING_CATEGORY_ID,
    OWNER_PAYMENT_CATEGORY_ID,
    UPDATES_CHANNEL_ID,
    push_service,
)
from services.push_preferences import (
    is_duplicate_notification,
    mark_notification_sent,
    should_send_push,
)

logger = logging.getLogger("trimit")

PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.trimit.app"

# Owner events that get loud custom sound + vibration channel (FG/BG/killed push).
_OWNER_URGENT_EVENTS = frozenset(
    {
        "new_booking",
        "payment_received",
        "payment_awaiting_verification",
    }
)


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


def _urgent_profile(event_type: str) -> Dict[str, Any]:
    """Loud TrimiT booking tone + optional Accept/Reject (or payment) actions."""
    category_id: Optional[str] = None
    if event_type == "new_booking":
        category_id = OWNER_BOOKING_CATEGORY_ID
    elif event_type == "payment_awaiting_verification":
        category_id = OWNER_PAYMENT_CATEGORY_ID
    return {
        "sound": BOOKING_PUSH_SOUND,
        "channel_id": BOOKING_CHANNEL_ID,
        "interruption_level": BOOKING_INTERRUPTION_LEVEL,
        "badge": 1,
        "category_id": category_id,
    }


def _soft_profile() -> Dict[str, Any]:
    """Default OS tone — deliver everywhere, not Rapido-loud."""
    return {
        "sound": "default",
        "channel_id": UPDATES_CHANNEL_ID,
        "interruption_level": None,
        "badge": None,
        "category_id": None,
    }


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
    if not recipient_user_id:
        logger.warning("[Push] skipped event=%s — missing recipient", event_type)
        return False

    allowed, token, reason = await should_send_push(recipient_user_id, category)
    if not allowed:
        logger.info(
            "[Push] skipped user=%s event=%s reason=%s",
            recipient_user_id[:8],
            event_type,
            reason,
        )
        return False

    if await is_duplicate_notification(booking_id, event_type, recipient_user_id):
        logger.info(
            "[Push] duplicate skipped booking_id=%s event=%s user=%s",
            booking_id,
            event_type,
            recipient_user_id[:8],
        )
        return False

    is_urgent = role_hint == "owner" and event_type in _OWNER_URGENT_EVENTS
    profile = _urgent_profile(event_type) if is_urgent else _soft_profile()

    ok = await push_service.send_notification(
        push_token=token,
        title=title,
        body=body,
        data=_payload(event_type, booking_id, role_hint, extra_data),
        recipient_user_id=recipient_user_id,
        sound=profile["sound"],
        channel_id=profile["channel_id"],
        interruption_level=profile["interruption_level"],
        badge=profile["badge"],
        category_id=profile["category_id"],
    )
    if ok:
        await mark_notification_sent(booking_id, event_type, recipient_user_id)
        logger.info(
            "[Push] delivered event=%s booking_id=%s recipient=%s urgent=%s",
            event_type,
            booking_id,
            recipient_user_id[:8],
            is_urgent,
        )
    else:
        logger.error(
            "[Push] delivery failed event=%s booking_id=%s recipient=%s",
            event_type,
            booking_id,
            recipient_user_id[:8],
        )
    return ok


async def notify_owner_new_booking(
    owner_id: str,
    booking_id: str,
    customer_name: str,
    service_name: str,
    booking_date: str,
    time_slot: str,
    *,
    is_premium: bool = False,
    payment_method: Optional[str] = None,
    booking_reference: Optional[str] = None,
) -> bool:
    title = "⭐ Premium booking" if is_premium else "🔔 New booking"
    body = f"{customer_name} booked {service_name} on {booking_date} at {time_slot}"
    if payment_method == "upi" and booking_reference:
        body += f" — UPI ref: {booking_reference}"
    extra: Dict[str, Any] = {}
    if payment_method:
        extra["payment_method"] = payment_method
    if is_premium:
        extra["is_premium"] = True
    if booking_reference:
        extra["booking_reference"] = booking_reference

    return await send_booking_push(
        recipient_user_id=owner_id,
        booking_id=booking_id,
        event_type="new_booking",
        category="bookings",
        role_hint="owner",
        title=title,
        body=body,
        extra_data=extra or None,
    )


async def notify_owner_payment_received(
    owner_id: str,
    booking_id: str,
    customer_name: str,
    service_name: str,
    amount: float,
) -> bool:
    return await send_booking_push(
        recipient_user_id=owner_id,
        booking_id=booking_id,
        event_type="payment_received",
        category="bookings",
        role_hint="owner",
        title="Payment received",
        body=f"{customer_name} paid {service_name} — ₹{amount:.0f} online.",
        extra_data={"payment_status": "paid"},
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
        title="✅ Booking Confirmed",
        body=f"Your {service_name} on {booking_date} at {time_slot} is confirmed. See you there!",
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
        title="⭐ Visit complete! How was it?",
        body=(
            "Your appointment is done. We hope you loved the experience — "
            "a quick rating on the Play Store means the world to us."
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
        body=f"The salon couldn't accept your {service_name} on {booking_date} at {time_slot}. Try another slot.",
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
    category = "bookings" if role_hint == "owner" else "booking_updates"
    return await send_booking_push(
        recipient_user_id=recipient_user_id,
        booking_id=booking_id,
        event_type="booking_rescheduled",
        category=category,
        role_hint=role_hint,
        title=title,
        body=body,
        extra_data={"initiated_by": initiated_by},
    )


async def notify_owner_payment_awaiting(
    owner_id: str,
    booking_id: str,
    customer_name: str,
    service_name: str,
    amount: float,
    booking_reference: str,
) -> bool:
    """Owner: a customer says they paid via UPI — verify it in the app."""
    return await send_booking_push(
        recipient_user_id=owner_id,
        booking_id=booking_id,
        event_type="payment_awaiting_verification",
        category="bookings",
        role_hint="owner",
        title="Payment to verify",
        body=(
            f"{customer_name} marked {service_name} as paid (₹{amount:.0f}, "
            f"ref {booking_reference}). Verify to confirm the booking."
        ),
        extra_data={
            "payment_verification_status": "waiting_verification",
            "booking_reference": booking_reference,
        },
    )


async def notify_customer_payment_waiting(
    customer_id: str,
    booking_id: str,
) -> bool:
    """Customer: we are waiting for the salon to verify the UPI payment."""
    return await send_booking_push(
        recipient_user_id=customer_id,
        booking_id=booking_id,
        event_type="payment_waiting_verification",
        category="booking_updates",
        role_hint="customer",
        title="⏳ Payment received — verifying",
        body=(
            "Your payment has been noted. The salon is verifying it right now — "
            "most salons confirm within 2–5 minutes."
        ),
        extra_data={"payment_verification_status": "waiting_verification"},
    )


async def notify_customer_payment_rejected(
    customer_id: str,
    booking_id: str,
    service_name: str,
) -> bool:
    """Customer: the salon could not verify the UPI payment."""
    return await send_booking_push(
        recipient_user_id=customer_id,
        booking_id=booking_id,
        event_type="payment_rejected",
        category="booking_updates",
        role_hint="customer",
        title="Payment not verified",
        body=(
            f"The salon couldn't verify your payment for {service_name}. "
            "Please try paying again or contact the salon directly."
        ),
        extra_data={"payment_verification_status": "rejected"},
    )
