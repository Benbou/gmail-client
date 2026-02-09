# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Status: ✅ Production-Ready

**Current State**: Fully deployed on Vercel + Supabase (2-service architecture)
- ☁️ Frontend + API on Vercel (serverless)
- 🗄️ Database + Cron on Supabase (PostgreSQL + pg_cron)
- 💰 Cost: $0/month (100% free tiers)

**Deployment**: https://gmail-client-xi-lemon.vercel.app

---

## Project Vision

A Gmail client with a **unified inbox** merging **2 Gmail accounts**. The UI follows the **Shadcn Mail example** pattern: a 3-panel resizable layout (sidebar, email list, email display) with an account switcher.

**Reference**: https://v3.shadcn.com/examples/mail

**Key Features**:
- Multi-account Gmail support (2+ accounts)
- Unified inbox (merge emails from all accounts)
- Email actions: archive, snooze, star, reply, forward
- Real-time sync via Supabase pg_cron (every 2 minutes)
- Rich text compose/reply with Tiptap
- Full-text search across emails

---

## Architecture (2-Service Stack)

```
┌─────────────────────────────────────────┐
│   Vercel (Free Tier)                    │
│   ├── Frontend (React 19 + Vite)        │
│   │   └── /frontend                     │
│   └── API (Serverless Functions)        │
│       └── /api                           │
│           ├── auth/google/*              │
│           ├── accounts/*                 │
│           ├── emails/*                   │
│           ├── sync/*                     │
│           └── workers/* (cron handlers)  │
└─────────────────────────────────────────┘
              ▲
              │ HTTP POST (every 1-5 min)
              │
┌─────────────────────────────────────────┐
│   Supabase (Free Tier)                  │
│   ├── PostgreSQL (database)             │
│   ├── Realtime (live updates)           │
│   └── pg_cron (scheduled tasks)         │
│       ├── */2 * * * * → /api/workers/sync│
│       ├── */5 * * * * → refresh-tokens  │
│       └── * * * * * → scheduled-actions │
└─────────────────────────────────────────┘
```

**No Redis, no Cloudflare, no Railway** — just Vercel + Supabase.

---

## Tech Stack

### Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite
- **Routing**: React Router v7 (routes in `App.tsx`)
- **State**: AuthContext (auth), React Query (server data), Zustand (client state)
- **API**: Axios (`src/lib/api.ts`) — auto Bearer token, 401 → login redirect
- **UI**: Tailwind CSS 4 + Shadcn UI (`src/components/ui/`)
- **Icons**: Lucide React
- **Rich text**: Tiptap editor
- **Path alias**: `@/*` → `./src/*`

### Backend (`/api` - Vercel Serverless)
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express-like handlers (Vercel API routes)
- **Gmail API**: googleapis (OAuth2 + Gmail API)
- **Database**: Supabase PostgreSQL client
- **Auth**: JWT (access 15min, refresh 7d) + blacklist
- **Security**: AES-256-GCM for OAuth tokens, Helmet, CORS, rate limiting
- **Validation**: Zod schemas
- **Logging**: Pino (JSON in prod)
- **Cron**: Supabase pg_cron → HTTP POST to `/api/workers/*`

### Database (Supabase PostgreSQL)
- **Schema**: `supabase/migrations/20250122_001_initial_schema.sql`
- **RLS**: `supabase/migrations/20250122_002_rls_policies.sql`
- **Cron**: `supabase/migrations/20260209_001_setup_cron_jobs.sql`
- **Tables**: users, gmail_accounts, emails, labels, scheduled_actions, drafts, sync_logs
- **Search**: Full-text index on emails (subject, body_text, from_email)
- **Extensions**: pg_cron, pg_net (for HTTP requests)

---

## Critical Files Reference

### Configuration
- `vercel.json` — Monorepo config (rewrites, functions runtime)
- `frontend/vite.config.ts` — Vite + React + path alias
- `api/tsconfig.json` — TypeScript config for API
- `supabase/migrations/*.sql` — Database schema + cron setup

### Frontend Entry Points
- `frontend/src/main.tsx` — App entry
- `frontend/src/App.tsx` — Router + routes
- `frontend/src/lib/api.ts` — Axios client (Bearer token injection)
- `frontend/src/contexts/AuthContext.tsx` — Auth state

### API Entry Points
- `api/index.ts` — Main API handler (routes all `/api/*`)
- `api/lib/auth.ts` — JWT validation + user extraction
- `api/lib/supabase.ts` — Supabase client + types
- `api/services/gmail-sync.ts` — Email sync logic
- `api/workers/*.ts` — Cron job handlers

