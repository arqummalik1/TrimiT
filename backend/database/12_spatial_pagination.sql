-- Spatial Pagination RPC for Salons
-- Author: Senior Architect
-- Date: 2026-05-02

CREATE OR REPLACE FUNCTION get_nearby_salons_v1(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  opening_time TEXT,
  closing_time TEXT,
  distance DOUBLE PRECISION,
  avg_rating NUMERIC,
  review_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.address,
    s.latitude,
    s.longitude,
    s.image_url,
    s.opening_time,
    s.closing_time,
    (6371 * acos(
        least(1.0, 
            cos(radians(p_lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(p_lng)) + 
            sin(radians(p_lat)) * sin(radians(s.latitude))
        )
    )) AS distance,
    COALESCE(AVG(r.rating), 0)::NUMERIC(3,1) as avg_rating,
    COUNT(r.id) as review_count
  FROM salons s
  LEFT JOIN reviews r ON r.salon_id = s.id
  WHERE 
    (p_search IS NULL OR s.name ILIKE '%' || p_search || '%')
    AND (6371 * acos(
        least(1.0, 
            cos(radians(p_lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(p_lng)) + 
            sin(radians(p_lat)) * sin(radians(s.latitude))
        )
    )) <= p_radius_km
  GROUP BY s.id
  ORDER BY distance ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
