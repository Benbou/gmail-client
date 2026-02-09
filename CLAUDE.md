# CLAUDE.md - Gmail Client

Guide pour Claude Code. Contient tout ce dont tu as besoin pour comprendre et travailler sur ce projet.

---

## 📍 État du Projet

**Status** : ✅ Infrastructure simplifiée (10/12 fonctions Vercel)
**Architecture** : Vercel (Frontend + API serverless) + Supabase (DB + Cron)
**Deployment** : https://gmail-client.vercel.app
**Coût** : $0/mois (free tiers)

**Recent Cleanup** (2026-02-09):
- Supprimé backend Railway legacy (2,620 lignes)
- Consolidé API routes (14→10 fonctions)
- Migré vers Supabase API Secrets (sb_secret_...)
- Simplifié docs (7 fichiers → 3 fichiers)

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
Vercel (Free) - 10/12 functions
├── Frontend: React 19 + Vite + TypeScript
│   └── /frontend
└── API: Serverless functions (Node 20)
    └── /api (10 routes)
        ├── auth/google/start
        ├── auth/google/callback
        ├── accounts/
        │   ├── index (GET list)
        │   ├── [id] (DELETE)
        │   └── [id]/sync (POST)
        └── emails/
            ├── index (GET list)
            ├── send (POST)
            ├── [id] (GET detail)
            ├── [id]/archive (PATCH)
            └── [id]/snooze (PATCH)

Supabase (Free)
├── PostgreSQL (database)
├── Realtime (live updates)
└── pg_cron (automated tasks)
    ├── */2 * * * * → Email sync (via Supabase function)
    ├── */5 * * * * → Token refresh
    └── * * * * * → Scheduled actions (snooze, send later)
```

---

## 📁 Structure Critique

```
/
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx         # Root layout (Sidebar + TopBar + Outlet)
│   │   │   │   ├── Sidebar.tsx           # Sidebar with AccountSwitcher integrated
│   │   │   │   ├── AccountSwitcher.tsx   # Account dropdown (collapsed/expanded modes)
│   │   │   │   ├── TopBar.tsx            # Search + theme + user menu
│   │   │   │   └── MailView.tsx          # 3-panel ResizablePanelGroup
│   │   │   ├── email/
│   │   │   │   ├── EmailList.tsx
│   │   │   │   ├── EmailListItem.tsx
│   │   │   │   └── EmailDetailPanel.tsx  # Email detail in right panel
│   │   │   └── ui/                       # Shadcn components
│   │   ├── hooks/
│   │   │   └── useMediaQuery.ts          # Responsive breakpoint detection
│   │   ├── lib/api.ts                    # Axios client
│   │   └── contexts/AuthContext.tsx
│   └── vite.config.ts
│
├── api/               # Vercel serverless (10 functions)
│   ├── lib/
│   │   ├── auth.ts        # JWT validation
│   │   ├── supabase.ts    # DB client
│   │   └── crypto.ts      # AES-256-GCM encryption
│   ├── services/
│   │   ├── gmail-service.ts
│   │   └── gmail-sync.ts
│   └── [routes]/          # API endpoints (auth, accounts, emails)
│
├── supabase/migrations/
│   ├── 20260209145637_initial_schema.sql
│   ├── 20260209145657_rls_policies.sql
│   └── 20260209_001_setup_cron_jobs.sql
│
├── vercel.json              # Monorepo config
├── deploy-vercel.sh         # Automated deploy script
├── CLAUDE.md                # Ce fichier
├── README.md                # Single source of truth
└── SUPABASE_API_SECRET.md   # Guide API Secret generation
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

**OAuth Architecture Details** :

**User Authentication** : Supabase Auth
- Sign up/Login : Email/password (custom JWT)
- Session : 15min access token, 7d refresh token
- Storage : localStorage (frontend)
- Auto-refresh : axios interceptor

