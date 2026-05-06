-- ==========================================
-- 20 - CREATE ATOMIC BOOKING RPC
-- RUN THIS IN SUPABASE SQL EDITOR
-- Ensures POST /api/v1/bookings works (atomic insert + capacity guard)
-- ==========================================

create or replace function public.create_atomic_booking(
    p_user_id uuid,
    p_salon_id uuid,
    p_service_id uuid,
    p_booking_date date,
    p_time_slot text,
    p_status text,
    p_payment_method text,
    p_payment_status text,
    p_amount numeric,
    p_promo_code text default null,
    p_discount_amount numeric default 0,
    p_original_amount numeric default null
) returns json as $$
declare
    v_allow_multiple boolean;
    v_max_bookings integer;
    v_current_bookings integer;
    v_booking_id uuid;
begin
    -- Lock the salon row to serialize bookings per salon.
    select allow_multiple_bookings_per_slot, max_bookings_per_slot
      into v_allow_multiple, v_max_bookings
      from public.salons
     where id = p_salon_id
     for share;

    if not found then
        return json_build_object('success', false, 'error', 'Salon not found');
    end if;

    -- Count existing bookings for this slot (ignore cancelled).
    select count(*)
      into v_current_bookings
      from public.bookings
     where salon_id = p_salon_id
       and booking_date = p_booking_date
       and time_slot = p_time_slot
       and status <> 'cancelled';

    -- Capacity rules.
    if (not v_allow_multiple) and v_current_bookings > 0 then
        return json_build_object('success', false, 'error', 'This slot is already fully booked.');
    end if;

    if v_allow_multiple and v_current_bookings >= coalesce(v_max_bookings, 1) then
        return json_build_object('success', false, 'error', 'This slot has reached maximum capacity.');
    end if;

    insert into public.bookings (
        user_id,
        salon_id,
        service_id,
        booking_date,
        time_slot,
        status,
        payment_method,
        payment_status,
        amount,
        promo_code,
        discount_amount,
        original_amount
    ) values (
        p_user_id,
        p_salon_id,
        p_service_id,
        p_booking_date,
        p_time_slot,
        p_status,
        p_payment_method,
        p_payment_status,
        p_amount,
        p_promo_code,
        p_discount_amount,
        p_original_amount
    ) returning id into v_booking_id;

    return json_build_object('success', true, 'booking_id', v_booking_id);
end;
$$ language plpgsql security definer;

-- Allow PostgREST "authenticated" role to execute this RPC.
grant execute on function public.create_atomic_booking(
    uuid, uuid, uuid, date, text, text, text, text, numeric, text, numeric, numeric
) to authenticated;

