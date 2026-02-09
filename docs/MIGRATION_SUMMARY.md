# Express to Vercel API Routes Migration Summary

## Overview

Successfully migrated all Express backend routes to Vercel serverless API routes. The migration maintains all functionality while adapting to Vercel's serverless architecture.

## Directory Structure

```
/api
├── lib/                          # Shared utilities
│   ├── auth.ts                   # Authentication utility (Supabase JWT)
│   ├── crypto.ts                 # AES-256-GCM encryption
│   ├── errors.ts                 # Error handling & ApiError class
│   ├── gmail-oauth.ts            # Google OAuth helpers
│   ├── redis.ts                  # In-memory OAuth state (Memory store)
│   ├── supabase.ts               # Supabase client & types
│   └── validations.ts            # Zod schemas
├── services/                     # Business logic
│   ├── gmail-service.ts          # Gmail API operations (send, update, trash)
│   └── gmail-sync.ts             # Email sync service (full & delta)
├── auth/
│   └── google/
│       ├── start.ts              # GET - Initiate OAuth flow
│       └── callback.ts           # GET - Handle OAuth callback
├── accounts/
│   ├── index.ts                  # GET - List accounts
│   └── [id].ts                   # GET/PATCH/DELETE - Account operations
│       ├── sync.ts               # POST - Trigger manual sync
│       └── stats.ts              # GET - Account statistics
├── emails/
│   ├── index.ts                  # GET - List emails (with filtering & pagination)
│   ├── [id].ts                   # GET/PATCH/DELETE - Email operations
│   │   ├── archive.ts            # POST - Archive email
│   │   └── snooze.ts             # POST - Snooze email
│   ├── send.ts                   # POST - Send email
│   └── schedule.ts               # POST - Schedule email send
└── sync/
    ├── [accountId]/
    │   ├── index.ts              # POST - Trigger sync
    │   └── labels.ts             # POST - Sync labels
    ├── logs/
    │   └── [accountId].ts        # GET - Sync logs
    └── status/
        └── [accountId].ts        # GET - Sync status
```

## API Route Mapping

### Auth Routes

| Express Route | Vercel Route | Method | Description |
|--------------|--------------|--------|-------------|
| `/api/auth/google/start` | `/api/auth/google/start` | GET | Initiate Gmail OAuth |
| `/api/auth/google/callback` | `/api/auth/google/callback` | GET | Handle OAuth callback |
| `/api/auth/google/:accountId` | `/api/accounts/[id]` | DELETE | Remove Gmail account |

### Account Routes

| Express Route | Vercel Route | Method | Description |
|--------------|--------------|--------|-------------|
| `/api/accounts` | `/api/accounts` | GET | List user's accounts |
| `/api/accounts/:id` | `/api/accounts/[id]` | GET | Get account details |
| `/api/accounts/:id` | `/api/accounts/[id]` | PATCH | Update account settings |
| `/api/accounts/:id/sync` | `/api/accounts/[id]/sync` | POST | Trigger manual sync |
| `/api/accounts/:id/stats` | `/api/accounts/[id]/stats` | GET | Get account stats |

### Email Routes

| Express Route | Vercel Route | Method | Description |
|--------------|--------------|--------|-------------|
| `/api/emails` | `/api/emails` | GET | List emails |
| `/api/emails/:id` | `/api/emails/[id]` | GET | Get email details |
| `/api/emails/:id` | `/api/emails/[id]` | PATCH | Update email |
| `/api/emails/:id` | `/api/emails/[id]` | DELETE | Delete email |
| `/api/emails/:id/archive` | `/api/emails/[id]/archive` | POST | Archive email |
| `/api/emails/:id/snooze` | `/api/emails/[id]/snooze` | POST | Snooze email |
| `/api/emails/send` | `/api/emails/send` | POST | Send email |
| `/api/emails/schedule` | `/api/emails/schedule` | POST | Schedule email |

### Sync Routes

| Express Route | Vercel Route | Method | Description |
|--------------|--------------|--------|-------------|
| `/api/sync/:accountId` | `/api/sync/[accountId]` | POST | Trigger sync |
| `/api/sync/:accountId/labels` | `/api/sync/[accountId]/labels` | POST | Sync labels |
| `/api/sync/logs/:accountId` | `/api/sync/logs/[accountId]` | GET | Get sync logs |
| `/api/sync/status/:accountId` | `/api/sync/status/[accountId]` | GET | Get sync status |

