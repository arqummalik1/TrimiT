"""
Booking-related push helpers used by bookings router.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from core.supabase import supabase
from services import push_dispatch

logger = logging.getLogger("trimit")


async def fetch_booking_push_context(booking_id: str, token: str) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?id=eq.{booking_id}&select=id,user_id,status,booking_date,time_slot,amount,payment_method,payment_status,services(name),salons(owner_id,name)",
        token=token,
    )
    if resp.status_code != 200 or not resp.json():
        return None
    row = resp.json()[0]
    svc = row.get("services")
    if isinstance(svc, list) and svc:
        service_name = (svc[0] or {}).get("name", "Service")
    elif isinstance(svc, dict):
        service_name = svc.get("name", "Service")
    else:
        service_name = "Service"
    salons = row.get("salons") or {}
    return {
        "booking_id": booking_id,
        "user_id": row.get("user_id"),
        "status": row.get("status"),
        "booking_date": row.get("booking_date"),
        "time_slot": row.get("time_slot"),
        "service_name": service_name,
        "owner_id": salons.get("owner_id") if isinstance(salons, dict) else None,
        "salon_name": salons.get("name", "Salon") if isinstance(salons, dict) else "Salon",
        "amount": row.get("amount"),
        "payment_method": row.get("payment_method"),
        "payment_status": row.get("payment_status"),
    }


async def fetch_user_name(user_id: str) -> str:
    resp = await supabase.request(
        "GET",
        f"rest/v1/users?id=eq.{user_id}&select=name",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0].get("name") or "Customer"
    return "Customer"


async def after_booking_created(
    *,
    booking_id: str,
    salon_owner_id: Optional[str],
    customer_id: str,
    customer_name: str,
    service_name: str,
    booking_date: str,
    time_slot: str,
    initial_status: str,
    is_premium: bool = False,
    payment_method: Optional[str] = None,
) -> None:
    if salon_owner_id:
        await push_dispatch.notify_owner_new_booking(
            owner_id=salon_owner_id,
            booking_id=booking_id,
            customer_name=customer_name,
            service_name=service_name,
            booking_date=booking_date,
            time_slot=time_slot,
            is_premium=is_premium,
            payment_method=payment_method,
        )
    else:
        logger.error("[Push] after_booking_created missing owner_id booking_id=%s", booking_id)

    if initial_status == "confirmed":
        await push_dispatch.notify_customer_booking_confirmed(
            customer_id=customer_id,
            booking_id=booking_id,
            service_name=service_name,
            booking_date=booking_date,
            time_slot=time_slot,
        )


async def after_payment_verified(
    *,
    booking_id: str,
    owner_id: Optional[str],
    customer_id: str,
    customer_name: str,
    service_name: str,
    amount: float,
) -> None:
    if owner_id:
        await push_dispatch.notify_owner_payment_received(
            owner_id=owner_id,
            booking_id=booking_id,
            customer_name=customer_name,
            service_name=service_name,
            amount=amount,
        )


async def after_upi_awaiting_verification(
    *,
    booking_id: str,
    owner_id: Optional[str],
    customer_id: Optional[str],
    customer_name: str,
    service_name: str,
    amount: float,
    booking_reference: str,
) -> None:
    """UPI customer returned and says they paid: tell owner + reassure customer."""
    if owner_id:
        await push_dispatch.notify_owner_payment_awaiting(
            owner_id=owner_id,
            booking_id=booking_id,
            customer_name=customer_name,
            service_name=service_name,
            amount=amount,
            booking_reference=booking_reference,
        )
    if customer_id:
        await push_dispatch.notify_customer_payment_waiting(
            customer_id=customer_id,
            booking_id=booking_id,
        )


async def after_payment_confirmed(
    *,
    booking_id: str,
    customer_id: Optional[str],
    service_name: str,
    booking_date: str,
    time_slot: str,
) -> None:
    """Salon verified the UPI payment: tell the customer the booking is confirmed."""
    if customer_id:
        await push_dispatch.notify_customer_booking_confirmed(
            customer_id=customer_id,
            booking_id=booking_id,
            service_name=service_name,
            booking_date=booking_date,
            time_slot=time_slot,
        )


async def after_payment_rejected(
    *,
    booking_id: str,
    customer_id: Optional[str],
    service_name: str,
) -> None:
    """Salon could not verify the UPI payment: tell the customer to retry/contact."""
    if customer_id:
        await push_dispatch.notify_customer_payment_rejected(
            customer_id=customer_id,
            booking_id=booking_id,
            service_name=service_name,
        )


async def after_status_change(
    *,
    booking_id: str,
    old_status: str,
    new_status: str,
    role: str,
    ctx: Dict[str, Any],
) -> None:
    if old_status == new_status:
        return

    customer_id = ctx.get("user_id")
    owner_id = ctx.get("owner_id")
    service_name = ctx.get("service_name", "Service")
    booking_date = ctx.get("booking_date", "")
    time_slot = ctx.get("time_slot", "")

    if new_status == "completed" and role == "owner" and customer_id:
        await push_dispatch.notify_customer_booking_completed(
            customer_id=customer_id,
            booking_id=booking_id,
        )
        return

    if new_status == "confirmed" and role == "owner" and customer_id:
        await push_dispatch.notify_customer_booking_confirmed(
            customer_id=customer_id,
            booking_id=booking_id,
            service_name=service_name,
            booking_date=booking_date,
            time_slot=time_slot,
        )
        return

    if new_status == "cancelled":
        if role == "owner" and customer_id:
            if old_status == "pending":
                await push_dispatch.notify_customer_booking_rejected(
                    customer_id=customer_id,
                    booking_id=booking_id,
                    service_name=service_name,
                    booking_date=booking_date,
                    time_slot=time_slot,
                )
            else:
                await push_dispatch.send_booking_push(
                    recipient_user_id=customer_id,
                    booking_id=booking_id,
                    event_type="booking_cancelled_by_owner",
                    category="booking_updates",
                    role_hint="customer",
                    title="Booking cancelled",
                    body=f"Your {service_name} on {booking_date} at {time_slot} was cancelled.",
                    extra_data={"status": "cancelled"},
                )
        elif role == "customer" and owner_id:
            customer_name = await fetch_user_name(customer_id)
            await push_dispatch.notify_owner_booking_cancelled(
                owner_id=owner_id,
                booking_id=booking_id,
                customer_name=customer_name,
                service_name=service_name,
                booking_date=booking_date,
                time_slot=time_slot,
            )


async def after_reschedule(
    *,
    booking_id: str,
    user_role: str,
    user_id: str,
    owner_id: Optional[str],
    customer_uid: Optional[str],
    service_name: str,
    salon_name: str,
    nd: str,
    nt: str,
    od: str,
    ot: str,
) -> None:
    if user_role == "customer" and owner_id:
        cname = await fetch_user_name(user_id)
        await push_dispatch.notify_booking_rescheduled(
            recipient_user_id=owner_id,
            booking_id=booking_id,
            role_hint="owner",
            title="Booking rescheduled",
            body=f"{cname} moved {service_name} to {nd} at {nt} (was {od} {ot}).",
            initiated_by="customer",
        )
    elif user_role == "owner" and customer_uid:
        await push_dispatch.notify_booking_rescheduled(
            recipient_user_id=customer_uid,
            booking_id=booking_id,
            role_hint="customer",
            title="Booking rescheduled",
            body=f"{salon_name} updated your {service_name} to {nd} at {nt}.",
            initiated_by="owner",
        )
