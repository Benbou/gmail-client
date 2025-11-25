-- Gmail Client Database Schema
-- Run this migration in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- TABLE: gmail_accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS gmail_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    access_token TEXT, -- Encrypted in application
    refresh_token TEXT, -- Encrypted in application
    token_expiry TIMESTAMPTZ,
    scopes TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    sync_history_id TEXT, -- Gmail history ID for delta sync
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, email)
);

-- Indexes for gmail_accounts
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_active_sync ON gmail_accounts(is_active, sync_enabled) WHERE is_active = TRUE AND sync_enabled = TRUE;

-- =====================================================
-- TABLE: emails
-- =====================================================
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gmail_account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    gmail_message_id TEXT NOT NULL, -- Gmail's unique message ID
    gmail_thread_id TEXT,
    subject TEXT,
    from_email TEXT,
    from_name TEXT,
    to_emails TEXT[],
    cc_emails TEXT[],
    bcc_emails TEXT[],
    snippet TEXT, -- Preview text
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    label_ids TEXT[], -- Gmail label IDs
    attachments JSONB[], -- Array of attachment metadata
    headers JSONB, -- Important email headers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(gmail_account_id, gmail_message_id)
);

-- Indexes for emails
CREATE INDEX IF NOT EXISTS idx_emails_account_received ON emails(gmail_account_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_read_archived ON emails(is_read, is_archived);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_to_gin ON emails USING GIN(to_emails);
CREATE INDEX IF NOT EXISTS idx_emails_labels_gin ON emails USING GIN(label_ids);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_emails_search ON emails USING GIN(
    to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(body_text, '') || ' ' || COALESCE(from_email, ''))
);

-- =====================================================
-- TABLE: labels
-- =====================================================
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gmail_account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    gmail_label_id TEXT NOT NULL, -- Gmail's label ID
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('system', 'user')),
    color TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(gmail_account_id, gmail_label_id)
);

-- Indexes for labels
CREATE INDEX IF NOT EXISTS idx_labels_account_id ON labels(gmail_account_id);
CREATE INDEX IF NOT EXISTS idx_labels_visible ON labels(is_visible) WHERE is_visible = TRUE;

-- =====================================================
-- TABLE: scheduled_actions
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gmail_account_id UUID REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('snooze', 'send_later')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payload JSONB DEFAULT '{}', -- Action-specific data
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduled_actions
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_user_status ON scheduled_actions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_scheduled ON scheduled_actions(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_type_status ON scheduled_actions(action_type, status);

-- =====================================================
-- TABLE: drafts
-- =====================================================
CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gmail_account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    in_reply_to UUID REFERENCES emails(id) ON DELETE SET NULL,
    subject TEXT,
    to_emails TEXT[],
    cc_emails TEXT[],
    bcc_emails TEXT[],
    body_html TEXT,
    body_text TEXT,
    attachments JSONB[],
    is_scheduled BOOLEAN DEFAULT FALSE,
    scheduled_action_id UUID REFERENCES scheduled_actions(id) ON DELETE SET NULL,
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for drafts
CREATE INDEX IF NOT EXISTS idx_drafts_user_account ON drafts(user_id, gmail_account_id);
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at DESC);

-- =====================================================
-- TABLE: sync_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gmail_account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'delta')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    emails_synced INTEGER DEFAULT 0,
    errors JSONB[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_started ON sync_logs(gmail_account_id, started_at DESC);

-- =====================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_accounts_updated_at BEFORE UPDATE ON gmail_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON labels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_actions_updated_at BEFORE UPDATE ON scheduled_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Gmail Client database schema created successfully!';
    RAISE NOTICE 'Tables created: users, gmail_accounts, emails, labels, scheduled_actions, drafts, sync_logs';
END $$;
