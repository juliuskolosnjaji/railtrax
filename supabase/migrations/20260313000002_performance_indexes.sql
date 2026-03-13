-- Performance indexes for common query patterns
-- Run this in the Supabase SQL editor, or it will be applied by `prisma db push`.

-- trips: dashboard list (filter by user + status, sort by most recent)
CREATE INDEX IF NOT EXISTS idx_trips_user_status_created
  ON trips (user_id, status, created_at DESC);

-- legs: trip detail page (all legs for a trip, ordered by departure)
CREATE INDEX IF NOT EXISTS idx_legs_trip_departure
  ON legs (trip_id, planned_departure);

-- legs: delay poller edge function (upcoming active legs across all users)
CREATE INDEX IF NOT EXISTS idx_legs_status_departure
  ON legs (status, planned_departure);
