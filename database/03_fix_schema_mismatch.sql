-- ==========================================
-- 03 - SCHEMA MISMATCH FIX
-- RUN THIS IN SUPABASE SQL EDITOR
-- Fixes mismatches between backend models and database tables
-- ==========================================

-- 1. Update Salons table
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS auto_accept BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_bookings_per_slot INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT; -- Ensure description exists if it was missed

-- 2. Update Services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_on_offer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER,
ADD COLUMN IF NOT EXISTS original_price INTEGER;

-- 3. Update Users table (for push tokens if missing)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'salons';
