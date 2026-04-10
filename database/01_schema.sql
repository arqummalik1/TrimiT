-- ==========================================
-- 01 - TRIMIT DATABASE SCHEMA
-- RUN THIS FIRST: Creates all tables, indexes, and RLS policies
-- ==========================================

-- ==========================================
-- TABLES
-- ==========================================

-- 1. Users table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'owner')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Salons table
CREATE TABLE IF NOT EXISTS public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  phone TEXT NOT NULL,
  opening_time TEXT DEFAULT '09:00',
  closing_time TEXT DEFAULT '21:00',
  images TEXT[] DEFAULT '{}',
  allow_multiple_bookings_per_slot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, salon_id, service_id, booking_date, time_slot)
);

-- 5. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON public.bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_services_salon_id ON public.services(salon_id);
CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON public.reviews(salon_id);
CREATE INDEX IF NOT EXISTS idx_salons_location ON public.salons USING gin(
  (jsonb_build_object('lat', latitude, 'lng', longitude))
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Salons policies
DROP POLICY IF EXISTS "Anyone can view salons" ON public.salons;
CREATE POLICY "Anyone can view salons" ON public.salons
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Owners can insert their salons" ON public.salons;
CREATE POLICY "Owners can insert their salons" ON public.salons
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their salons" ON public.salons;
CREATE POLICY "Owners can update their salons" ON public.salons
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- Services policies
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
CREATE POLICY "Anyone can view services" ON public.services
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Owners can manage their services" ON public.services;
CREATE POLICY "Owners can manage their services" ON public.services
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE salons.id = services.salon_id 
      AND salons.owner_id = auth.uid()
    )
  );

-- Bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view salon bookings" ON public.bookings;
CREATE POLICY "Owners can view salon bookings" ON public.bookings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE salons.id = bookings.salon_id 
      AND salons.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON public.reviews;
CREATE POLICY "Users can create reviews for their bookings" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- GRANTS
-- ==========================================

GRANT SELECT ON public.users TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.salons TO authenticated;
GRANT SELECT ON public.salons TO anon;
GRANT SELECT ON public.services TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated, anon;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
SELECT '✅ 01 - Schema created successfully!' as status;
SELECT '📋 Next: Run 02_seed_data.sql to add test data' as next_step;
