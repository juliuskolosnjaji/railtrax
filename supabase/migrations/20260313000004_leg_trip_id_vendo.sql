-- Add trip_id_vendo to legs table.
-- Stores the Vendo/HAFAS trip ID so the polyline fetcher can call
-- client.trip() directly instead of re-scanning the departure board.
ALTER TABLE legs ADD COLUMN IF NOT EXISTS trip_id_vendo TEXT;
