# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

A Gmail client with a **unified inbox** merging **2 Gmail accounts**. The frontend follows the **Shadcn Mail example** UI pattern: a 3-panel resizable layout (sidebar navigation, email list, email display) with an account switcher to toggle between accounts or view all.

Reference: https://v3.shadcn.com/examples/mail

## Development Commands

### Frontend (`/frontend`)
```bash
npm run dev        # Vite dev server on port 5173
npm run build      # tsc -b && vite build
npm run lint       # ESLint
```

### Backend (`/backend`)
```bash
npm run dev        # Watch mode with tsx (auto-restart on port 3000)
npm run build      # tsc to dist/
npm start          # Run compiled dist/index.js
```

### Database
```bash
supabase link --project-ref <ref> && supabase db push
```
Or run SQL from `supabase/migrations/` in the Supabase SQL Editor.

## Target UI (Shadcn Mail Pattern)

The frontend must follow the Shadcn Mail example layout:

### 3-Panel Resizable Layout
1. **Left sidebar** — Account switcher (dropdown to select account or "All Accounts"), navigation folders (Inbox with unread count, Drafts, Sent, Junk, Trash, Archive), and label list (Social, Updates, Forums, etc.)
2. **Middle panel** — Email list with search bar at top, tabs for filtering (All Mail / Unread), condensed email items showing: sender, subject, snippet, timestamp, labels/tags
3. **Right panel** — Selected email display with full content, sender info, date, and action toolbar

### Email Actions (action bar in display panel)
- Archive, Move to junk, Move to trash
- Snooze (with date picker)
- Reply, Reply all, Forward
- Star/unstar
- Mark as read/unread
- Label management

### Key UI Components
- `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` from Shadcn for the 3-panel layout
- Account switcher dropdown (select between the 2 Gmail accounts or unified view)
- `ScrollArea` for email list
- `Separator`, `Badge`, `Tooltip`, `DropdownMenu` from Shadcn UI
- `Tabs` for All Mail / Unread filtering
- Rich text editor (Tiptap) for compose/reply

### Multi-Account / Unified Inbox
- When "All Accounts" is selected: emails from both accounts merged, sorted by date
- When a specific account is selected: only that account's emails shown
- The compose view must let the user pick which account to send from
- Each email should subtly indicate which account it belongs to

## Architecture

### Frontend (React 19 + Vite + TypeScript)
- **Routing**: React Router v7 — routes in `App.tsx`
- **State**: AuthContext for auth, React Query for server data, Zustand available for client state
- **API client**: Axios in `src/lib/api.ts` — auto-injects Bearer token, redirects to login on 401
- **UI**: Tailwind CSS 4 + Shadcn UI (`src/components/ui/`), Lucide icons
- **Rich text**: Tiptap editor for email composition
- **Path alias**: `@/*` → `./src/*`

### Backend (Express 5 + TypeScript)
- **Entry**: `src/index.ts` — middleware: Helmet → CORS → rate limiting → body parsing → request logging → routes → error handler
- **Routes**: `src/routes/{auth,accounts,emails,sync}.ts` mounted under `/api/`
- **Services**: `src/services/` — gmail-oauth (OAuth2 client), gmail-service (Gmail API ops), gmail-sync (full + delta sync), supabase (DB client)
- **Auth middleware**: `src/middleware/auth.ts` — JWT validation + Redis-backed token blacklist
- **Security**: AES-256-GCM encryption for stored OAuth tokens (`src/lib/crypto.ts`), tiered rate limiting (20/15min auth, 100/hr send, 1000/15min general)
- **Validation**: Zod schemas in `src/lib/validations.ts` at route level
- **Error handling**: `ApiError` class + `asyncHandler` wrapper for async routes
- **Logging**: Pino (pretty in dev, JSON in prod)
- **Redis**: OAuth state + token blacklist; falls back to in-memory Map when `USE_MEMORY_FALLBACK=true`

### Database (Supabase PostgreSQL)
- **Schema**: `supabase/migrations/20250122_001_initial_schema.sql`
- **RLS policies**: `supabase/migrations/20250122_002_rls_policies.sql`
- **Tables**: users, gmail_accounts, emails, labels, scheduled_actions, drafts, sync_logs
- **Relationships**: users → gmail_accounts → emails/labels/drafts/sync_logs (cascade deletes)
- **Search**: Full-text search index on emails (subject, body_text, from_email)
- RLS enabled on all tables; backend uses service role key to bypass

### Authentication Flow
1. `POST /api/auth/signup` with email → JWT access token (15min) + refresh token (7d)
2. `GET /api/auth/google/start` → Google OAuth → callback stores encrypted tokens in DB
3. User connects 2 Gmail accounts — each gets its own `gmail_accounts` row
4. Protected routes require `Authorization: Bearer <token>` header

### Key API Endpoints for Unified Inbox
- `GET /api/emails?account_id=<id>` — emails for one account
- `GET /api/emails` (no account_id) — needs to support unified view across accounts
- `GET /api/accounts` — list connected Gmail accounts
- `POST /api/sync/:accountId` — trigger sync for an account
- `POST /api/emails/send` — send from a specific account

## Environment Variables

### Frontend (`.env`)
- `VITE_API_URL` — Backend URL (default: `http://localhost:3000`)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Backend (`.env`)
- `PORT`, `NODE_ENV`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY` — AES-256-GCM key for OAuth token encryption
- `REDIS_URL`, `USE_MEMORY_FALLBACK`
- `FRONTEND_URL` — For CORS and OAuth redirects
- `LOG_LEVEL`

## Working Standards

### Workflow
- **Plan first**: Enter plan mode for any non-trivial task (3+ steps or architectural decisions). If something goes sideways, STOP and re-plan — don't keep pushing.
- **Track progress**: Write plan to `tasks/todo.md` with checkable items. Mark items complete as you go. Add review section when done.
- **Verify before done**: Never mark a task complete without proving it works. Run tests, check logs, demonstrate correctness. Ask: "Would a staff engineer approve this?"
- **Capture lessons**: After any correction, update `tasks/lessons.md` with the pattern. Review lessons at session start.

### Subagents
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### Code Quality
- **Simplicity first**: Make every change as simple as possible. Minimal code impact.
- **No laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal impact**: Only touch what's necessary. Avoid introducing bugs.
- **Demand elegance** (balanced): For non-trivial changes, pause and ask "is there a more elegant way?" Skip this for simple, obvious fixes.

### Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them.
- Go fix failing CI tests without being told how.

## Core Features Checklist

### Must Have (Phase 1)
- [ ] Shadcn Mail 3-panel resizable layout
- [ ] Account switcher (2 Gmail accounts + unified "All" view)
- [ ] Unified inbox — emails from both accounts merged by date
- [ ] Email list with sender, subject, snippet, date, labels
- [ ] Email detail view with full HTML rendering
- [ ] Archive, Move to junk, Move to trash
- [ ] Snooze with date picker
- [ ] Reply, Reply all, Forward
- [ ] Star/unstar, Mark read/unread
- [ ] Compose email with rich text (Tiptap) and account selector
- [ ] Labels/folders navigation (Inbox, Sent, Drafts, Junk, Trash, Archive)
- [ ] Search across emails
- [ ] Sync emails from Gmail (full + delta)

### Nice to Have (Phase 2)
- Email threading / conversation view
- Keyboard shortcuts
- Scheduled send
- Draft auto-save
- Custom label creation
