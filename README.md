# Gmail Client

A full-featured Gmail client with multi-account support, unified inbox, and advanced email management features.

## Project Structure

```
gmail-client/
├── frontend/          # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and API client
│   │   ├── pages/        # Route pages
│   │   └── types/        # TypeScript types
│   └── package.json
├── api/               # Vercel serverless functions (Express backend)
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── workers/         # Cron job handlers
│   └── index.ts         # Entry point
├── supabase/
│   └── migrations/      # Database schema & pg_cron setup
└── README.md
```

## Tech Stack

**Stack: 2 Services (100% Free)**
- ☁️ **Vercel** (Frontend + API)
- 🗄️ **Supabase** (Database + Realtime + Cron)

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + Shadcn UI
- React Query (server state)
- Zustand (client state)
- React Router (routing)
- Tiptap (rich text editor)

### Backend (Vercel Serverless)
- Node.js + Express + TypeScript
- googleapis (Gmail API)
- Supabase PostgreSQL (database)
- Supabase pg_cron (scheduled tasks)

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase account (free tier)
- Google Cloud project with Gmail API enabled
- Vercel account (for deployment)

### Quick Start

See **[QUICK_START.md](./QUICK_START.md)** for detailed setup instructions.

**TL;DR:**

1. **Setup Supabase**
   ```bash
   # Apply database migrations
   supabase link --project-ref <your-ref>
   supabase db push
   ```

2. **Configure environment variables** (see [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md))

3. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

4. **Setup automated cron jobs** (see [SUPABASE_CRON_SETUP.md](./SUPABASE_CRON_SETUP.md))
   - Email sync (every 2 min)
   - Token refresh (every 5 min)
   - Scheduled actions (every 1 min)

### Local Development

```bash
# Frontend dev server
cd frontend
npm install
npm run dev  # http://localhost:5173

# API dev server (optional - Vercel CLI)
vercel dev   # http://localhost:3000
```

## Core Features

### Phase 1 (Current)
- ✅ Multi-account Gmail OAuth2 authentication
- ✅ Unified inbox (merge emails from multiple accounts)
- ✅ Email actions: archive, snooze, send later, mark as read
- ✅ Search & filtering
- ✅ Compose & reply with rich text editor
- ✅ Labels/categories management

### Future Enhancements
- Email threading
- Smart filters (AI-powered)
- Templates
- Keyboard shortcuts
- Mobile apps
- Collaborative inbox
- Analytics dashboard

## Architecture

See [implementation_plan.md](.gemini/antigravity/brain/b0672f27-0cb7-468f-aa0c-2aa3d16e433f/implementation_plan.md) for detailed architecture decisions.

## License

MIT