### Documentation (Read These First)
- `README.md` — Project overview
- `QUICK_START.md` — Deployment guide (2-service setup)
- `VERCEL_ENV_VARIABLES.md` — Complete env var checklist
- `SUPABASE_CRON_SETUP.md` — pg_cron setup guide
- `MIGRATION_STATUS.md` — Architecture history + diagrams

---

## Development Commands

### Local Development

```bash
# Frontend dev server
cd frontend
npm install
npm run dev        # http://localhost:5173

# API local testing (Vercel CLI)
vercel dev         # http://localhost:3000

# Database migrations
supabase link --project-ref <ref>
supabase db push
```

### Deployment

```bash
# Deploy to Vercel
vercel deploy                    # Preview
vercel deploy --prod             # Production

# After deployment, update:
# 1. Vercel env vars (FRONTEND_URL, GOOGLE_REDIRECT_URI)
# 2. Google OAuth redirect URIs
# 3. Supabase site URL
# 4. Supabase pg_cron job URLs
```

See `QUICK_START.md` for full deployment steps.

---

## Environment Variables

**Complete checklist**: See `VERCEL_ENV_VARIABLES.md`

### Required for Vercel

**Frontend** (public):
```bash
VITE_API_URL=/api
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Backend** (secret):
```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
ENCRYPTION_KEY=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -base64 32>
JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

**CRITICAL**: After deployment, update `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` with your actual Vercel URL, then **redeploy**.

---

## Automated Tasks (Supabase pg_cron)

**Migration**: `supabase/migrations/20260209_001_setup_cron_jobs.sql`

**Cron Jobs** (managed by Supabase PostgreSQL):

1. **Email Sync** (`*/2 * * * *` — every 2 minutes)
   - POST to `/api/workers/sync`
   - Syncs emails from all connected Gmail accounts
   - Uses Gmail API delta sync (incremental)

2. **Token Refresh** (`*/5 * * * *` — every 5 minutes)
   - POST to `/api/workers/refresh-tokens`
   - Refreshes OAuth tokens close to expiration

3. **Scheduled Actions** (`* * * * *` — every minute)
   - POST to `/api/workers/scheduled-actions`
   - Processes scheduled emails (snooze, send later)

**Setup**: See `SUPABASE_CRON_SETUP.md`

**Authentication**: Jobs authenticate with `Authorization: Bearer <CRON_SECRET>` (stored in Supabase Vault)

**Monitoring**:
```sql
-- View jobs
SELECT * FROM cron.job;

-- View executions
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 10;
```

---

## Authentication Flow

### User Auth (Supabase)
1. Frontend: `POST /api/auth/signup` → JWT tokens (access 15min, refresh 7d)
2. Frontend stores tokens in localStorage
3. Axios auto-injects `Authorization: Bearer <token>` on all requests
4. Backend validates JWT, extracts `userId`

### Gmail OAuth (Google)
1. User: "Connect Gmail" → `GET /api/auth/google/start`
2. Backend: Redirect to Google OAuth consent
3. Google: Redirect to `/api/auth/google/callback?code=...`
4. Backend: Exchange code for access + refresh tokens
5. Backend: Encrypt tokens (AES-256-GCM) → store in `gmail_accounts` table
6. User can connect up to 2 Gmail accounts

**Security**: OAuth tokens are **never** exposed to frontend. Backend decrypts on-demand for Gmail API calls.

---

## API Endpoints

### Auth
- `POST /api/auth/signup` — Create user
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Blacklist token
- `GET /api/auth/google/start` — Start Gmail OAuth
- `GET /api/auth/google/callback` — Gmail OAuth callback

### Accounts
- `GET /api/accounts` — List connected Gmail accounts
- `DELETE /api/accounts/:id` — Disconnect account

### Emails
- `GET /api/emails` — List emails (supports `?account_id=` for single account)
- `GET /api/emails/:id` — Get email details
- `POST /api/emails/send` — Send email
- `PATCH /api/emails/:id/archive` — Archive email
- `PATCH /api/emails/:id/star` — Star/unstar
- `PATCH /api/emails/:id/read` — Mark read/unread

### Sync
- `POST /api/sync/:accountId` — Trigger manual sync

### Workers (Cron)
- `POST /api/workers/sync` — Email sync (called by pg_cron)
- `POST /api/workers/refresh-tokens` — Token refresh (called by pg_cron)
- `POST /api/workers/scheduled-actions` — Scheduled actions (called by pg_cron)

