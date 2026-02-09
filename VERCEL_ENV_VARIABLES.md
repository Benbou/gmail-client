# Vercel Environment Variables - Complete Checklist

This is the **definitive guide** for setting up all environment variables in Vercel. Follow this checklist to get a working deployment.

## 📋 Quick Checklist

Before deploying, you need:
- [ ] Google OAuth credentials (Client ID + Secret)
- [ ] Supabase project (URL + Anon Key + Service Key)
- [ ] Generated secrets (Encryption Key + Cron Secret + JWT Secrets)
- [ ] Vercel deployment URL (will get after first deploy)

---

## Step 1: Generate Secrets

Run these commands locally and **save the outputs**:

```bash
# Encryption key (for storing OAuth tokens)
openssl rand -hex 32

# Cron secret (for authenticating pg_cron → Vercel requests)
openssl rand -base64 32

# JWT secret (for user authentication)
openssl rand -base64 32

# JWT refresh secret (for refresh tokens)
openssl rand -base64 32
```

**Save these 4 values** - you'll need them in Step 3.

---

## Step 2: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://lfhmxxwcvcvslzndemzh.supabase.co`)
   - **anon public** key (starts with `eyJhbGc...`)
   - **service_role** key (⚠️ secret - starts with `eyJhbGc...`)

---

## Step 3: Add Variables to Vercel

Go to [Vercel Dashboard](https://vercel.com) → Your Project → **Settings** → **Environment Variables**

### Required for All Environments (Production, Preview, Development)

Copy-paste these **exactly as shown**, replacing values in `<brackets>`:

```bash
# ============================================
# FRONTEND VARIABLES (VITE_*)
# ============================================

VITE_API_URL=/api
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# ============================================
# BACKEND VARIABLES
# ============================================

# Supabase
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=<your-vercel-url>/api/auth/google/callback

# Security (generated in Step 1)
ENCRYPTION_KEY=<from-openssl-rand-hex-32>
CRON_SECRET=<from-openssl-rand-base64-32>
JWT_SECRET=<from-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<from-openssl-rand-base64-32>

# App Config
FRONTEND_URL=<your-vercel-url>
NODE_ENV=production
LOG_LEVEL=info

# Optional: Redis fallback (set to true to use in-memory instead of Redis)
USE_MEMORY_FALLBACK=true
```

---

## Step 4: Update After First Deployment

After your **first deployment**, Vercel will give you a URL like:
`https://gmail-client-xi-lemon.vercel.app`

You need to **update 2 variables**:

1. Go back to Vercel → Settings → Environment Variables
2. Update these 2 variables:
   - `GOOGLE_REDIRECT_URI` → `https://your-app.vercel.app/api/auth/google/callback`
   - `FRONTEND_URL` → `https://your-app.vercel.app`
3. Click **Save**
4. Go to **Deployments** → **Redeploy** (⚠️ important!)

---

## Step 5: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client
3. Add **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/google/callback
   https://your-supabase-url.supabase.co/auth/v1/callback
   ```
4. Save

---

## Step 6: Update Supabase Site URL

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`
3. Save

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Frontend loads at `https://your-app.vercel.app`
- [ ] No console errors (F12)
- [ ] "Sign in with Google" button works
- [ ] OAuth redirect completes successfully
- [ ] "Connect Gmail" button appears after login
- [ ] Gmail OAuth completes
- [ ] Emails sync after 2-5 minutes

If any step fails, check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## 🔒 Security Notes

### ⚠️ Never Commit These to Git

The following are **secrets** and should NEVER be committed:
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_CLIENT_SECRET`
- `ENCRYPTION_KEY`
- `CRON_SECRET`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

These should **only** exist in:
- Vercel environment variables
- Your local `.env` file (which is gitignored)

### Public vs Secret Variables

**Public** (safe to expose):
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `GOOGLE_CLIENT_ID`

**Secret** (never expose):
- Everything else!

---

## 📝 Example Values (for reference)

Here's what the variables look like (with fake values):

```bash
# Frontend
VITE_API_URL=/api
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
GOOGLE_REDIRECT_URI=https://gmail-client-xi-lemon.vercel.app/api/auth/google/callback
ENCRYPTION_KEY=a1b2c3d4e5f6...
CRON_SECRET=abc123xyz789==
JWT_SECRET=def456uvw012==
JWT_REFRESH_SECRET=ghi789rst345==
FRONTEND_URL=https://gmail-client-xi-lemon.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

---

## 🚨 Common Mistakes

### 1. Forgetting to Redeploy After Updating Variables

Vercel doesn't auto-redeploy when you change environment variables. Always:
1. Change variables
2. Go to Deployments → Redeploy

### 2. GOOGLE_REDIRECT_URI Mismatch

Must be **exactly**:
```
https://your-app.vercel.app/api/auth/google/callback
```

Not:
- ❌ `https://your-app.vercel.app/api/auth/google/callback/` (trailing slash)
- ❌ `http://your-app.vercel.app/api/auth/google/callback` (http instead of https)
- ❌ Different domain

### 3. Using Anon Key Instead of Service Key

`SUPABASE_SERVICE_KEY` must be the **service_role** key, not the anon key!

### 4. Mixing Up Frontend/Backend Variables

- Frontend variables **MUST** start with `VITE_`
- Backend variables **must NOT** start with `VITE_`

---

## 🔄 Updating Variables

If you need to change a variable:

1. Go to Vercel → Settings → Environment Variables
2. Find the variable
3. Click **Edit**
4. Update value
5. **Save**
6. Go to **Deployments** → Click **...** → **Redeploy**

Changes only take effect **after redeployment**.

---

## 📞 Help

If you get stuck:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Check Vercel function logs: Vercel Dashboard → Functions
- Check browser console: F12 → Console tab
- Check Supabase logs: Supabase Dashboard → Logs

---

**Last updated**: 2026-02-09
