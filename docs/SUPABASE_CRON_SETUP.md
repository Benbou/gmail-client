# Supabase pg_cron Setup Guide

This guide walks you through setting up automated cron jobs using Supabase pg_cron to replace Cloudflare Worker.

## Prerequisites

- Supabase project created
- Vercel deployment URL (e.g., `https://gmail-client-xi-lemon.vercel.app`)
- `CRON_SECRET` environment variable set in Vercel

## Step 1: Apply the Migration

### Option A: Using Supabase CLI

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref <your-project-ref>

# Push the migration
supabase db push
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/20260209_001_setup_cron_jobs.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press `Cmd+Enter`)

## Step 2: Create the Cron Secret in Vault

**IMPORTANT:** Use the **same secret** as your `CRON_SECRET` in Vercel environment variables.

### Get Your CRON_SECRET from Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Copy the value of `CRON_SECRET`
3. If it doesn't exist, generate a random secret:
   ```bash
   openssl rand -base64 32
   ```
4. Add it to Vercel environment variables as `CRON_SECRET`

### Store the Secret in Supabase Vault

1. Go to Supabase Dashboard → SQL Editor
2. Run the following command (replace with your actual secret):

```sql
SELECT vault.create_secret('YOUR_CRON_SECRET_HERE', 'cron_secret');
```

Example:
```sql
SELECT vault.create_secret('abc123xyz789secretkey', 'cron_secret');
```

### Verify the Secret Was Created

```sql
SELECT name FROM vault.decrypted_secrets WHERE name = 'cron_secret';
```

You should see:
```
 name
-------------
 cron_secret
(1 row)
```

## Step 3: Verify Cron Jobs Are Active

### Check All Cron Jobs

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job;
```

You should see 3 jobs:
- `gmail-sync` (schedule: `*/2 * * * *`)
- `token-refresh` (schedule: `*/5 * * * *`)
- `scheduled-actions` (schedule: `* * * * *`)

### View Recent Job Executions

```sql
SELECT jobname, status, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Check for Failed Jobs

```sql
SELECT jobname, status, start_time, return_message
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

## Step 4: Test a Job Manually

You can trigger a job manually to verify everything works:

```sql
-- Create a temporary test job that runs in the next minute
SELECT cron.schedule(
  'test-sync',
  '* * * * *',
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
```

Wait 1-2 minutes, then check the results:

```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'test-sync'
ORDER BY start_time DESC
LIMIT 1;
```

Remove the test job:

```sql
SELECT cron.unschedule('test-sync');
```

## Step 5: Verify in Vercel Logs

1. Go to Vercel Dashboard → Your Project → Functions
2. Filter by `/api/workers/sync`
3. You should see requests coming in every 2 minutes
4. Check that responses are `200 OK`

## Step 6: Verify Email Sync Is Working

After 5-10 minutes, check that emails are being synced:

```sql
-- Check total email count
SELECT COUNT(*) FROM emails;

-- Check recent sync logs
SELECT * FROM sync_logs
ORDER BY created_at DESC
LIMIT 5;

-- Check emails synced in the last hour
SELECT COUNT(*) FROM emails
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Troubleshooting

### Jobs Not Running

**Check if extensions are enabled:**
```sql
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

Both should be listed. If not:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Authentication Errors (401)

**Verify the secret matches:**
1. Check Vercel `CRON_SECRET`: Vercel Dashboard → Settings → Environment Variables
2. Check Supabase secret:
   ```sql
   SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_secret';
   ```
3. They must be **identical**

**Update the secret if needed:**
```sql
-- Delete old secret
SELECT vault.delete_secret('cron_secret');

-- Create new secret
SELECT vault.create_secret('NEW_SECRET_HERE', 'cron_secret');
```

### Jobs Not Showing in job_run_details

Wait 1-2 minutes after creating jobs. pg_cron executes jobs on the schedule.

### Network Errors

**Check the URL in the migration:**
1. Open `supabase/migrations/20260209_001_setup_cron_jobs.sql`
2. Verify the URL matches your Vercel deployment
3. If you changed the URL, you need to recreate the jobs:

```sql
-- Delete old jobs
SELECT cron.unschedule('gmail-sync');
SELECT cron.unschedule('token-refresh');
SELECT cron.unschedule('scheduled-actions');

-- Re-run the migration with the correct URL
```

## Monitoring

### Daily Health Check

Run this query to monitor job health:

```sql
WITH recent_runs AS (
  SELECT
    jobname,
    status,
    COUNT(*) as run_count,
    MAX(start_time) as last_run
  FROM cron.job_run_details
  WHERE start_time > NOW() - INTERVAL '1 hour'
  GROUP BY jobname, status
)
SELECT * FROM recent_runs
ORDER BY jobname, status;
```

Expected output (after 1 hour):
- `gmail-sync`: ~30 runs (every 2 min)
- `token-refresh`: ~12 runs (every 5 min)
- `scheduled-actions`: ~60 runs (every 1 min)

### Set Up Alerts (Optional)

Create a function to check for failed jobs:

```sql
CREATE OR REPLACE FUNCTION check_cron_health()
RETURNS TABLE(jobname text, failures bigint) AS $$
  SELECT jobname, COUNT(*) as failures
  FROM cron.job_run_details
  WHERE status = 'failed'
    AND start_time > NOW() - INTERVAL '1 hour'
  GROUP BY jobname
  HAVING COUNT(*) > 3
$$ LANGUAGE SQL;
```

Check for issues:
```sql
SELECT * FROM check_cron_health();
```

## Cleanup (If Migrating from Cloudflare)

If you previously used Cloudflare Worker:

1. **Disable the Cloudflare Worker:**
   - Go to Cloudflare Dashboard
   - Navigate to Workers & Pages
   - Delete the `gmail-client-cron` worker

2. **Remove local files:**
   ```bash
   rm -rf cloudflare-worker/
   ```

3. **Update documentation** to remove Cloudflare references

## Success Criteria

✅ Migration is complete when:

1. `SELECT * FROM cron.job;` shows 3 active jobs
2. Vercel logs show POST requests to `/api/workers/*` every 1-5 minutes
3. `SELECT COUNT(*) FROM emails;` increases over time
4. `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 1;` shows recent sync
5. No `cloudflare-worker/` directory exists
6. Stack uses only **2 services** (Vercel + Supabase)

## Cost

🎉 **$0/month** — 100% free on:
- Vercel Hobby plan
- Supabase Free tier

pg_cron is included in Supabase Free tier with no additional cost.
