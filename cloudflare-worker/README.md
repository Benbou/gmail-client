# Cloudflare Worker - Gmail Client Cron Jobs

This Cloudflare Worker provides **FREE** cron job triggers for the Gmail Client backend on Vercel.

## Architecture

```
Cloudflare Worker (FREE)
  ├─ Cron: */2 * * * * (every 2 min)  → POST /api/workers/sync
  ├─ Cron: */5 * * * * (every 5 min)  → POST /api/workers/refresh-tokens
  └─ Cron: * * * * * (every 1 min)    → POST /api/workers/scheduled-actions
```

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Install Dependencies

```bash
cd cloudflare-worker
npm install
```

### 4. Configure Environment

Edit `wrangler.toml` and update:

```toml
[vars]
API_URL = "https://your-app.vercel.app"  # Your Vercel deployment URL
```

### 5. Set Secrets

Generate a random secret and set it:

```bash
# Generate secret
openssl rand -base64 32

# Set the secret
npm run secret:cron
# Then paste the generated secret
```

**IMPORTANT**: Use the **same secret** in Vercel environment variables as `CRON_SECRET`.

### 6. Deploy

```bash
npm run deploy
```

## Verification

After deployment:

1. Check Cloudflare Dashboard → Workers & Pages → `gmail-client-cron`
2. Go to "Triggers" tab
3. Verify 3 cron triggers are listed
4. Check "Logs" tab to see execution logs

## Cron Schedules

| Cron Expression | Frequency | Endpoint | Purpose |
|----------------|-----------|----------|---------|
| `*/2 * * * *` | Every 2 min | `/api/workers/sync` | Sync emails from Gmail |
| `*/5 * * * *` | Every 5 min | `/api/workers/refresh-tokens` | Refresh expiring OAuth tokens |
| `* * * * *` | Every 1 min | `/api/workers/scheduled-actions` | Process snooze/send-later |

## Testing

You can manually trigger the worker:

```bash
wrangler dev
```

## Cost

**$0/month** - Cloudflare Workers Free tier includes:
- 100,000 requests/day
- Unlimited cron triggers
- 10ms CPU time per request

Our usage: ~2,880 requests/day (well within free tier)

## Troubleshooting

### Worker not triggering

- Check cron triggers in Cloudflare Dashboard
- Verify `API_URL` in `wrangler.toml`
- Check worker logs for errors

### 401 Unauthorized

- Verify `CRON_SECRET` matches between Cloudflare and Vercel
- Check Authorization header format: `Bearer <secret>`

### Endpoint not found

- Verify Vercel deployment includes `/api/workers/` routes
- Check Vercel function logs

## Security

The worker authenticates with the backend using a shared secret (`CRON_SECRET`):

1. Worker sends: `Authorization: Bearer <CRON_SECRET>`
2. Backend verifies secret matches
3. If valid, processes the request

This prevents unauthorized cron triggers.
