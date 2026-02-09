# Quick Start Guide - 2-Service Architecture

## TL;DR: Deploy in 10 Minutes

This Gmail client runs **100% free** on just 2 services:
- ☁️ **Vercel** (Frontend + API)
- 🗄️ **Supabase** (Database + Realtime + Cron)

**Prerequisites**: Vercel account, Supabase account, Google OAuth credentials

---

## Step 1: Generate Secrets (2 min)

```bash
# Generate encryption key
openssl rand -hex 32
# Save this as ENCRYPTION_KEY

# Generate cron secret
openssl rand -base64 32
# Save this as CRON_SECRET

# Generate JWT secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
```

---

## Step 2: Setup Supabase (3 min)

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Apply database migrations**:
   ```bash
   # Link to your project
   supabase link --project-ref <your-project-ref>

   # Push migrations
   supabase db push
   ```

3. **Setup pg_cron jobs** (see [SUPABASE_CRON_SETUP.md](./SUPABASE_CRON_SETUP.md)):
   - Go to Supabase Dashboard → SQL Editor
   - Run:
   ```sql
   SELECT vault.create_secret('YOUR_CRON_SECRET', 'cron_secret');
   ```
   - The migration already created the 3 cron jobs

4. **Get your credentials**:
   - **SUPABASE_URL**: Project Settings → API → Project URL
   - **SUPABASE_ANON_KEY**: Project Settings → API → anon public
   - **SUPABASE_SERVICE_KEY**: Project Settings → API → service_role (⚠️ secret)

---

## Step 3: Deploy to Vercel (5 min)

1. **Import from GitHub**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import `Benbou/gmail-client` (or your fork)
   - Click Deploy (will fail initially - that's OK)

2. **Add environment variables**:
   - Go to Settings → Environment Variables
   - Add the following:

```bash
# Frontend
VITE_API_URL=/api
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Backend
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://<your-app>.vercel.app/api/auth/google/callback
ENCRYPTION_KEY=<from-step-1>
CRON_SECRET=<from-step-1>
JWT_SECRET=<from-step-1>
JWT_REFRESH_SECRET=<from-step-1>
FRONTEND_URL=https://<your-app>.vercel.app
NODE_ENV=production
LOG_LEVEL=info
```

3. **Redeploy**:
   - Click "Deployments" → "..." → "Redeploy"
   - Wait 2-3 minutes
   - Copy your Vercel URL (e.g., `https://gmail-client-xi-lemon.vercel.app`)

---

## Step 4: Update Cron Job URLs (2 min)

**Important**: Update the Vercel URL in the migration file.

1. Open `supabase/migrations/20260209_001_setup_cron_jobs.sql`
2. Replace `https://gmail-client-xi-lemon.vercel.app` with your actual Vercel URL
3. Re-run the migration OR manually update the jobs:

```sql
-- Delete old jobs
SELECT cron.unschedule('gmail-sync');
SELECT cron.unschedule('token-refresh');
SELECT cron.unschedule('scheduled-actions');

-- Recreate with correct URL (copy from migration file)
-- See SUPABASE_CRON_SETUP.md for full commands
```

---

## Step 5: Update Google OAuth (1 min)

Go to [Google Cloud Console](https://console.cloud.google.com) → Credentials:

**Add authorized redirect URIs**:
```
https://<your-app>.vercel.app/api/auth/google/callback
https://<your-supabase-url>/auth/v1/callback
```

Example:
```
https://gmail-client-xi-lemon.vercel.app/api/auth/google/callback
https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback
```

---

## Step 6: Update Supabase Site URL (1 min)

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs**: `https://<your-app>.vercel.app/**`

---

## Step 7: Test (2 min)

1. Visit `https://<your-app>.vercel.app`
2. Click "Sign in with Google"
3. Login with your credentials
4. Click "Connect Gmail"
5. Wait 2-5 minutes for first sync
6. Check inbox for emails

**Done! You now have a $0/month Gmail client** 🎉

---

## Verify Cron Jobs Are Working

Check Supabase Dashboard → SQL Editor:

```sql
-- View all cron jobs
SELECT jobid, jobname, schedule, active FROM cron.job;

-- View recent executions
SELECT jobname, status, start_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

You should see:
- ✅ `gmail-sync` running every 2 minutes
- ✅ `token-refresh` running every 5 minutes
- ✅ `scheduled-actions` running every 1 minute

---

## Troubleshooting

**404 on homepage**: Wait 2-3 min for Vercel deployment to propagate

**Blank page**: Check browser console (F12) for errors

**OAuth fails**: Verify redirect URIs match exactly in Google Cloud Console

**No emails syncing**:
- Check Supabase SQL Editor: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`
- Verify `CRON_SECRET` matches in both Vercel and Supabase Vault
- Check Vercel Functions logs for `/api/workers/sync`

**Cron jobs not running**:
- See [SUPABASE_CRON_SETUP.md](./SUPABASE_CRON_SETUP.md) for detailed debugging

---

## Full Documentation

- **Cron setup details**: [SUPABASE_CRON_SETUP.md](./SUPABASE_CRON_SETUP.md)
- **Environment variables**: [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
- **Migration guide**: [VERCEL_MIGRATION_GUIDE.md](./VERCEL_MIGRATION_GUIDE.md)
- **Architecture**: [MIGRATION_STATUS.md](./MIGRATION_STATUS.md)

---

## Cost

**Total: $0/month**

- ✅ Vercel Hobby Plan (Free)
- ✅ Supabase Free Tier (500MB database, unlimited API requests)

No credit card required for either service.

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│   Vercel (Free)                         │
│   ├── Frontend (React + Vite)           │
│   └── API (/api/*)                      │
│       └── /api/workers/* (cron handlers)│
└─────────────────────────────────────────┘
              ▲
              │ HTTP POST every 1-5 min
              │
┌─────────────────────────────────────────┐
│   Supabase (Free)                       │
│   ├── PostgreSQL (database)             │
│   ├── Realtime (live updates)           │
│   └── pg_cron (automated tasks)         │
│       ├── */2 * * * * → sync            │
│       ├── */5 * * * * → refresh-tokens  │
│       └── * * * * * → scheduled-actions │
└─────────────────────────────────────────┘
```

**2 services. 0 dollars. Simple.**
