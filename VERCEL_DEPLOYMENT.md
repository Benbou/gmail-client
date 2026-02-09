# Vercel Deployment Guide

## Prerequisites

1. Vercel account (sign up at vercel.com)
2. Vercel CLI installed: `npm install -g vercel`
3. All environment variables ready

## Step 1: Install Dependencies

The API routes need the following dependencies. Make sure they're in your root `package.json`:

```bash
npm install @vercel/node @supabase/supabase-js googleapis zod ioredis
npm install -D @types/node typescript
```

## Step 2: Create vercel.json

Create `/Users/benjaminbouquet/Documents/gmail-client/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "frontend/dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Step 3: Update package.json

Update the root `package.json` to include a build script:

```json
{
  "name": "gmail-client",
  "version": "1.0.0",
  "scripts": {
    "build": "cd frontend && npm install && npm run build",
    "vercel-build": "npm run build"
  },
  "dependencies": {
    "@vercel/node": "^3.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "googleapis": "^131.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

## Step 4: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Login to Vercel
vercel login

# Deploy to production
cd /Users/benjaminbouquet/Documents/gmail-client
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project settings:
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: `npm run vercel-build`
   - Output Directory: `frontend/dist`
4. Click "Deploy"

## Step 5: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-service-key>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
ENCRYPTION_KEY=<your-32-char-encryption-key>
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Important:** After adding environment variables, redeploy the application.

## Step 6: Update Google OAuth Settings

1. Go to Google Cloud Console
2. Navigate to APIs & Services → Credentials
3. Update OAuth 2.0 Client:
   - Authorized redirect URIs: Add `https://your-app.vercel.app/api/auth/google/callback`

## Step 7: Update Frontend Environment Variables

Create `frontend/.env.production`:

```
VITE_API_URL=https://your-app.vercel.app
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Step 8: Test Deployment

Test key endpoints:

```bash
# Health check (if you have one)
curl https://your-app.vercel.app/api/health

# Get accounts (requires auth)
curl -H "Authorization: Bearer <token>" https://your-app.vercel.app/api/accounts

# Start OAuth flow
curl -H "Authorization: Bearer <token>" https://your-app.vercel.app/api/auth/google/start
```

## Troubleshooting

### Issue: 404 on API routes

**Solution:** Check that your `vercel.json` routing is correct and that TypeScript files are being built.

### Issue: Environment variables not working

**Solution:**
1. Verify they're set in Vercel Dashboard
2. Redeploy after adding/changing env vars
3. Check function logs in Vercel Dashboard

### Issue: Cold start timeouts

**Solution:**
- Upgrade to Vercel Pro for 60s execution limit
- Optimize service initialization
- Consider warming functions with a cron job

### Issue: Gmail API rate limits

**Solution:**
- Implement exponential backoff
- Use delta sync instead of full sync
- Add request queuing

## Monitoring

1. **Function Logs:**
   - Vercel Dashboard → Deployment → Functions tab
   - View real-time logs and errors

2. **Analytics:**
   - Enable Vercel Analytics in project settings
   - Monitor request volume and errors

3. **Error Tracking:**
   - Consider adding Sentry or similar
   - Monitor function execution times

## Performance Optimization

1. **Reduce Cold Starts:**
   - Minimize dependencies
   - Use dynamic imports for heavy libraries
   - Consider Edge Functions for critical paths

2. **Database Connection Pooling:**
   - Supabase handles this automatically
   - Use connection pooler URL if available

3. **Caching:**
   - Use Vercel Edge Cache for static responses
   - Implement Redis/KV for session data

## Cost Estimates

**Vercel Pricing (Hobby/Free Tier):**
- 100 GB bandwidth/month
- 100 hours function execution/month
- 10s max function duration

**Vercel Pro ($20/month):**
- 1 TB bandwidth/month
- 1000 hours function execution/month
- 60s max function duration
- Team collaboration

**Recommendations:**
- Start with Hobby tier for testing
- Upgrade to Pro when you have 10+ users
- Monitor function execution times closely

## Next Steps

1. Setup Cloudflare Workers for scheduled actions
2. Implement error tracking (Sentry)
3. Add monitoring and alerting
4. Setup staging environment
5. Create backup/restore procedures

## Rollback Procedure

If deployment fails or has issues:

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy specific deployment
vercel --prod <deployment-url>
```

## Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Vercel API Routes](https://vercel.com/docs/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Limits](https://vercel.com/docs/concepts/limits/overview)
