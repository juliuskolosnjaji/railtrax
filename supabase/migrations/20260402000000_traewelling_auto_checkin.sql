-- Add auto check-in preference for Träwelling integration.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS traewelling_auto_checkin BOOLEAN NOT NULL DEFAULT false;