All worker endpoints require `Authorization: Bearer <CRON_SECRET>`.

---

## Database Schema

**Full schema**: `supabase/migrations/20250122_001_initial_schema.sql`

### Key Tables

**users**
- `id` (uuid, primary key)
- `email` (unique)
- `password_hash`
- `created_at`, `updated_at`

**gmail_accounts**
- `id` (uuid, primary key)
- `user_id` (foreign key → users)
- `email` (Gmail account email)
- `access_token_encrypted` (AES-256-GCM)
- `refresh_token_encrypted`
- `token_expires_at`
- `last_sync_at`, `last_history_id`

**emails**
- `id` (uuid, primary key)
- `account_id` (foreign key → gmail_accounts)
- `gmail_id` (Gmail message ID)
- `thread_id`
- `from_email`, `from_name`, `to_email`, `subject`
- `body_html`, `body_text`, `snippet`
- `date`, `is_read`, `is_starred`, `labels`
- Full-text search index on (subject, body_text, from_email)

**labels**
- `id`, `account_id`, `gmail_label_id`, `name`, `type`

**scheduled_actions**
- `id`, `account_id`, `email_id`, `action_type`, `scheduled_for`, `executed_at`

**drafts**
- `id`, `account_id`, `subject`, `body_html`, `to_email`, etc.

**sync_logs**
- `id`, `account_id`, `status`, `messages_synced`, `error_message`, `created_at`

**RLS Policies**: All tables filtered by `user_id` (via `gmail_accounts` join)

---

## Frontend Architecture

### Target UI (Shadcn Mail Pattern)

**3-Panel Resizable Layout**:
1. **Left Sidebar**
   - Account switcher dropdown (All Accounts / Account 1 / Account 2)
   - Folders: Inbox (with unread count), Drafts, Sent, Junk, Trash, Archive
   - Labels: Social, Updates, Forums, etc.

2. **Middle Panel**
   - Search bar
   - Tabs: All Mail / Unread
   - Email list (sender, subject, snippet, date, labels)

3. **Right Panel**
   - Email display (full HTML content)
   - Action toolbar: Archive, Junk, Trash, Snooze, Reply, Reply All, Forward, Star, Mark Read

**Components**:
- `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` (Shadcn)
- `ScrollArea`, `Separator`, `Badge`, `Tooltip`, `DropdownMenu` (Shadcn)
- `Tabs` for All Mail / Unread
- Tiptap rich text editor for compose/reply

### Unified Inbox Logic
- **All Accounts**: Fetch emails from all `gmail_accounts` → merge → sort by date
- **Single Account**: Filter emails by `account_id`
- **Compose**: Let user select which account to send from

---

## Working Standards

### When Starting a Task

1. **Read context first**:
   - This file (CLAUDE.md)
   - Relevant guide (QUICK_START.md, VERCEL_ENV_VARIABLES.md, etc.)
   - Check recent commits: `git log --oneline -10`

2. **Plan if non-trivial**:
   - Use EnterPlanMode for tasks with 3+ steps or architectural decisions
   - Write plan to a file before coding
   - Get user approval

3. **Track progress**:
   - Use TaskCreate/TaskUpdate for multi-step tasks
   - Mark tasks complete only after verification

4. **Verify before done**:
   - Run tests / check logs / demonstrate correctness
   - Ask: "Would a staff engineer approve this?"

### Code Quality Standards

- **Simplicity first**: Minimal code impact, no over-engineering
- **No laziness**: Find root causes, no temporary hacks
- **Senior dev standards**: Secure, tested, documented
- **No premature abstraction**: Don't create helpers for one-time use
- **Trust the user**: If they ask for something specific, do it

### Bug Fixing

- Just fix it — don't ask for hand-holding
- Read logs/errors → find root cause → fix
- If CI fails, fix it without being told how

### Security Rules

- **Never expose secrets**: No service keys, OAuth tokens, or secrets in frontend
- **Validate all inputs**: Use Zod schemas at route level
- **Encrypt sensitive data**: OAuth tokens are AES-256-GCM encrypted in DB
- **Rate limit**: Auth routes (20/15min), Send (100/hr), General (1000/15min)
- **No SQL injection**: Use parameterized queries
- **No XSS**: Sanitize HTML emails before display

---

## Feature Checklist

