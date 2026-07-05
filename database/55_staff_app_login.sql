-- Migration 55: Staff app login (employee role + staff.user_id link)
-- Forward-only. Apply manually in Supabase SQL Editor.
--
-- PURPOSE
-- ───────
-- The `staff` table stores bookable stylist profiles (customer picks a stylist).
-- This migration lets a staff member LOG INTO the TrimiT app to manage the salon
-- when the owner is away (vacation, etc.).
--
-- FLOW
-- 1. Owner adds staff with phone in the app.
-- 2. Owner taps "Invite to App" → app_access_status = 'pending'.
-- 3. Employee downloads TrimiT, signs up via OTP, chooses "Salon Employee" at
--    complete-profile using the SAME phone number.
-- 4. Backend links staff.user_id, sets app_access_status = 'active', role = employee.
-- 5. Employee sees the owner dashboard for that salon (bookings, accept/reject).

-- Extend users.role to include employee
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'owner', 'employee'));

-- Link staff profiles to auth users
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS app_access_status VARCHAR(20) NOT NULL DEFAULT 'none'
  CHECK (app_access_status IN ('none', 'pending', 'active', 'revoked'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_user_id_unique
  ON public.staff(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_pending_invite_phone
  ON public.staff(phone, app_access_status)
  WHERE app_access_status = 'pending' AND phone IS NOT NULL;

COMMENT ON COLUMN public.staff.user_id IS
  'Linked auth.users id when this staff member can log into the app as an employee.';
COMMENT ON COLUMN public.staff.app_access_status IS
  'App login invite state: none | pending (invited) | active (linked) | revoked.';
