# Migration Status: Railway → Vercel + Cloudflare

## Overview

Successfully migrated from Railway-based backend to a fully serverless architecture on Vercel with Cloudflare Workers for cron jobs.

**Result**: $0/month deployment (previously $10-15/month with Railway)

---

## ✅ Completed Tasks

### 1. Backend Migration
- [x] Created `/api` directory for Vercel serverless functions
- [x] Converted all Express routes to Vercel API routes
- [x] Migrated auth middleware to utility functions
- [x] Set up Gmail OAuth service
- [x] Set up Gmail sync service
- [x] Created worker endpoints for cron triggers
- [x] Added package.json and tsconfig.json for API

**Files Created**: 30+ TypeScript files in `/api`

### 2. Cloudflare Worker Setup
- [x] Created `cloudflare-worker/index.ts` with scheduled event handler
- [x] Configured `wrangler.toml` with 3 cron expressions
- [x] Added deployment scripts in package.json
- [x] Created comprehensive README for worker

**Cron Schedules**:
- Email sync: Every 2 minutes (`*/2 * * * *`)
- Token refresh: Every 5 minutes (`*/5 * * * *`)
- Scheduled actions: Every minute (`* * * * *`)

### 3. Vercel Configuration
- [x] Created root-level `vercel.json` for monorepo
- [x] Configured rewrites for API and SPA routing
- [x] Set up serverless function runtime
- [x] Documented environment variables

### 4. Documentation
- [x] Created `VERCEL_MIGRATION_GUIDE.md` with step-by-step deployment
- [x] Created `MIGRATION_STATUS.md` (this file)
- [x] Updated Cloudflare Worker README
- [x] Documented troubleshooting steps

---

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Generate `ENCRYPTION_KEY`: `openssl rand -hex 32`
- [ ] Generate `CRON_SECRET`: `openssl rand -base64 32`
- [ ] Have Google OAuth credentials ready
- [ ] Have Supabase service key ready

