# Gmail Client MVP

Gmail client with unified inbox, multi-account support, and real-time sync.

**Live Demo**: https://gmail-client.vercel.app

---

## 🎯 Features

- ✅ **Multi-account Gmail** (2+ accounts via OAuth2)
- ✅ **Unified inbox** (merge emails by date)
- ✅ **Email actions**: compose, reply, forward, archive, delete, star, snooze
- ✅ **Full-text search**
- ✅ **Real-time sync** (auto-sync every 2 minutes)
- ✅ **Dark mode**
- ✅ **Rich text editor** (Tiptap)

---

## 🏗️ Stack (2 Services)

**100% Free Tier**

- ☁️ **Vercel**: Frontend (React) + API (Serverless Functions)
- 🗄️ **Supabase**: PostgreSQL + Auth + Realtime + pg_cron

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS 4 + Shadcn UI
- React Query + Zustand
- Tiptap (rich text editor)

### Backend
- Node 20 + TypeScript
- Vercel Serverless Functions (≤12 routes)
- Gmail API (googleapis)
- Supabase PostgreSQL
- JWT auth (AES-256-GCM encryption)

---

## 🚀 Quick Start

### 1. Supabase Setup

1. Create a [Supabase project](https://supabase.com) (free tier)
2. Copy/paste SQL from `supabase/migrations/` in SQL Editor:
   - `20260209145637_initial_schema.sql`
   - `20260209145657_rls_policies.sql`
   - `20260209_001_setup_cron_jobs.sql`
3. **Generate API Secret**:
   - Dashboard → Settings → API → "API Secrets" section
   - Click "Generate new secret"
   - Copy the secret (starts with `sb_secret_...`)

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Gmail API
3. OAuth consent screen → Configure
4. Create OAuth 2.0 credentials
5. Add redirect URI: `https://gmail-client.vercel.app/api/auth/google/callback`
6. Save Client ID + Client Secret

### 3. Local Development

```bash
# Install dependencies
npm install --prefix frontend
npm install --prefix api

# Configure environment
cd api
cp .env.example .env
# Edit .env with your Supabase URL, API Secret, Google credentials

# Run dev server
cd ../frontend
npm run dev
# Opens http://localhost:5173
```

### 4. Deploy to Vercel

```bash
./deploy-vercel.sh
```

The script will prompt for:
- Supabase URL
- Supabase API Secret (from step 1)
- Google Client ID + Secret (from step 2)

Everything else is auto-configured.

---

## 📁 Project Structure

```
/
├── frontend/              # React app
│   ├── src/
│   │   ├── components/ui/ # Shadcn UI components
│   │   ├── lib/api.ts     # Axios client
│   │   └── contexts/      # Auth, theme
│   └── vite.config.ts
│
├── api/                   # Vercel serverless functions
│   ├── lib/
│   │   ├── auth.ts        # JWT validation
│   │   ├── supabase.ts    # DB client
│   │   └── crypto.ts      # Token encryption
│   ├── services/
│   │   ├── gmail-service.ts
│   │   └── gmail-sync.ts
│   └── [routes]/          # API endpoints
│
├── supabase/migrations/   # Database schema + cron
│   ├── 20260209145637_initial_schema.sql
│   ├── 20260209145657_rls_policies.sql
│   └── 20260209_001_setup_cron_jobs.sql
│
├── vercel.json            # Vercel config
├── deploy-vercel.sh       # Automated deployment
├── CLAUDE.md              # AI assistant instructions
└── README.md              # This file
```

---

## 🔐 Environment Variables

### Frontend (`.env` in `/frontend`)

```bash
VITE_API_URL=/api
VITE_SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SQU74g27iA9mpU3VuFpgXA_EUuNLiwq
```

### Backend (`.env` in `/api`)

```bash
# Supabase
SUPABASE_URL=https://lfhmxxwcvcvslzndemzh.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...  # From Supabase Dashboard → API → API Secrets

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://gmail-client.vercel.app/api/auth/google/callback

# Security (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=<hex key for AES-256-GCM>
JWT_SECRET=<secret for access tokens>
JWT_REFRESH_SECRET=<secret for refresh tokens>
CRON_SECRET=WdaG0F+LKui7hRqv+q2Eqtpc1IhdNYrWGNhe2UsjX4Y=

# App config
FRONTEND_URL=https://gmail-client.vercel.app
NODE_ENV=production
LOG_LEVEL=info
USE_MEMORY_FALLBACK=true
```

**⚠️ Never commit secrets to Git!**

---

## 🛣️ API Routes

**Auth**
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`

**Accounts**
- `GET /api/accounts`
- `DELETE /api/accounts/:id`
- `POST /api/accounts/:id/sync`

**Emails**
- `GET /api/emails` (supports `?account_id=`)
- `GET /api/emails/:id`
- `POST /api/emails/send`
- `PATCH /api/emails/:id/archive`
- `PATCH /api/emails/:id/snooze`

**Sync**
- `GET /api/sync/:accountId`
- `GET /api/sync/status/:accountId`

---

## 🔄 Automated Tasks (Supabase pg_cron)

Configured via `supabase/migrations/20260209_001_setup_cron_jobs.sql`:

- **Email sync**: Every 2 minutes
- **Token refresh**: Every 5 minutes
- **Scheduled actions**: Every minute (snooze, send later)

Cron jobs call Vercel API endpoints with `Authorization: Bearer CRON_SECRET`.

---

## 🗄️ Database Schema

**Tables**:
- `users`: User accounts (email, password)
- `gmail_accounts`: Connected Gmail accounts (encrypted OAuth tokens)
- `emails`: Email metadata + content
- `labels`: Gmail labels/folders
- `sync_logs`: Sync history

**Security**: Row-Level Security (RLS) enabled on all tables. Service role bypasses RLS for backend operations.

---

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm run test

# API tests
cd api
npm run test
```

---

## 🐛 Troubleshooting

**404 after deploy**
- Wait 2-3 minutes for CDN propagation
- Hard refresh (Cmd+Shift+R)

**OAuth fails**
- Check `GOOGLE_REDIRECT_URI` matches exactly in Google Console
- Verify domain is added to authorized redirect URIs

**Emails not syncing**
- Check cron jobs in Supabase SQL Editor:
  ```sql
  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
  ```
- Verify `CRON_SECRET` matches in Vercel env vars

**"Legacy API keys disabled" error**
- You're using old `service_role` key instead of new API Secret
- Generate new secret: Supabase Dashboard → Settings → API → "API Secrets"

---

## 📝 Development Workflow

```bash
# Pull latest changes
git pull origin main

# Make changes...

# Commit
git add -A
git commit -m "feat: description

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push
git push origin main
```

**Commit types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

---

## 📚 Documentation

- **CLAUDE.md**: Instructions for AI assistant (detailed architecture)
- **deploy-vercel.sh**: Automated deployment script

---

## 🎨 UI Design

Based on [Shadcn Mail example](https://v3.shadcn.com/examples/mail):

- 3-panel layout (accounts/folders | email list | email detail)
- Resizable panels
- Dark mode support
- Keyboard shortcuts (planned)

---

## 📊 Deployment Status

**Current**: ✅ Deployed to Vercel
**URL**: https://gmail-client.vercel.app
**Functions**: 10/12 (under Hobby plan limit)
**Database**: Supabase (free tier)
**Cost**: $0/month

---

## 🔮 Roadmap

**Phase 2**:
- Email threading
- Keyboard shortcuts
- Scheduled send (deferred for MVP)
- Draft auto-save

**Phase 3**:
- AI smart filters
- Templates
- Analytics dashboard

---

## 📄 License

MIT

---

**Built with ❤️ using Claude Code**
