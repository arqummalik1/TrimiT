-- ==========================================
-- 10 - ADD NEARBY SALONS RPC (GEOSPATIAL FILTERING)
-- RUN THIS IN SUPABASE SQL EDITOR
-- ==========================================

-- Drop the function if it already exists to allow for easy updates
DROP FUNCTION IF EXISTS public.get_nearby_salons(float, float, float);

-- Create the RPC function to get nearby salons based on Haversine distance
CREATE OR REPLACE FUNCTION public.get_nearby_salons(
  user_lat float, 
  user_lng float, 
  radius_km float
)
RETURNS SETOF public.salons
LANGUAGE plpgsql
SECURITY DEFINER -- Ensures the function can read salons based on the existing RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.salons
  WHERE 
    latitude IS NOT NULL 
    AND longitude IS NOT NULL
    -- Calculate distance in km using Haversine formula
    AND (
      6371 * acos(
        -- Prevent domain errors by capping acos input between -1 and 1
        LEAST(GREATEST(
          cos(radians(user_lat)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(user_lng)) + 
          sin(radians(user_lat)) * sin(radians(latitude))
        , -1.0), 1.0)
      )
    ) <= radius_km
  ORDER BY 
    -- Sort by nearest first
    (
      6371 * acos(
        LEAST(GREATEST(
          cos(radians(user_lat)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(user_lng)) + 
          sin(radians(user_lat)) * sin(radians(latitude))
        , -1.0), 1.0)
      )
    ) ASC;
END;
$$;

-- Grant execution to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_nearby_salons TO authenticated, anon;

SELECT '✅ 10 - Nearby Salons RPC created successfully!' as status;
