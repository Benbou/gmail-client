# Gmail Client

Gmail client with unified inbox, multi-account support, and real-time sync.

---

## Features

- Multi-account Gmail (2+ accounts via OAuth2)
- Unified inbox (merge emails by date)
- Email actions: compose, reply, forward, archive, delete, star, snooze
- Full-text search
- Real-time updates (SSE)
- Dark mode
- Rich text editor (Tiptap)

---

## Stack

- **Express 5** (Node 20) - API server + static frontend
- **EmailEngine v2** - Email sync, OAuth tokens, IMAP
- **Supabase** - PostgreSQL + Auth
- **React 19** + Vite + Tailwind CSS 3 + Shadcn UI
- **Docker Compose** - Orchestration (app + emailengine)

---

## Quick Start

### 1. Prerequisites

- Docker + Docker Compose
- Supabase project (free tier)
- Google Cloud OAuth 2.0 credentials (Gmail API enabled)

### 2. Supabase Setup

1. Create a [Supabase project](https://supabase.com)
2. Run migrations in SQL Editor:
   - `supabase/migrations/20250122_001_initial_schema.sql`
   - `supabase/migrations/20250122_002_rls_policies.sql`
   - `supabase/migrations/20260210_001_emailengine_migration.sql`

### 3. Environment Variables

Create `.env` at the project root:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

# EmailEngine (set after first deploy, see below)
EMAILENGINE_TOKEN=
EMAILENGINE_GMAIL_APP_ID=

# App
FRONTEND_URL=http://localhost:8080
PORT=8080
```

### 4. Run

```bash
docker compose up --build
```

App runs at `http://localhost:8080`. EmailEngine dashboard at `http://localhost:3000`.

### 5. EmailEngine First-Time Setup

1. Open EmailEngine dashboard (`http://localhost:3000`)
2. Create admin password
3. **API Token**: Settings > API Tokens > Create Token (full access) > set as `EMAILENGINE_TOKEN`
4. **OAuth App**: Settings > OAuth2 Applications > Add Application
   - Provider: Gmail
   - Client ID / Secret: your Google OAuth credentials
   - Save > copy App ID > set as `EMAILENGINE_GMAIL_APP_ID`
5. **Webhooks**: Settings > Webhooks
   - URL: `http://app:8080/api/webhooks/emailengine`
   - Events: `messageNew`, `messageDeleted`, `messageUpdated`, `accountInitialized`
6. Restart: `docker compose up --build`

---

## Project Structure

```
/
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # AppLayout, Sidebar, MailView, TopBar
│   │   │   ├── email/         # EmailListItem, EmailDetailPanel
│   │   │   └── ui/            # Shadcn components
│   │   ├── lib/api.ts         # Axios client
│   │   ├── contexts/          # Auth context
│   │   └── pages/             # InboxPage, ComposePage, SettingsPage
│   └── vite.config.ts
│
├── server/            # Express server
│   └── src/
│       ├── index.ts           # App entry (serves frontend + API)
│       ├── routes/            # API endpoints
│       ├── adapters/          # EmailEngine → frontend format
│       ├── lib/               # Supabase + EmailEngine clients
│       ├── middleware/        # Auth + error handler
│       ├── realtime/          # SSE push
│       └── services/          # Snooze worker
│
├── supabase/migrations/
├── Dockerfile
├── docker-compose.yml
└── CLAUDE.md
```

---

## Development

```bash
# Frontend (hot reload)
cd frontend && npm run dev

# Server (watch mode)
cd server && npm run dev

# EmailEngine (requires Docker)
docker run -p 3000:3000 -v emailengine_data:/data postalsys/emailengine:v2
```

Frontend dev server expects the Express server at `http://localhost:8080` (configure `VITE_API_URL` in `frontend/.env`).

---

## Database

**Tables**: `users`, `gmail_accounts`, `scheduled_actions`, `drafts`

Emails are NOT stored locally. They are fetched on-demand from EmailEngine.

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/google/start | Start OAuth flow |
| GET | /api/accounts | List connected accounts |
| DELETE | /api/accounts/:id | Disconnect account |
| GET | /api/emails | List emails |
| GET | /api/emails/:id | Get email detail |
| POST | /api/emails/send | Send email |
| POST | /api/emails/:id/archive | Archive |
| POST | /api/emails/:id/star | Star/unstar |
| POST | /api/emails/:id/read | Mark read/unread |
| POST | /api/emails/:id/trash | Trash |
| POST | /api/emails/:id/snooze | Snooze |
| GET | /api/labels | List labels |
| POST | /api/search | Search emails |
| GET | /api/events | SSE stream |
| POST | /api/webhooks/emailengine | EE webhook receiver |

---

## Deployment (Coolify)

1. Push to git
2. Coolify builds via Dockerfile
3. `docker-compose.yml` orchestrates app + emailengine
4. Set env vars in Coolify dashboard
5. Complete EmailEngine first-time setup (see above)
6. Update Google OAuth redirect URI to your domain

---

## License

MIT
