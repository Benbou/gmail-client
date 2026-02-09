-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions to execute cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Note: The cron_secret must be created manually via Supabase Dashboard
-- SQL Editor with the following command (DO NOT commit secrets to Git):
--
-- SELECT vault.create_secret('YOUR_CRON_SECRET_HERE', 'cron_secret');
--
-- Use the same secret as CRON_SECRET in Vercel environment variables.

-- Job 1: Gmail sync (every 2 minutes)
-- Syncs emails from all connected Gmail accounts
SELECT cron.schedule(
  'gmail-sync',
  '*/2 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://gmail-client-xi-lemon.vercel.app/api/workers/sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_secret')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Job 2: Token refresh (every 5 minutes)
-- Refreshes OAuth tokens that are close to expiration
SELECT cron.schedule(
  'token-refresh',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://gmail-client-xi-lemon.vercel.app/api/workers/refresh-tokens',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_secret')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Job 3: Scheduled actions (every 1 minute)
-- Processes scheduled email actions (snooze, send later, etc.)
SELECT cron.schedule(
  'scheduled-actions',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://gmail-client-xi-lemon.vercel.app/api/workers/scheduled-actions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_secret')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Verify cron jobs were created successfully
-- Run this query to check:
-- SELECT jobid, jobname, schedule, command FROM cron.job;
