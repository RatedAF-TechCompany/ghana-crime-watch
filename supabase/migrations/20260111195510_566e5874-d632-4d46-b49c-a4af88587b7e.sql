-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the hourly newsroom scan cron job
SELECT cron.schedule(
  'newsroom-hourly-scan',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://zninjnjujptjxdikehun.supabase.co/functions/v1/newsroom-scheduled',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"triggerType": "scheduled"}'::jsonb
  )$$
);