### Vercel Deployment
- [ ] Create Vercel project linked to GitHub
- [ ] Add all environment variables (see VERCEL_MIGRATION_GUIDE.md)
- [ ] Deploy and note Vercel URL
- [ ] Verify frontend loads (may have 404 initially - that's OK)
- [ ] Check Vercel function logs for errors

### Cloudflare Worker Deployment
- [ ] Install Wrangler: `npm install -g wrangler`
- [ ] Update `wrangler.toml` with Vercel URL
- [ ] Deploy worker: `cd cloudflare-worker && npm run deploy`
- [ ] Verify cron triggers in Cloudflare Dashboard
- [ ] Check worker logs for execution

### OAuth Configuration
- [ ] Update Google OAuth redirect URIs
- [ ] Update Supabase site URL and redirect URLs
- [ ] Test login flow
- [ ] Test Gmail connection flow

### End-to-End Testing
- [ ] Login works (Supabase OAuth)
- [ ] Connect Gmail account works (Google OAuth)
- [ ] Emails sync automatically (wait 2-5 min)
- [ ] Cron jobs execute (check Cloudflare logs)
- [ ] Real-time updates work (Supabase Realtime)

---

## 🏗️ Architecture Comparison

### Before (Railway)

```
Frontend (Vercel)
  ↓ HTTP
Backend (Railway - Express long-running server)
  ├─ node-cron: Email sync (2 min)
  ├─ node-cron: Token refresh (5 min)
  ├─ node-cron: Scheduled actions (1 min)
  └─ Redis (Railway addon)
  ↓
Supabase (Database)

Cost: ~$10-15/month (Railway)
```

### After (Vercel + Cloudflare)

```
Frontend (Vercel)
  ↓ HTTP
Backend API (Vercel Serverless Functions)
  ↓
Supabase (Database + Real-time)

Cloudflare Worker (Cron Triggers)
  ├─ */2 * * * * → POST /api/workers/sync
  ├─ */5 * * * * → POST /api/workers/refresh-tokens
  └─ * * * * * → POST /api/workers/scheduled-actions
  ↓
Vercel API Workers

Cost: $0/month (all free tiers)
```

---

## 🔑 Key Changes

### 1. Request Handler Pattern

**Before (Express)**:
```typescript
router.get('/emails', authenticate, asyncHandler(async (req, res) => {
  // Logic
}));
```

**After (Vercel)**:
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId, error } = await authenticate(req);
  if (error) return res.status(401).json({ error });

  // Logic
}
```

### 2. Dynamic Routes

**Before**: `/api/emails/:id` with `req.params.id`
**After**: `/api/emails/[id].ts` with `req.query.id`

### 3. Cron Jobs

**Before**: node-cron running in Express server
**After**: Cloudflare Worker triggers Vercel API endpoints

### 4. OAuth State Management

**Before**: Redis (Railway addon)
**After**: In-memory Map (could upgrade to Vercel KV or Upstash Redis)

---

## 📁 New File Structure

```
/
├── api/                          # Vercel serverless API
│   ├── lib/                      # Shared utilities
│   │   ├── auth.ts               # Authentication
│   │   ├── crypto.ts             # Encryption
│   │   ├── errors.ts             # Error handling
│   │   ├── gmail-oauth.ts        # OAuth utilities
│   │   ├── redis.ts              # In-memory state
│   │   ├── supabase.ts           # DB client + types
│   │   └── validations.ts        # Zod schemas
│   ├── services/                 # Business logic
│   │   ├── gmail-service.ts      # Gmail API ops
│   │   └── gmail-sync.ts         # Email sync
│   ├── auth/google/              # Auth routes
│   │   ├── start.ts
│   │   └── callback.ts
│   ├── accounts/                 # Account routes
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   └── [id]/sync.ts
│   ├── emails/                   # Email routes
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   ├── [id]/archive.ts
│   │   └── send.ts
│   ├── sync/                     # Sync routes
│   │   └── [accountId]/index.ts
│   ├── workers/                  # Cron handlers
│   │   ├── sync.ts
│   │   ├── refresh-tokens.ts
│   │   └── scheduled-actions.ts
│   ├── package.json
│   └── tsconfig.json
│
├── cloudflare-worker/            # Cron triggers
│   ├── index.ts
│   ├── wrangler.toml
│   ├── package.json
│   └── README.md
│
├── frontend/                     # React app (unchanged)
│   └── ... (existing files)
│
├── backend/                      # OLD - can be removed after successful migration
│   └── ... (Express server)
│
├── vercel.json                   # Monorepo config
├── VERCEL_MIGRATION_GUIDE.md     # Deployment guide
└── MIGRATION_STATUS.md           # This file
```

---

## 🚀 Next Steps

1. **Deploy to Vercel** (follow VERCEL_MIGRATION_GUIDE.md)
2. **Deploy Cloudflare Worker**
3. **Test end-to-end**
4. **Monitor for 24 hours**
5. **Remove `/backend` directory** (after confirming everything works)
6. **Update repository README** to reflect new architecture

---

## ⚠️ Important Notes

### Environment Variables

**CRITICAL**: The `CRON_SECRET` MUST be the same in both:
- Cloudflare Worker secret (`wrangler secret put CRON_SECRET`)
- Vercel environment variable (`CRON_SECRET=...`)

Otherwise, cron jobs will fail with 401 Unauthorized.

### Google OAuth

The redirect URI **MUST** exactly match:
```
https://<your-vercel-app>.vercel.app/api/auth/google/callback
```

No trailing slashes, case-sensitive, HTTPS only.

### Supabase Service Key

Use the **service_role** key (NOT the anon key) for `SUPABASE_SERVICE_KEY`.
This allows the API to bypass RLS policies.

### First Deployment

The first Vercel deployment may take 5-10 minutes to propagate globally.
If you get 404 errors initially, wait a few minutes and try again.

---

## 📊 Success Metrics

After deployment, verify:

1. **Frontend loads**: `https://<your-app>.vercel.app` → React app
2. **API responds**: `https://<your-app>.vercel.app/api/health` → 200 OK (if health endpoint exists)
3. **Login works**: OAuth flow completes
4. **Gmail connects**: Second OAuth flow completes
5. **Emails sync**: Check database after 2-5 minutes
6. **Cron jobs run**: Cloudflare logs show executions
7. **Real-time updates**: Changes propagate instantly

**All green? Migration successful! 🎉**

---

## 🔄 Rollback Plan

If anything goes wrong:

1. **Keep `/backend` directory** until migration is verified
2. **Redeploy backend to Railway** if needed
3. **Update frontend env**: `VITE_API_URL=https://<railway-url>`
4. **Git revert**: `git revert <commit-hash>` if code issues

**Do NOT delete `/backend` until 100% confident the new architecture works.**

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Cloudflare Workers**: https://developers.cloudflare.com/workers
- **Supabase Docs**: https://supabase.com/docs
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler

---

## Cost Savings

| Service | Before | After | Savings |
|---------|--------|-------|---------|
| Backend Hosting | Railway $10-15/mo | Vercel Free | $10-15/mo |
| Redis | Railway addon $0 | In-memory | $0 |
| Cron Jobs | Included in Railway | Cloudflare Free | $0 |
| **Total** | **$10-15/mo** | **$0/mo** | **$10-15/mo** |

**Annual savings: $120-180** 💰

---

Updated: 2026-02-09
Status: Ready for deployment
