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
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── workers/      # Background workers
│   │   └── index.ts      # Entry point
│   └── package.json
└── README.md
```

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + Shadcn UI
- React Query (server state)
- Zustand (client state)
- React Router (routing)
- Tiptap (rich text editor)

### Backend
- Node.js + Express + TypeScript
- googleapis (Gmail API)
- Supabase (database + auth)
- node-cron (scheduled tasks)

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account
- Google Cloud project with Gmail API enabled

### Setup

1. **Clone and install dependencies**

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

2. **Configure environment variables**

Backend (`.env`):
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

JWT_SECRET=your_random_secret
PORT=3000
```

Frontend (`.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run development servers**

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

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
