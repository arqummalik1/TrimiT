-- ==========================================
-- 40 - salons_sitemap view
-- Run in Supabase SQL Editor.
-- Creates a read-only, public view for salons to restrict data exposed to sitemap generation.
-- ==========================================

CREATE OR REPLACE VIEW public.salons_sitemap AS
SELECT 
  id, 
  created_at
FROM public.salons;

-- Grant read access to anyone (anon and authenticated roles)
GRANT SELECT ON public.salons_sitemap TO anon, authenticated;

SELECT '✅ 40 - salons_sitemap view created successfully' AS status;
