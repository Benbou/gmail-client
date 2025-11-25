# Supabase Setup Guide

This guide walks you through setting up the Supabase database for the Gmail client.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- A new Supabase project created

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name:** gmail-client
   - **Database Password:** (generate a strong password and save it)
   - **Region:** Choose closest to your users
4. Click "Create new project"
5. Wait for project initialization (~2 minutes)

## Step 2: Run Database Migrations

### Option A: Using SQL Editor (Recommended)

1. In your Supabase dashboard, navigate to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `migrations/20250122_001_initial_schema.sql`
4. Paste into the editor and click **Run**
5. You should see success messages confirming table creation
6. Create another new query
7. Copy the entire contents of `migrations/20250122_002_rls_policies.sql`
8. Paste and click **Run**
9. Verify RLS policies were created successfully

### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Step 3: Verify Tables

1. Go to **Table Editor** in Supabase dashboard
2. You should see 7 tables:
   - `users`
   - `gmail_accounts`
   - `emails`
   - `labels`
   - `scheduled_actions`
   - `drafts`
   - `sync_logs`

## Step 4: Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy the following values:

```bash
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbG...
service_role key: eyJhbG... (keep this SECRET!)
```

## Step 5: Configure Environment Variables

### Backend Environment

Create `/backend/.env` file:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG... # Use service_role key (NOT anon key)

# Gmail OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# JWT
JWT_SECRET=your_random_secret_min_32_chars

# Server
PORT=3000
NODE_ENV=development
```

### Frontend Environment

Create `/frontend/.env` file:

```bash
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG... # Use anon public key
```

## Step 6: Test Database Connection

Create a test file to verify connection:

```typescript
// backend/src/test-db.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testConnection() {
  const { data, error } = await supabase.from('users').select('count');
  
  if (error) {
    console.error('❌ Database connection failed:', error);
  } else {
    console.log('✅ Database connected successfully!');
    console.log('Users count:', data);
  }
}

testConnection();
```

Run test:
```bash
cd backend
npx tsx src/test-db.ts
```

## Step 7: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Gmail API**:
   - APIs & Services → Library → Search "Gmail API" → Enable
4. Create OAuth2 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Name: Gmail Client
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - Your production URL (later)
5. Copy **Client ID** and **Client Secret** to `.env`

## OAuth Scopes Required

Your app will request these Gmail scopes:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/userinfo.email`

## Database Schema Overview

### Tables

1. **users** - User accounts
2. **gmail_accounts** - Connected Gmail accounts (OAuth tokens)
3. **emails** - Synced email messages
4. **labels** - Gmail labels/categories
5. **scheduled_actions** - Snooze and send-later queue
6. **drafts** - Email drafts
7. **sync_logs** - Sync operation audit trail

### Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Backend uses `service_role` key to bypass RLS for sync operations

## Troubleshooting

### "relation does not exist"
- Make sure you ran both migration files in order
- Check SQL Editor for any error messages

### "permission denied for table"
- Verify RLS policies were created
- Backend should use `service_role` key, not `anon` key

### Can't connect from backend
- Check `SUPABASE_URL` has `https://` prefix
- Verify `SUPABASE_SERVICE_KEY` (not anon key)
- Check firewall/network settings

## Next Steps

After database setup:
1. ✅ Test backend connection
2. ✅ Configure OAuth credentials
3. 🔄 Implement authentication endpoints
4. 🔄 Build Gmail sync service
5. 🔄 Create frontend UI

---

**Need help?** Check the [Supabase docs](https://supabase.com/docs) or [Gmail API docs](https://developers.google.com/gmail/api)
