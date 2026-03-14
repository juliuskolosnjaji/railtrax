-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions for pg_cron (adjust as needed for your setup)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule poll-delays to run every 5 minutes
-- Note: You'll need to run this with proper SUPABASE_URL and ANON_KEY values
-- after deployment, or use the Supabase dashboard to set up the cron job

-- This is a template - actual scheduling happens via Supabase UI or API
-- SELECT cron.schedule('poll-delays', '*/5 * * * *',
--   $$SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/poll-delays',
--     headers := '{"Authorization": "Bearer your-anon-key"}'::jsonb) AS request_id;$$);
