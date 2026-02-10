# CLAUDE.md - Gmail Client

Guide pour Claude Code. Contient tout ce dont tu as besoin pour comprendre et travailler sur ce projet.

---

## State du Projet

**Status** : Express + EmailEngine (Coolify-ready)
**Architecture** : Express (Server + Static Frontend) + EmailEngine (Email Sync) + Supabase (DB + Auth)
**Deployment** : Docker Compose on Coolify VPS
**Previous** : Was Vercel serverless + custom Gmail sync

**Migration** (2026-02-10):
- Migrated from Vercel serverless to Express server
- Replaced custom Gmail sync/tokens with EmailEngine
- Replaced Supabase Realtime with SSE
- Removed pg_cron jobs (EE handles sync + token refresh)
- Removed emails/labels/sync_logs tables from DB
- Added Docker Compose (app + emailengine)

---

## Vision

Client Gmail avec **inbox unifie** pour 2+ comptes Gmail.

**UI Target** : Shadcn Mail example (3-panel layout)
- Reference : https://v3.shadcn.com/examples/mail

**Features** :
- Multi-compte Gmail (OAuth2 via EmailEngine)
- Inbox unifie (merge emails par date)
- Actions : archive, snooze, star, reply, forward, trash
- Sync auto (EmailEngine handles it)
- Search full-text (via EmailEngine)
- Real-time updates (SSE via webhooks)

---

## Architecture

```
Docker Compose (Coolify VPS)
├── app (Express + Static Frontend)
│   ├── Frontend: React 19 + Vite + TypeScript (built into /public)
│   │   └── /frontend
│   └── Server: Express (Node 20)
│       └── /server/src
│           ├── routes/          # API endpoints
│           ├── adapters/        # EE → Frontend format transformation
│           ├── lib/             # Supabase + EmailEngine clients
│           ├── middleware/      # Auth (Supabase JWT) + error handler
│           ├── realtime/        # SSE for push updates
│           └── services/        # Snooze worker
│
└── emailengine (postalsys/emailengine:v2)
    └── Manages: OAuth tokens, email sync, IMAP connections

Supabase (Free)
├── PostgreSQL (users, gmail_accounts, scheduled_actions, drafts)
└── Auth (login, JWT tokens)
```

---

## Structure Critique

```
/
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx         # Root layout
│   │   │   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   │   │   ├── AccountSwitcher.tsx   # Account dropdown
│   │   │   │   ├── TopBar.tsx            # Search + theme
│   │   │   │   └── MailView.tsx          # 3-panel ResizablePanelGroup
│   │   │   ├── email/
│   │   │   │   ├── EmailListItem.tsx     # Email row (sets ?id=&account= params)
│   │   │   │   ├── EmailDetailPanel.tsx  # Right panel (props: emailId, accountId)
│   │   │   │   ├── RecipientInput.tsx
│   │   │   │   └── RichTextEditor.tsx
│   │   │   └── ui/                       # Shadcn components
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts                    # Axios client (emailsApi needs accountId)
│   │   │   └── supabase.ts              # Supabase anon client
│   │   ├── contexts/AuthContext.tsx
│   │   ├── stores/accountStore.ts
│   │   ├── types/index.ts
│   │   └── pages/
│   └── vite.config.ts
│
├── server/            # Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Express app + static serving
│       ├── config.ts             # Env vars
│       ├── middleware/
│       │   ├── auth.ts           # Supabase JWT validation
│       │   └── errorHandler.ts
│       ├── lib/
│       │   ├── supabase.ts       # Service role client
│       │   └── emailengine.ts    # EE HTTP client
│       ├── adapters/
│       │   ├── emailAdapter.ts   # EE msg → Email format
│       │   └── labelAdapter.ts   # EE mailbox → Label format
│       ├── routes/
│       │   ├── auth.ts           # OAuth start (via EE hosted)
│       │   ├── accounts.ts       # List/delete accounts
│       │   ├── emails.ts         # List/get/send emails
│       │   ├── emailActions.ts   # Archive/star/read/trash/snooze
│       │   ├── labels.ts         # List labels (mailboxes)
│       │   ├── search.ts         # Full-text search
│       │   └── webhooks.ts       # EE webhook receiver
│       ├── realtime/
│       │   └── sse.ts            # Server-Sent Events
│       └── services/
│           └── snoozeWorker.ts   # Periodic snooze executor
│
├── supabase/migrations/
│   ├── 20250122_001_initial_schema.sql
│   ├── 20250122_002_rls_policies.sql
│   └── 20260210_001_emailengine_migration.sql
│
├── Dockerfile         # Multi-stage build
├── docker-compose.yml # app + emailengine
└── CLAUDE.md
```

