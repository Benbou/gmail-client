# Quick Start Guide - Railway-Free Deployment

## TL;DR: Deploy in 15 Minutes

This Gmail client now runs **100% free** on Vercel + Cloudflare.

**Prerequisites**: Vercel account, Cloudflare account, Google OAuth credentials

---

## Step 1: Generate Secrets (2 min)

```bash
# Generate encryption key
openssl rand -hex 32
# Save this as ENCRYPTION_KEY

# Generate cron secret
openssl rand -base64 32
# Save this as CRON_SECRET
```

---

## Step 2: Deploy to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com)
2. Import `Benbou/gmail-client` from GitHub
3. Click Deploy (will fail - that's OK)
4. Go to Settings > Environment Variables
5. Add these variables:

```bash
# Frontend
VITE_API_URL=/api
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG14eHdjdmN2c2x6bmRlbXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjA4MTEsImV4cCI6MjA4NDMzNjgxMX0.fHhgzw8HYdL7BX_FL8jobnTBZREa_lX3VnHrOj5rR1I

# Backend
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=<your-service-key>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://<your-app>.vercel.app/api/auth/google/callback
ENCRYPTION_KEY=<from-step-1>
CRON_SECRET=<from-step-1>
FRONTEND_URL=https://<your-app>.vercel.app
NODE_ENV=production
```

6. Click "Redeploy" at the top
7. Wait for deployment (2-3 min)
8. Note your Vercel URL

---

## Step 3: Update Google OAuth (2 min)

[Google Cloud Console](https://console.cloud.google.com) > Credentials:

**Add redirect URIs**:
```
https://<your-app>.vercel.app/api/auth/google/callback
https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback
```

---

## Step 4: Update Supabase (1 min)

Supabase Dashboard > Authentication > URL Configuration:

**Site URL**: `https://<your-app>.vercel.app`
**Redirect URLs**: `https://<your-app>.vercel.app/**`

---

## Step 5: Deploy Cloudflare Worker (5 min)

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Update config
cd cloudflare-worker
nano wrangler.toml
# Change API_URL to your Vercel URL

# Install and deploy
npm install
npm run secret:cron
# Paste your CRON_SECRET from Step 1
npm run deploy
```

---

## Step 6: Test (2 min)

1. Visit `https://<your-app>.vercel.app`
2. Click "Sign in with Google"
3. Login
4. Click "Connect Gmail"
5. Wait 2-5 min
6. Check inbox for emails

**Done! You now have a $0/month Gmail client** 🎉

---

## Troubleshooting

**404 on homepage**: Wait 2-3 min for Vercel to propagate

**Blank page**: Check browser console (F12) for errors

**OAuth fails**: Verify redirect URIs match exactly

**No emails syncing**: Check Cloudflare Dashboard > Workers > Logs

---

## Full Documentation

- **Complete guide**: [VERCEL_MIGRATION_GUIDE.md](./VERCEL_MIGRATION_GUIDE.md)
- **Architecture details**: [MIGRATION_STATUS.md](./MIGRATION_STATUS.md)
- **Troubleshooting**: [VERCEL_MIGRATION_GUIDE.md](./VERCEL_MIGRATION_GUIDE.md#troubleshooting)

---

## Cost

**Total: $0/month** (Vercel Free + Cloudflare Free + Supabase Free)
