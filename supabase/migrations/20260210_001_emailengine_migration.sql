-- EmailEngine Migration
-- Removes custom sync/token infrastructure, adds EmailEngine account mapping.
-- EmailEngine handles: OAuth tokens, email sync, token refresh.

-- =====================================================
-- 1. Add EmailEngine mapping to gmail_accounts
-- =====================================================
ALTER TABLE gmail_accounts ADD COLUMN IF NOT EXISTS emailengine_account_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_accounts_ee_id
  ON gmail_accounts(emailengine_account_id)
  WHERE emailengine_account_id IS NOT NULL;

-- =====================================================
-- 2. Remove token/sync columns from gmail_accounts
--    (EmailEngine manages tokens and sync state)
-- =====================================================
ALTER TABLE gmail_accounts DROP COLUMN IF EXISTS access_token;
ALTER TABLE gmail_accounts DROP COLUMN IF EXISTS refresh_token;
ALTER TABLE gmail_accounts DROP COLUMN IF EXISTS token_expiry;
ALTER TABLE gmail_accounts DROP COLUMN IF EXISTS scopes;
ALTER TABLE gmail_accounts DROP COLUMN IF EXISTS sync_history_id;
ALTER TABLE gmail_accounts DROP COLUMN IF EXISTS sync_enabled;
ALTER TABLE gmail_accounts DROP COLUMN IF EXISTS last_sync_at;

-- =====================================================
-- 3. Adapt scheduled_actions for EmailEngine
--    email_id now stores EE message ID (string, not UUID FK)
-- =====================================================
ALTER TABLE scheduled_actions DROP CONSTRAINT IF EXISTS scheduled_actions_email_id_fkey;
ALTER TABLE scheduled_actions ALTER COLUMN email_id TYPE TEXT USING email_id::TEXT;
ALTER TABLE scheduled_actions ADD COLUMN IF NOT EXISTS ee_account_id TEXT;

-- =====================================================
-- 4. Adapt drafts (remove FK to emails table)
-- =====================================================
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_in_reply_to_fkey;

-- =====================================================
-- 5. Drop obsolete tables
--    (emails, labels, sync_logs are no longer stored locally)
-- =====================================================
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS labels CASCADE;
DROP TABLE IF EXISTS emails CASCADE;

-- =====================================================
-- 6. Unschedule pg_cron jobs (EE handles sync + refresh)
-- =====================================================
DO $$
BEGIN
  -- Only try to unschedule if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname IN ('gmail-sync', 'token-refresh', 'scheduled-actions');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unschedule skipped: %', SQLERRM;
END $$;

-- =====================================================
-- 7. Summary
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'EmailEngine migration complete.';
  RAISE NOTICE 'Removed: emails, labels, sync_logs tables';
  RAISE NOTICE 'Removed: token/sync columns from gmail_accounts';
  RAISE NOTICE 'Added: emailengine_account_id to gmail_accounts';
  RAISE NOTICE 'Added: ee_account_id to scheduled_actions';
  RAISE NOTICE 'Unscheduled: pg_cron jobs (sync, refresh, scheduled-actions)';
END $$;
