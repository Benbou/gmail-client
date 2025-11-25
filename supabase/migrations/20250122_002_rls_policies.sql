-- Row Level Security (RLS) Policies
-- Run this after creating the schema

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: users
-- =====================================================
-- Users can read their own data
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- =====================================================
-- POLICIES: gmail_accounts
-- =====================================================
-- Users can view their own Gmail accounts
CREATE POLICY "Users can view own Gmail accounts"
    ON gmail_accounts FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own Gmail accounts
CREATE POLICY "Users can add Gmail accounts"
    ON gmail_accounts FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own Gmail accounts
CREATE POLICY "Users can update own Gmail accounts"
    ON gmail_accounts FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own Gmail accounts
CREATE POLICY "Users can delete own Gmail accounts"
    ON gmail_accounts FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- POLICIES: emails
-- =====================================================
-- Users can view emails from their Gmail accounts
CREATE POLICY "Users can view emails from their accounts"
    ON emails FOR SELECT
    USING (
        gmail_account_id IN (
            SELECT id FROM gmail_accounts WHERE user_id = auth.uid()
        )
    );

-- Users can update emails from their accounts
CREATE POLICY "Users can update emails from their accounts"
    ON emails FOR UPDATE
    USING (
        gmail_account_id IN (
            SELECT id FROM gmail_accounts WHERE user_id = auth.uid()
        )
    );

-- Users can delete emails from their accounts
CREATE POLICY "Users can delete emails from their accounts"
    ON emails FOR DELETE
    USING (
        gmail_account_id IN (
            SELECT id FROM gmail_accounts WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- POLICIES: labels
-- =====================================================
-- Users can view labels from their Gmail accounts
CREATE POLICY "Users can view labels from their accounts"
    ON labels FOR SELECT
    USING (
        gmail_account_id IN (
            SELECT id FROM gmail_accounts WHERE user_id = auth.uid()
        )
    );

-- Users can manage labels from their accounts
CREATE POLICY "Users can manage labels from their accounts"
    ON labels FOR ALL
    USING (
        gmail_account_id IN (
            SELECT id FROM gmail_accounts WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- POLICIES: scheduled_actions
-- =====================================================
-- Users can view their own scheduled actions
CREATE POLICY "Users can view own scheduled actions"
    ON scheduled_actions FOR SELECT
    USING (user_id = auth.uid());

-- Users can create their own scheduled actions
CREATE POLICY "Users can create scheduled actions"
    ON scheduled_actions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own scheduled actions
CREATE POLICY "Users can update own scheduled actions"
    ON scheduled_actions FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own scheduled actions
CREATE POLICY "Users can delete own scheduled actions"
    ON scheduled_actions FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- POLICIES: drafts
-- =====================================================
-- Users can view their own drafts
CREATE POLICY "Users can view own drafts"
    ON drafts FOR SELECT
    USING (user_id = auth.uid());

-- Users can create drafts
CREATE POLICY "Users can create drafts"
    ON drafts FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
    ON drafts FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
    ON drafts FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- POLICIES: sync_logs
-- =====================================================
-- Users can view sync logs for their Gmail accounts
CREATE POLICY "Users can view sync logs for their accounts"
    ON sync_logs FOR SELECT
    USING (
        gmail_account_id IN (
            SELECT id FROM gmail_accounts WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICE ROLE BYPASS
-- =====================================================
-- Service role can bypass all RLS policies (for backend operations)
-- This is automatically enabled for queries using the service_role key

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Row Level Security policies created successfully!';
    RAISE NOTICE 'All tables are now secured with RLS.';
END $$;
