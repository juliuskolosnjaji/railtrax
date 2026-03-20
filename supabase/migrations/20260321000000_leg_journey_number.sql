-- Add journey_number to legs table.
-- Stores the Fahrtnummer (e.g. "25444") fetched from bahn.expert,
-- cached so we only call the external API once per leg.
ALTER TABLE legs ADD COLUMN IF NOT EXISTS journey_number TEXT;
