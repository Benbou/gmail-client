export interface User {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    preferences?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface GmailAccount {
    id: string;
    user_id: string;
    email: string;
    is_active: boolean;
    sync_enabled: boolean;
    last_sync_at?: string;
    created_at: string;
    updated_at: string;
}

export interface Email {
    id: string;
    gmail_account_id: string;
    gmail_message_id: string;
    gmail_thread_id?: string;
    subject?: string;
    from_email?: string;
    from_name?: string;
    to_emails?: string[];
    cc_emails?: string[];
    bcc_emails?: string[];
    snippet?: string;
    body_text?: string;
    body_html?: string;
    received_at?: string;
    is_read: boolean;
    is_starred: boolean;
    is_archived: boolean;
    label_ids?: string[];
    attachments?: any[];
    headers?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Label {
    id: string;
    gmail_account_id: string;
    gmail_label_id: string;
    name: string;
    type: 'system' | 'user';
    color?: string;
    is_visible: boolean;
    message_count: number;
    created_at: string;
    updated_at: string;
}

export interface ScheduledAction {
    id: string;
    user_id: string;
    gmail_account_id?: string;
    email_id?: string;
    action_type: 'snooze' | 'send_later';
    scheduled_at: string;
    executed_at?: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    payload?: Record<string, any>;
    error_message?: string;
    created_at: string;
    updated_at: string;
}

export interface Draft {
    id: string;
    user_id: string;
    gmail_account_id: string;
    in_reply_to?: string;
    subject?: string;
    to_emails?: string[];
    cc_emails?: string[];
    bcc_emails?: string[];
    body_html?: string;
    body_text?: string;
    attachments?: any[];
    is_scheduled: boolean;
    scheduled_action_id?: string;
    last_saved_at: string;
    created_at: string;
    updated_at: string;
}

export interface SyncLog {
    id: string;
    gmail_account_id: string;
    sync_type: 'full' | 'delta';
    started_at: string;
    completed_at?: string;
    status: 'running' | 'success' | 'failed';
    emails_synced: number;
    errors?: any[];
    created_at: string;
}

export interface EmailListParams {
    userId: string;
    account_id?: string;
    page?: number;
    limit?: number;
    is_read?: boolean;
    is_starred?: boolean;
    is_archived?: boolean;
    label_id?: string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
