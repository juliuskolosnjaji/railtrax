-- SQL to backfill distance_km for existing legs with coordinates
-- Run this in Supabase SQL Editor to fix all existing legs at once

UPDATE legs
SET distance_km = (
  ROUND(
    2 * 6371 * ASIN(
      SQRT(
        POWER(SIN((RADIANS(dest_lat) - RADIANS(origin_lat)) / 2), 2) +
        COS(RADIANS(origin_lat)) * COS(RADIANS(dest_lat)) *
        POWER(SIN((RADIANS(dest_lon) - RADIANS(origin_lon)) / 2), 2)
      )
    ) * 10
  ) / 10
)
WHERE origin_lat IS NOT NULL 
  AND origin_lon IS NOT NULL
  AND dest_lat IS NOT NULL
  AND dest_lon IS NOT NULL
  AND distance_km IS NULL;

-- Check how many legs were updated
SELECT COUNT(*) as updated_legs FROM legs 
WHERE distance_km IS NOT NULL 
  AND origin_lat IS NOT NULL 
  AND dest_lat IS NOT NULL;

-- Verify some examples
SELECT 
  origin_name,
  dest_name, 
  origin_lat,
  origin_lon,
  dest_lat,
  dest_lon,
  distance_km,
  ROUND(
    2 * 6371 * ASIN(
      SQRT(
        POWER(SIN((RADIANS(dest_lat) - RADIANS(origin_lat)) / 2), 2) +
        COS(RADIANS(origin_lat)) * COS(RADIANS(dest_lat)) *
        POWER(SIN((RADIANS(dest_lon) - RADIANS(origin_lon)) / 2), 2)
      )
    ) * 10
  ) / 10 as calculated_distance
FROM legs 
WHERE distance_km IS NOT NULL 
  AND origin_lat IS NOT NULL 
  LIMIT 5;