### ✅ Completed (Phase 1)
- [x] Multi-account Gmail OAuth2
- [x] Email sync (full + delta) via pg_cron
- [x] Token refresh automation
- [x] Database schema + RLS policies
- [x] API endpoints (auth, accounts, emails, sync)
- [x] Deployment on Vercel + Supabase
- [x] Environment variables setup
- [x] Documentation (8 guides)

### 🚧 In Progress (Phase 1)
- [ ] Shadcn Mail 3-panel layout
- [ ] Account switcher
- [ ] Unified inbox view
- [ ] Email list + detail view
- [ ] Email actions (archive, star, reply, etc.)
- [ ] Compose email with Tiptap
- [ ] Search across emails

### 📋 Planned (Phase 2)
- [ ] Email threading / conversation view
- [ ] Keyboard shortcuts
- [ ] Scheduled send
- [ ] Draft auto-save
- [ ] Custom label creation

---

## Troubleshooting

### Deployment Issues

**404 on homepage after deploy**:
- Wait 2-3 min for Vercel CDN propagation
- Check Vercel deployment logs

**OAuth fails**:
- Verify `GOOGLE_REDIRECT_URI` matches exactly in Google Console
- Must be `https://your-app.vercel.app/api/auth/google/callback` (no trailing slash)

**No emails syncing**:
- Check Supabase pg_cron: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`
- Verify `CRON_SECRET` matches in Vercel + Supabase Vault
- Check Vercel function logs for `/api/workers/sync`

### Local Development

**CORS errors**:
- Set `FRONTEND_URL=http://localhost:5173` in API `.env`
- Frontend should use `VITE_API_URL=http://localhost:3000` (or `vercel dev` port)

**Database connection fails**:
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
- Run `supabase link` to connect to remote project

---

## Documentation Index

**Start here**:
1. `README.md` — Project overview
2. `QUICK_START.md` — Deploy in 10 minutes
3. `VERCEL_ENV_VARIABLES.md` — Environment setup

**Deployment guides**:
4. `SUPABASE_CRON_SETUP.md` — Setup pg_cron jobs
5. `MIGRATION_STATUS.md` — Architecture details

**Reference**:
6. This file (CLAUDE.md) — Complete project context
7. `ENV_SETUP_GUIDE.md` — Detailed env var reference
8. `VERCEL_MIGRATION_GUIDE.md` — Legacy (Cloudflare era, outdated)

---

## Quick Reference

### Useful Commands

```bash
# Deploy
vercel deploy --prod

# View logs
vercel logs                             # Vercel function logs
supabase logs --project-ref <ref>       # Supabase logs

# Database
supabase db push                        # Apply migrations
supabase db reset                       # Reset local DB
supabase db diff -f new_migration       # Create migration

# Frontend
cd frontend && npm run dev              # Dev server
cd frontend && npm run build            # Production build

# Check cron jobs
# (Run in Supabase SQL Editor)
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Key URLs

- **Production**: https://gmail-client-xi-lemon.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com

---

## Git Workflow

```bash
# Before starting work
git pull origin main
git log --oneline -10              # Check recent changes

# After completing work
git add -A
git commit -m "feat: description

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin main
```

**Commit message format**: `type: description` (types: feat, fix, docs, refactor, test, chore)

---

## Notes for Future Developers

### What Works Well

- **2-service architecture**: Simple, maintainable, $0/month
- **Supabase pg_cron**: Reliable, no extra service needed
- **Vercel serverless**: Auto-scales, fast cold starts
- **Type safety**: Full TypeScript, Zod validation
- **Security**: Encrypted tokens, rate limiting, RLS

### Known Limitations

- **Vercel Free Tier**: 100GB bandwidth/month (enough for small teams)
- **Supabase Free Tier**: 500MB database, 2GB bandwidth (upgrade if needed)
- **No Redis**: Using in-memory Map (loses state on cold start — acceptable for OAuth state)
- **No email threading**: Planned for Phase 2
- **Single region**: Vercel auto-deploys to nearest region (can configure multi-region on Pro)

### If You Need to Scale

- **Database**: Upgrade Supabase to Pro ($25/mo for 8GB)
- **Bandwidth**: Upgrade Vercel to Pro ($20/mo for 1TB)
- **Redis**: Add Upstash Redis (free tier: 10k requests/day)
- **Cron monitoring**: Add Sentry or Datadog (optional)

---

**Last updated**: 2026-02-09
**Project status**: ✅ Production-ready, deployed, 2-service architecture
**Next priority**: Complete Shadcn Mail UI implementation
