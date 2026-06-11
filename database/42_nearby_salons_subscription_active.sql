-- ============================================================================
-- 42 - get_nearby_salons_v1: expose salons.subscription_active
-- ----------------------------------------------------------------------------
-- Forward-only. Recreates the nearby-salons RPC to ALSO return the
-- subscription_active flag (added in migration 41) so the customer app can
-- grey out / disable salons whose owner's subscription has lapsed.
--
-- Additive for clients: existing fields are unchanged; one new field is added.
-- Apply MANUALLY in the Supabase SQL Editor against production.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_nearby_salons_v1(
  double precision, double precision, double precision, text, integer, integer
);

CREATE OR REPLACE FUNCTION public.get_nearby_salons_v1(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 10,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  phone text,
  opening_time text,
  closing_time text,
  images text[],
  allow_multiple_bookings_per_slot boolean,
  max_bookings_per_slot integer,
  auto_accept boolean,
  subscription_active boolean,
  created_at timestamptz,
  image_url text,
  distance double precision,
  avg_rating numeric,
  review_count bigint,
  services jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.owner_id,
    s.name,
    s.description,
    s.address,
    s.city,
    s.latitude,
    s.longitude,
    s.phone,
    s.opening_time,
    s.closing_time,
    s.images,
    s.allow_multiple_bookings_per_slot,
    s.max_bookings_per_slot,
    s.auto_accept,
    s.subscription_active,
    s.created_at,
    s.image_url,
    CASE
      WHEN p_lat = 0::double precision AND p_lng = 0::double precision THEN NULL::double precision
      ELSE (
        6371 * acos(
          LEAST(
            1.0,
            GREATEST(
              -1.0,
              cos(radians(p_lat)) * cos(radians(s.latitude))
              * cos(radians(s.longitude) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(s.latitude))
            )
          )
        )
      )
    END AS distance,
    COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0::numeric) AS avg_rating,
    COUNT(r.id)::bigint AS review_count,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sv.id,
            'name', sv.name,
            'description', sv.description,
            'price', sv.price,
            'duration', sv.duration,
            'salon_id', sv.salon_id,
            'image_url', sv.image_url,
            'created_at', sv.created_at,
            'is_on_offer', sv.is_on_offer,
            'discount_percentage', sv.discount_percentage,
            'original_price', sv.original_price
          ) ORDER BY sv.name
        )
        FROM public.services sv
        WHERE sv.salon_id = s.id
      ),
      '[]'::jsonb
    ) AS services
  FROM public.salons s
  LEFT JOIN public.reviews r ON r.salon_id = s.id
  WHERE
    s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND (
      (p_lat = 0::double precision AND p_lng = 0::double precision)
      OR (
        6371 * acos(
          LEAST(
            1.0,
            GREATEST(
              -1.0,
              cos(radians(p_lat)) * cos(radians(s.latitude))
              * cos(radians(s.longitude) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(s.latitude))
            )
          )
        )
      ) <= p_radius_km
    )
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR s.name ILIKE '%' || p_search || '%'
      OR s.address ILIKE '%' || p_search || '%'
      OR COALESCE(s.description, '') ILIKE '%' || p_search || '%'
    )
  GROUP BY s.id
  ORDER BY
    CASE
      WHEN p_lat = 0::double precision AND p_lng = 0::double precision THEN s.name
    END ASC NULLS LAST,
    CASE
      WHEN NOT (p_lat = 0::double precision AND p_lng = 0::double precision) THEN (
        6371 * acos(
          LEAST(
            1.0,
            GREATEST(
              -1.0,
              cos(radians(p_lat)) * cos(radians(s.latitude))
              * cos(radians(s.longitude) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(s.latitude))
            )
          )
        )
      )
    END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_salons_v1(
  double precision, double precision, double precision, text, integer, integer
) TO anon, authenticated;

SELECT '✅ 42 - get_nearby_salons_v1 now returns subscription_active' AS status;
