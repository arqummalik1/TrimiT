-- TrimiT Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor: https://etpoecagsfhodtfuhblk.supabase.co/project/etpoecagsfhodtfuhblk/sql

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
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
  amount DECIMAL(10,2),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salons_owner ON public.salons(owner_id);
CREATE INDEX IF NOT EXISTS idx_salons_city ON public.salons(city);
CREATE INDEX IF NOT EXISTS idx_services_salon ON public.services(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON public.bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_reviews_salon ON public.reviews(salon_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert on signup" ON public.users
  FOR INSERT WITH CHECK (true);

-- RLS Policies for salons table
CREATE POLICY "Anyone can view salons" ON public.salons
  FOR SELECT USING (true);

CREATE POLICY "Owners can create salons" ON public.salons
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own salons" ON public.salons
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own salons" ON public.salons
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for services table
CREATE POLICY "Anyone can view services" ON public.services
  FOR SELECT USING (true);

CREATE POLICY "Salon owners can manage services" ON public.services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE salons.id = services.salon_id 
      AND salons.owner_id = auth.uid()
    )
  );

-- RLS Policies for bookings table
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE salons.id = bookings.salon_id 
      AND salons.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and owners can update bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE salons.id = bookings.salon_id 
      AND salons.owner_id = auth.uid()
    )
  );

-- RLS Policies for reviews table
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.salons TO authenticated;
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.reviews TO authenticated;

-- Grant select permissions to anonymous users for public data
GRANT SELECT ON public.salons TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.reviews TO anon;
