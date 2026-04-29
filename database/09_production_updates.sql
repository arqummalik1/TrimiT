-- ==========================================
-- 09 - PRODUCTION UPDATES
-- Adds columns for notifications, booking logic, and payment flexibility
-- ==========================================

-- 1. Add auto_accept to salons
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS auto_accept BOOLEAN DEFAULT TRUE;

-- 2. Add payment_method to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'salon_cash' CHECK (payment_method IN ('salon_cash', 'online'));

-- 3. Add push_token to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 4. Enable realtime for the bookings table (if not already enabled)
-- This ensures the owner dashboard can subscribe to changes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
END $$;

-- 5. Add index for push_token for faster lookup
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users(push_token);

SELECT '✅ 09 - Production updates applied successfully!' as status;
