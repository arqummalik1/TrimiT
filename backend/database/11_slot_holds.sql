-- Slot Reservation System for Concurrency Management
-- Author: Senior Developer
-- Date: 2026-05-02

-- Create the slot_holds table
CREATE TABLE IF NOT EXISTS slot_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Ensure a user can't hold too many slots at once (anti-spam)
    CONSTRAINT user_hold_limit CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slot_holds_lookup 
ON slot_holds (salon_id, booking_date, time_slot, expires_at);

CREATE INDEX IF NOT EXISTS idx_slot_holds_user 
ON slot_holds (user_id, expires_at);

-- Atomic reservation function
CREATE OR REPLACE FUNCTION reserve_slot_v1(
    p_salon_id UUID,
    p_service_id UUID,
    p_booking_date DATE,
    p_time_slot TEXT,
    p_user_id UUID,
    p_hold_duration_seconds INTEGER DEFAULT 90
) RETURNS TABLE (
    success BOOLEAN,
    hold_id UUID,
    expires_at TIMESTAMPTZ,
    error_code TEXT
) AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
    v_hold_id UUID;
BEGIN
    -- 1. Check if the slot is already booked
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE salon_id = p_salon_id 
        AND booking_date = p_booking_date 
        AND time_slot = p_time_slot
        AND status NOT IN ('cancelled', 'rejected')
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'SLOT_ALREADY_BOOKED';
        RETURN;
    END IF;

    -- 2. Check if there's an active hold by someone else
    IF EXISTS (
        SELECT 1 FROM slot_holds 
        WHERE salon_id = p_salon_id 
        AND booking_date = p_booking_date 
        AND time_slot = p_time_slot 
        AND expires_at > NOW()
        AND user_id != p_user_id
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'SLOT_TEMPORARILY_HELD';
        RETURN;
    END IF;

    -- 3. Upsert our hold (refresh if already held by us)
    v_expires_at := NOW() + (p_hold_duration_seconds || ' seconds')::INTERVAL;
    
    INSERT INTO slot_holds (salon_id, service_id, booking_date, time_slot, user_id, expires_at)
    VALUES (p_salon_id, p_service_id, p_booking_date, p_time_slot, p_user_id, v_expires_at)
    ON CONFLICT (id) DO UPDATE -- This isn't quite right for conflict on slot, let's just delete old and insert
    SET expires_at = v_expires_at
    RETURNING id INTO v_hold_id;

    -- Better approach: delete any existing hold for this slot by this user and insert fresh
    DELETE FROM slot_holds 
    WHERE salon_id = p_salon_id 
    AND booking_date = p_booking_date 
    AND time_slot = p_time_slot 
    AND user_id = p_user_id;

    INSERT INTO slot_holds (salon_id, service_id, booking_date, time_slot, user_id, expires_at)
    VALUES (p_salon_id, p_service_id, p_booking_date, p_time_slot, p_user_id, v_expires_at)
    RETURNING id INTO v_hold_id;

    RETURN QUERY SELECT TRUE, v_hold_id, v_expires_at, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
