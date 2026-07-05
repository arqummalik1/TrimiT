-- 57: Service categories (salon menu sections — Zomato-style grouping)
-- Apply manually in Supabase SQL Editor. Forward-only.

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (salon_id, name)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_salon
  ON public.service_categories (salon_id, sort_order);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services (category_id);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Public read: active categories for discoverable salons
DROP POLICY IF EXISTS "Anyone can view active service categories" ON public.service_categories;
CREATE POLICY "Anyone can view active service categories"
  ON public.service_categories FOR SELECT
  USING (active = TRUE);

-- Owners manage their salon categories
DROP POLICY IF EXISTS "Owners manage salon service categories" ON public.service_categories;
CREATE POLICY "Owners manage salon service categories"
  ON public.service_categories FOR ALL
  USING (
    auth.uid() IN (SELECT owner_id FROM public.salons WHERE id = salon_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT owner_id FROM public.salons WHERE id = salon_id)
  );

GRANT SELECT ON public.service_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;

COMMENT ON TABLE public.service_categories IS 'Salon menu sections (Hair, Face, etc.)';
