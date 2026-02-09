# CLAUDE.md - Gmail Client

Guide pour Claude Code. Contient tout ce dont tu as besoin pour comprendre et travailler sur ce projet.

---

## 📍 État du Projet

**Status** : ✅ Backend déployé, Frontend en développement
**Architecture** : Vercel (Frontend + API serverless) + Supabase (DB + Cron)
**Deployment** : https://gmail-client-xi-lemon.vercel.app
**Coût** : $0/mois (free tiers)

---

## 🎯 Vision

Client Gmail avec **inbox unifié** pour 2+ comptes Gmail.

**UI Target** : Shadcn Mail example (3-panel layout)
- Référence : https://v3.shadcn.com/examples/mail

**Features** :
- Multi-compte Gmail (OAuth2)
- Inbox unifié (merge emails par date)
- Actions : archive, snooze, star, reply, forward
- Sync auto (cron : toutes les 2 min)
- Search full-text

---

## 🏗️ Architecture

```
Vercel (Free)
├── Frontend: React 19 + Vite + TypeScript
│   └── /frontend
└── API: Serverless functions (Node 20)
    └── /api
        ├── auth/google/*
        ├── accounts/*
        ├── emails/*
        └── workers/* (cron handlers)

Supabase (Free)
├── PostgreSQL (database)
├── Realtime (live updates)
└── pg_cron (automated tasks)
    ├── */2 * * * * → /api/workers/sync
    ├── */5 * * * * → /api/workers/refresh-tokens
    └── * * * * * → /api/workers/scheduled-actions
```

---

## 📁 Structure Critique

```
/
├── frontend/          # React app
│   ├── src/
│   │   ├── components/ui/  # Shadcn UI
│   │   ├── lib/api.ts      # Axios client
│   │   └── contexts/AuthContext.tsx
│   └── vite.config.ts
│
├── api/               # Vercel serverless
│   ├── lib/
│   │   ├── auth.ts        # JWT validation
│   │   ├── supabase.ts    # DB client
│   │   └── crypto.ts      # AES-256-GCM encryption
│   ├── services/
│   │   ├── gmail-service.ts
│   │   └── gmail-sync.ts
│   └── workers/           # Cron handlers
│
├── supabase/migrations/
│   ├── 20260209145637_initial_schema.sql
│   ├── 20260209145657_rls_policies.sql
│   └── 20260209_001_setup_cron_jobs.sql
│
├── vercel.json        # Monorepo config
├── CLAUDE.md          # Ce fichier
├── README.md          # Overview
└── SETUP.md           # Deployment guide
```

---

## 🔑 Tech Stack

**Frontend**
- React 19 + TypeScript + Vite
- Tailwind CSS 4 + Shadcn UI
- React Query (server state)
- Axios (API client)
- Tiptap (rich text editor)

**Backend**
- Node 20 + TypeScript
- Vercel serverless functions
- Gmail API (googleapis)
- Supabase PostgreSQL
- JWT auth (15min access, 7d refresh)
- AES-256-GCM (OAuth token encryption)

**Database**
- PostgreSQL (Supabase)
- Tables : users, gmail_accounts, emails, labels, drafts, sync_logs
- RLS enabled (service_role bypasses)
- pg_cron + pg_net extensions

---

## 🔐 Authentication

### User Auth
1. POST /api/auth/signup → JWT tokens
2. Frontend stores in localStorage
3. Axios auto-injects Bearer token
4. Backend validates JWT

### Gmail OAuth
1. GET /api/auth/google/start → Google OAuth
2. Callback stores encrypted tokens in DB
3. User can connect 2+ accounts

**Security** : OAuth tokens encrypted (AES-256-GCM), never exposed to frontend

---

## 🛣️ API Endpoints

**Auth**
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/google/start
- GET /api/auth/google/callback

**Accounts**
- GET /api/accounts
- DELETE /api/accounts/:id

**Emails**
- GET /api/emails (supports ?account_id=)
- GET /api/emails/:id
- POST /api/emails/send
- PATCH /api/emails/:id/archive
- PATCH /api/emails/:id/star
- PATCH /api/emails/:id/read

**Workers** (Cron - auth: Bearer CRON_SECRET)
- POST /api/workers/sync
- POST /api/workers/refresh-tokens
- POST /api/workers/scheduled-actions