**Gmail OAuth** : Custom Flow (googleapis)
- **Scopes** :
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/userinfo.email`
- **Flow** :
  1. User clicks "Connect Gmail"
  2. GET /api/auth/google/start → OAuth URL with state token
  3. Google consent screen
  4. GET /api/auth/google/callback?code=...
  5. Backend exchanges code for tokens
  6. Tokens encrypted (AES-256-GCM) + stored in DB
  7. Trigger initial sync
- **Token Management** :
  - Encryption : AES-256-GCM (api/lib/crypto.ts)
  - Storage : `gmail_accounts.access_token`, `.refresh_token`
  - Refresh : Automatic via pg_cron (every 5 min)
  - State : Vercel KV (in-memory, 5min TTL)

**Pourquoi Custom OAuth (pas Supabase OAuth)** :
- Supabase OAuth = user authentication (sign in with Google)
- Gmail API = service authorization (access Gmail data)
- Besoin scopes personnalisés + accès direct aux tokens
- Contrôle complet sur refresh/expiry/revocation

---

## 🛣️ API Endpoints (10 routes)

**Auth** (2)
- GET /api/auth/google/start
- GET /api/auth/google/callback

**Accounts** (3)
- GET /api/accounts (list all)
- DELETE /api/accounts/:id
- POST /api/accounts/:id/sync

**Emails** (5)
- GET /api/emails (supports ?account_id=)
- GET /api/emails/:id
- POST /api/emails/send
- PATCH /api/emails/:id/archive
- PATCH /api/emails/:id/snooze

**Note** : Workers (sync, refresh-tokens, scheduled-actions) sont gérés par Supabase pg_cron directement, plus besoin de routes API dédiées.

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
SUPABASE_SERVICE_KEY=<Supabase API Secret - voir SUPABASE_API_SECRET.md>
ENCRYPTION_KEY=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>
CRON_SECRET=WdaG0F+LKui7hRqv+q2Eqtpc1IhdNYrWGNhe2UsjX4Y=
FRONTEND_URL=https://gmail-client.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

**⚠️ JAMAIS commiter de secrets dans Git !**

**Note Supabase API Secret** :
- Format : `sb_secret_...` (pas l'ancien `service_role` JWT)
- Dashboard → Settings → API → "API Secrets" section
- Guide complet : `SUPABASE_API_SECRET.md`

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

## 🎨 UI Layout (3-Panel Shadcn Mail)

**Référence** : https://v3.shadcn.com/examples/mail

**Architecture** :

1. **Sidebar** (52px-256px collapsible)
   - Account Switcher (top, integrated)
     - Collapsed : Avatar circulaire (initiale du compte)
     - Expanded : Dropdown avec "All Accounts" + liste comptes
   - Compose button (circular ou large)
   - Navigation (Inbox, Sent, Drafts, Spam, Trash, Snoozed, Starred)
   - Labels (groupés par compte en mode "All Accounts")
   - Settings (bottom)

2. **Email List Panel** (40% default, 30-60% resizable)
   - Toolbar (select all, refresh, pagination)
   - Email list items (sender, subject, snippet, date, account badge)
   - Active email highlighted

3. **Email Detail Panel** (60% default, 40-70% resizable)
   - Close button (retour à la liste)
   - Actions toolbar (archive, delete, star, snooze, more)
   - Email content (subject, sender, body HTML, attachments)
   - Reply/Forward buttons

**Responsive** :
- Desktop (>= 768px) : 3-panel resizable layout
- Mobile (< 768px) : Single column (liste OU détail)

**Components** :
- ResizablePanelGroup / Panel / Handle (react-resizable-panels)
- ScrollArea, Tabs, Badge, Avatar, Button, Tooltip, DropdownMenu
- Tiptap editor (compose/reply)

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

- **README.md** : Single source of truth (setup, deployment, troubleshooting)
- **SUPABASE_API_SECRET.md** : Guide pour générer l'API Secret Supabase
- **deploy-vercel.sh** : Script automatisé (1 commande = déploiement complet)

---

## 📊 Infrastructure Status

**Vercel Functions** : 10/12 (83% usage - safe margin)
**Code Base** : ~2,500 lignes backend (down from 5,500+)
**Documentation** : 3 fichiers (down from 10+)
**Services** : 2 (Vercel + Supabase)

**✅ Ready for deployment**

---

**Last updated** : 2026-02-09
**Next priority** : Email threading + keyboard shortcuts
