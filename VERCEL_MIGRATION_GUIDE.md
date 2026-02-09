# Vercel Deployment Guide (Railway-Free Architecture)

This guide helps you deploy the Gmail Client on Vercel with Cloudflare Workers for cron jobs.

## 🏗️ Architecture

- **Frontend**: Vercel (React + Vite)
- **Backend API**: Vercel Serverless Functions
- **Cron Jobs**: Cloudflare Workers (FREE)
- **Database**: Supabase PostgreSQL
- **Real-time**: Supabase Realtime

**Cost: $0/month** (all free tiers)

---

## Prerequisites

1. **Vercel Account**: [vercel.com](https://vercel.com)
2. **Cloudflare Account**: [cloudflare.com](https://cloudflare.com)
3. **Wrangler CLI**: `npm install -g wrangler`
4. **Environment Variables Ready**:
   - Google OAuth credentials
   - Supabase URL and keys
   - Generate encryption key: `openssl rand -hex 32`
   - Generate cron secret: `openssl rand -base64 32`

---

## Step 1: Deploy to Vercel

### 1.1 Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" > "Project"
3. Import your GitHub repository: `Benbou/gmail-client`
4. **Framework Preset**: Vite
5. **Root Directory**: Leave as `.` (monorepo)
6. Click "Deploy"

### 1.2 Configure Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

#### Frontend Variables (VITE_*)

```bash
VITE_API_URL=/api
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG14eHdjdmN2c2x6bmRlbXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjA4MTEsImV4cCI6MjA4NDMzNjgxMX0.fHhgzw8HYdL7BX_FL8jobnTBZREa_lX3VnHrOj5rR1I
```

#### Backend API Variables

```bash
# Supabase
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://<your-app>.vercel.app/api/auth/google/callback

# Security
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
CRON_SECRET=<generate-with-openssl-rand-base64-32>

# App Config
FRONTEND_URL=https://<your-app>.vercel.app
NODE_ENV=production
```

**IMPORTANT**: Replace `<your-app>` with your actual Vercel domain.

---

## Step 2: Deploy Cloudflare Worker

### 2.1 Install and Deploy

```bash
cd cloudflare-worker
npm install
wrangler login
npm run secret:cron  # Paste CRON_SECRET (same as Vercel)
npm run deploy
```

### 2.2 Update wrangler.toml

Edit `cloudflare-worker/wrangler.toml`:

```toml
[vars]
API_URL = "https://<your-app>.vercel.app"
```

---

## Step 3: Configure OAuth

### 3.1 Google Cloud Console

**Authorized redirect URIs**:
```
https://<your-app>.vercel.app/api/auth/google/callback
https://lfhmxxwcvcvslzndemzh.supabase.co/auth/v1/callback
```

### 3.2 Supabase

**Site URL**: `https://<your-app>.vercel.app`
**Redirect URLs**: `https://<your-app>.vercel.app/**`

---

## Testing

1. Visit `https://<your-app>.vercel.app`
2. Login with Google
3. Connect Gmail account
4. Wait 2-5 min for sync
5. Check Cloudflare Worker logs for cron execution

---

## Troubleshooting

See full guide in repository for detailed troubleshooting steps.