---

## Tech Stack

**Frontend**
- React 19 + TypeScript + Vite
- Tailwind CSS 3 + Shadcn UI
- React Query (server state)
- Axios (API client)
- Tiptap (rich text editor)
- SSE for real-time (fetch-based)

**Backend**
- Node 20 + TypeScript + Express 5
- EmailEngine v2 (email sync, OAuth, IMAP)
- Supabase PostgreSQL + Auth
- SSE (Server-Sent Events)

**Database**
- PostgreSQL (Supabase)
- Tables: users, gmail_accounts, scheduled_actions, drafts
- RLS enabled
- Emails NOT stored locally (fetched from EmailEngine on demand)

---

## Authentication

### User Auth
- Supabase Auth (email/password)
- Frontend stores session in localStorage
- Axios interceptor auto-injects Bearer token
- Server validates JWT via Supabase `getUser()`

### Gmail OAuth
- EmailEngine handles the full OAuth flow (hosted auth page)
- Tokens stored and refreshed by EmailEngine
- No encryption needed in our code

**Flow:**
1. User clicks "Connect Gmail"
2. GET /api/auth/google/start → creates EE account, returns hosted auth URL
3. User completes Google consent on EE hosted page
4. EE stores tokens, starts syncing
5. EE sends `accountInitialized` webhook
6. Server updates gmail_accounts record (email, is_active=true)
7. Frontend refreshes accounts list

---

## API Endpoints

**Auth** (2)
- GET /api/auth/google/start - Start OAuth flow
- GET /api/auth/google/callback - Legacy redirect handler

**Accounts** (2)
- GET /api/accounts - List connected accounts (with sync_status from EE)
- DELETE /api/accounts/:id - Disconnect account

**Emails** (3)
- GET /api/emails - List emails (unified or per-account)
- GET /api/emails/:id?account_id= - Get email detail
- POST /api/emails/send - Send email

**Email Actions** (5)
- POST /api/emails/:id/archive - Archive
- POST /api/emails/:id/star - Star/unstar
- POST /api/emails/:id/read - Mark read/unread
- POST /api/emails/:id/trash - Move to trash
- POST /api/emails/:id/snooze - Snooze (archive + scheduled action)

**Labels** (1)
- GET /api/labels - List labels/mailboxes

**Search** (1)
- POST /api/search - Full-text search

**Webhooks** (1)
- POST /api/webhooks/emailengine - Receive EE events

**Real-time** (1)
- GET /api/events - SSE stream

**Health** (1)
- GET /api/health - Health check

---

## Database Schema

**users** : id, email, name, avatar_url, preferences
**gmail_accounts** : id, user_id, email, emailengine_account_id, is_active
**scheduled_actions** : id, user_id, gmail_account_id, email_id (text), ee_account_id, action_type, scheduled_at, status, payload
**drafts** : id, user_id, gmail_account_id, in_reply_to, subject, to/cc/bcc, body

**Removed tables**: emails, labels, sync_logs (EE manages these)

---

## Environment Variables

### Server (runtime)
```
PORT=8080
EMAILENGINE_URL=http://emailengine:3000
EMAILENGINE_TOKEN=<token from EE dashboard>
EMAILENGINE_GMAIL_APP_ID=<optional, OAuth app ID in EE>
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=<Supabase API Secret>
FRONTEND_URL=https://<domain>
WEBHOOK_SECRET=<optional>
```

### Frontend (build-time)
```
VITE_API_URL=                          # empty (same origin)
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

---

## Commands

**Development**
```bash
# Frontend
cd frontend && npm run dev

# Server
cd server && npm run dev

# Both need EmailEngine running
docker run -p 3000:3000 -v emailengine_data:/data postalsys/emailengine:v2
```

**Production**
```bash
docker compose up --build
```

**Database**
```bash
supabase link --project-ref lfhmxxwcvcvslzndemzh
supabase db push
```

---

## Key Patterns

- **accountId required**: All email actions require `account_id` (maps to EE account)
- **Email selection**: Uses search params `?id=xxx&account=yyy` (not nested routes)
- **Adapter layer**: `emailAdapter.ts` transforms EE format → frontend Email interface
- **No local email storage**: Emails fetched on-demand from EmailEngine
- **SSE for real-time**: EE webhooks → server → SSE → frontend invalidates React Query

---

## Deployment (Coolify)

1. Push to git
2. Coolify builds via Dockerfile
3. docker-compose.yml orchestrates app + emailengine
4. First deploy: access EE dashboard, create API token + register OAuth app
5. Set env vars in Coolify
6. Update Google OAuth redirect URI to new domain

---

**Last updated** : 2026-02-10