---

## 🗄️ Database Schema

**users** : id, email, password_hash
**gmail_accounts** : id, user_id, email, access_token_encrypted, refresh_token_encrypted, token_expires_at
**emails** : id, account_id, gmail_id, thread_id, from_email, subject, body_html, body_text, date, is_read, is_starred, labels
**labels** : id, account_id, gmail_label_id, name, type
**sync_logs** : id, account_id, status, messages_synced, error_message

RLS : All tables filtered by user_id (via gmail_accounts join)

---

## ⚙️ Variables d'Environnement

**Où les configurer** : Vercel Dashboard → Settings → Environment Variables

**Frontend** (public)
```
VITE_API_URL=/api
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SQU74g27iA9mpU3VuFpgXA_EUuNLiwq
```

**Backend** (secret)
```
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=<Supabase Dashboard → Settings → API → API Secret (sb_secret_...)>
ENCRYPTION_KEY=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>
CRON_SECRET=WdaG0F+LKui7hRqv+q2Eqtpc1IhdNYrWGNhe2UsjX4Y=
FRONTEND_URL=https://gmail-client-xi-lemon.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

**⚠️ JAMAIS commiter de secrets dans Git !**

**Note Supabase** : Utilise les nouvelles clés (API Secret, pas service_role deprecated)

---

## 🚀 Commandes

**Frontend**
```bash
cd frontend
npm run dev     # Dev server (port 5173)
npm run build   # Production build
```

**Deploy**
```bash
vercel --prod
```

**Database**
```bash
supabase link --project-ref lfhmxxwcvcvslzndemzh
supabase db push
```

**Check Cron Jobs** (Supabase SQL Editor)
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 🎨 UI Target (Shadcn Mail)

**3-Panel Layout**
1. Left : Account switcher + folders (Inbox, Sent, Drafts) + labels
2. Middle : Email list (sender, subject, snippet, date)
3. Right : Email display + actions (archive, reply, star, etc.)

**Components**
- ResizablePanelGroup / Panel / Handle
- ScrollArea, Tabs, Badge, Tooltip, DropdownMenu
- Tiptap editor for compose/reply

**Unified Inbox**
- "All Accounts" : merge emails from all accounts, sort by date
- Single account : filter by account_id

---

## 📝 Working Standards

### Before Starting
1. Read this file (CLAUDE.md)
2. Check recent commits: `git log --oneline -10`
3. Plan if non-trivial (3+ steps)

### Code Quality
- Simplicity first (minimal impact)
- Senior dev standards (secure, tested)
- No premature abstraction
- Trust the user (do what they ask)

### Security
- Never expose secrets
- Validate inputs (Zod)
- Encrypt sensitive data (OAuth tokens)
- Rate limiting (auth, send, general)

### Bug Fixing
- Just fix it (don't ask for hand-holding)
- Find root cause
- Fix failing tests

---

## 📋 Feature Checklist

**✅ Done**
- Multi-account Gmail OAuth2
- Email sync (full + delta) via pg_cron
- Token refresh automation
- Database schema + RLS
- API endpoints
- Deployment (Vercel + Supabase)

**🚧 In Progress**
- Shadcn Mail 3-panel layout
- Email list + detail view
- Email actions
- Compose with Tiptap
- Search

**📋 Planned**
- Email threading
- Keyboard shortcuts
- Scheduled send
- Draft auto-save

---

## 🆘 Troubleshooting

**404 after deploy** : Wait 2-3 min (CDN propagation)

**OAuth fails** : Check GOOGLE_REDIRECT_URI matches exactly in both Vercel env vars and Supabase Auth Providers

**No emails syncing** :
- Check cron jobs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`
- Verify CRON_SECRET matches in Vercel + Supabase Vault
- Check Vercel function logs

**CORS errors** : Check FRONTEND_URL in Vercel env vars

---

## 🔄 Git Workflow

```bash
git pull origin main
# ... work ...
git add -A
git commit -m "type: description

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin main
```

**Commit types** : feat, fix, docs, refactor, test, chore

---

## 📚 Other Docs

- **SETUP.md** : Deployment guide (simple, non-tech friendly)
- **README.md** : Project overview

---

**Last updated** : 2026-02-09
**Next priority** : Complete Shadcn Mail UI
