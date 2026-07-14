"""Unit tests for Expo push message shaping (urgent vs soft + categories)."""

from services.push_notifications import (
    BOOKING_CHANNEL_ID,
    BOOKING_PUSH_SOUND,
    OWNER_BOOKING_CATEGORY_ID,
    OWNER_PAYMENT_CATEGORY_ID,
    PROMOTIONS_CHANNEL_ID,
    UPDATES_CHANNEL_ID,
    build_expo_push_message,
    _is_valid_expo_push_token,
)
from services.push_dispatch import _soft_profile, _urgent_profile


def test_valid_expo_tokens():
    assert _is_valid_expo_push_token("ExponentPushToken[abc]")
    assert _is_valid_expo_push_token("ExpoPushToken[xyz]")
    assert not _is_valid_expo_push_token("fcm:not-expo")
    assert not _is_valid_expo_push_token("")
    assert not _is_valid_expo_push_token(None)


def test_urgent_booking_message_uses_custom_sound_and_category():
    profile = _urgent_profile("new_booking")
    msg = build_expo_push_message(
        push_token="ExponentPushToken[test]",
        title="New booking",
        body="Customer booked a cut",
        data={"type": "new_booking"},
        sound=profile["sound"],
        channel_id=profile["channel_id"],
        interruption_level=profile["interruption_level"],
        badge=profile["badge"],
        category_id=profile["category_id"],
    )
    assert msg["sound"] == "notification.mp3"
    assert msg["channelId"] == "bookings_v4"
    assert msg["interruptionLevel"] == "critical"
    assert msg["categoryId"] == OWNER_BOOKING_CATEGORY_ID
    assert msg["badge"] == 1
    assert msg["ttl"] == 86400
    assert msg["data"]["type"] == "new_booking"


def test_urgent_payment_awaiting_uses_payment_category():
    profile = _urgent_profile("payment_awaiting_verification")
    assert profile["channel_id"] == BOOKING_CHANNEL_ID
    assert profile["sound"] == BOOKING_PUSH_SOUND
    assert profile["category_id"] == OWNER_PAYMENT_CATEGORY_ID


def test_payment_received_urgent_without_action_category():
    profile = _urgent_profile("payment_received")
    assert profile["channel_id"] == BOOKING_CHANNEL_ID
    assert profile["category_id"] is None


def test_soft_profile_uses_updates_channel_default_sound():
    profile = _soft_profile()
    msg = build_expo_push_message(
        push_token="ExponentPushToken[test]",
        title="Rescheduled",
        body="Booking moved",
        sound=profile["sound"],
        channel_id=profile["channel_id"],
        interruption_level=profile["interruption_level"],
        badge=profile["badge"],
        category_id=profile["category_id"],
    )
    assert msg["sound"] == "default"
    assert msg["channelId"] == UPDATES_CHANNEL_ID
    assert "interruptionLevel" not in msg
    assert "categoryId" not in msg


def test_owner_urgent_events_come_from_shared_json():
    from services.push_notifications import OWNER_URGENT_EVENT_TYPES

    assert OWNER_URGENT_EVENT_TYPES == frozenset(
        {
            "new_booking",
            "payment_received",
            "payment_awaiting_verification",
        }
    )


def test_promo_message_omits_interruption_when_none():
    msg = build_expo_push_message(
        push_token="ExponentPushToken[test]",
        title="Offer",
        body="Hello",
        sound="default",
        channel_id=PROMOTIONS_CHANNEL_ID,
        interruption_level=None,
    )
    assert msg["sound"] == "default"
    assert msg["channelId"] == "promotions"
    assert "interruptionLevel" not in msg