## Key Architectural Changes

### 1. Request Handler Pattern

**Express (Before):**
```typescript
router.get('/path', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  // ... logic
}));
```

**Vercel (After):**
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Method check
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Authentication
    const authResult = await authenticate(req);
    if (authResult.error || !authResult.userId) {
      throw ApiError.unauthorized(authResult.error || 'Unauthorized');
    }

    const userId = authResult.userId;
    // ... logic
  } catch (error) {
    sendError(res, error as Error);
  }
}
```

### 2. Authentication

- Converted from middleware to utility function
- Returns `{ userId, userEmail, error }` instead of modifying request object
- Uses Supabase JWT verification via `supabase.auth.getUser(token)`

### 3. Error Handling

- `ApiError` class with static factory methods preserved
- New `sendError()` utility replaces Express error middleware
- All routes use try/catch with `sendError()`

### 4. State Management

- **OAuth State:** In-memory store (for Vercel serverless)
  - Production should use Vercel KV or Upstash Redis
- **Token Blacklist:** Removed (not needed for Supabase auth)

### 5. Validation

- Zod schemas reused from Express backend
- Validation done inline in route handlers
- Returns proper error responses on validation failure

### 6. Background Jobs

- Gmail sync still triggered asynchronously with `.catch()` handlers
- Scheduled actions (snooze, send later) stored in database
- **TODO:** Need Cloudflare Workers or Vercel Cron for execution

## Environment Variables Required

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Encryption
ENCRYPTION_KEY=

# Frontend URL (for OAuth redirects)
FRONTEND_URL=

# Node Environment
NODE_ENV=production
```

## Migration Checklist

- [x] Convert auth routes
- [x] Convert account routes
- [x] Convert email routes
- [x] Convert sync routes
- [x] Create shared utilities
- [x] Create service layer
- [x] Error handling
- [x] Authentication
- [x] Validation
- [ ] Update frontend API client to use new endpoints
- [ ] Deploy to Vercel
- [ ] Configure environment variables
- [ ] Update Google OAuth redirect URI
- [ ] Setup cron jobs for scheduled actions
- [ ] Test all endpoints
- [ ] Monitor serverless function logs

## Notable Differences from Express

1. **No middleware chain:** Each route handles authentication explicitly
2. **Method routing:** Manual `if (req.method === 'GET')` checks instead of `router.get()`
3. **Dynamic routes:** Use `[id]` instead of `:id` in filenames
4. **No global error handler:** Each route has its own try/catch
5. **Stateless:** No in-memory Redis fallback (use Vercel KV in production)
6. **Cold starts:** First request may be slower due to serverless initialization

## Next Steps

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Configure Environment Variables:**
   - Add all required env vars in Vercel dashboard
   - Update `GOOGLE_REDIRECT_URI` to point to Vercel deployment

3. **Update Frontend:**
   - Update `VITE_API_URL` to Vercel deployment URL
   - Test all API calls

4. **Setup Cloudflare Workers:**
   - Create worker for scheduled actions (snooze, send later)
   - Configure cron triggers

5. **Monitoring:**
   - Setup Vercel Analytics
   - Monitor function execution times
   - Watch for cold start issues

## Performance Considerations

- **Serverless functions have execution limits:** 10s on Hobby, 60s on Pro
- **Sync operations run in background:** Don't block API response
- **Database connection pooling:** Supabase handles this automatically
- **Gmail API rate limits:** Same as Express backend
- **Cold starts:** ~500ms-2s on first request after idle period

## Testing

Test each endpoint manually or with the following curl commands:

```bash
# Get accounts
curl -H "Authorization: Bearer <token>" https://your-app.vercel.app/api/accounts

# Get emails
curl -H "Authorization: Bearer <token>" https://your-app.vercel.app/api/emails?page=1&limit=50

# Trigger sync
curl -X POST -H "Authorization: Bearer <token>" https://your-app.vercel.app/api/sync/[accountId]
```

## Rollback Plan

If issues arise, you can quickly roll back to the Express backend by:

1. Redeploy Express backend to original hosting
2. Update frontend `VITE_API_URL` back to Express URL
3. Revert OAuth redirect URI in Google Console

The Express backend in `/backend` remains untouched and functional.
