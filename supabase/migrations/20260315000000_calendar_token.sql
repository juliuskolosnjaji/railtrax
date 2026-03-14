-- Add calendar_token field to users table for iCal feed generation
ALTER TABLE users ADD COLUMN calendar_token uuid UNIQUE DEFAULT gen_random_uuid();