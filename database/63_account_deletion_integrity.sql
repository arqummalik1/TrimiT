-- ============================================================================
-- 63 — Account deletion integrity
-- ----------------------------------------------------------------------------
-- Makes deletion of auth.users safe and complete across every account-owned
-- record. Apply this migration in Supabase before releasing mobile/web 1.1.0.
-- ============================================================================

-- A user may have created a promotion that is not tied to their salon. Keep
-- the promotion only as a system record; remove its link to the deleted user.
ALTER TABLE public.promotions
  DROP CONSTRAINT IF EXISTS promotions_created_by_fkey;
ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Reschedule history disappears with its booking. If an owner rescheduled a
-- different customer's booking, their identity must not block owner deletion.
ALTER TABLE public.booking_reschedules
  DROP CONSTRAINT IF EXISTS booking_reschedules_initiated_by_fkey;
ALTER TABLE public.booking_reschedules
  ADD CONSTRAINT booking_reschedules_initiated_by_fkey
  FOREIGN KEY (initiated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Payment/refund rows are account-associated data. Cascade them through their
-- booking or salon, and directly through the customer where user_id is set.
ALTER TABLE public.refunds
  DROP CONSTRAINT IF EXISTS refunds_payment_id_fkey;
ALTER TABLE public.refunds
  ADD CONSTRAINT refunds_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_booking_id_fkey,
  DROP CONSTRAINT IF EXISTS payments_salon_id_fkey,
  DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  ADD CONSTRAINT payments_salon_id_fkey
    FOREIGN KEY (salon_id) REFERENCES public.salons(id) ON DELETE CASCADE,
  ADD CONSTRAINT payments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Notification payloads addressed to a deleted account are no longer useful.
ALTER TABLE public.notification_events
  DROP CONSTRAINT IF EXISTS notification_events_recipient_user_id_fkey;
ALTER TABLE public.notification_events
  ADD CONSTRAINT notification_events_recipient_user_id_fkey
  FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Manual payment verification may name an owner/employee. Preserve the
-- booking while removing the deleted verifier identity.
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_verified_by_fkey;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT payments_user_id_fkey ON public.payments IS
  'Account deletion removes customer-associated payment records.';

SELECT '✅ 63 — account deletion foreign-key integrity applied' AS status;
