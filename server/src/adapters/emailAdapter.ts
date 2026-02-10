import type { EEMessageListItem, EEMessage } from '../lib/emailengine.js';

/**
 * Frontend Email interface (must stay in sync with frontend/src/types/index.ts)
 */
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
  gmail_accounts?: {
    email?: string;
    account_email?: string;
  };
}

/**
 * Transform an EmailEngine list message to frontend Email format.
 */
export function transformListMessage(
  msg: EEMessageListItem,
  gmailAccountId: string,
  accountEmail: string,
): Email {
  const flags = msg.flags || [];
  const labels = msg.labels || [];

  return {
    id: msg.id,
    gmail_account_id: gmailAccountId,
    gmail_message_id: msg.emailId || msg.messageId,
    gmail_thread_id: msg.threadId,
    subject: msg.subject,
    from_email: msg.from?.address,
    from_name: msg.from?.name,
    to_emails: msg.to?.map((t) => t.address),
    cc_emails: msg.cc?.map((c) => c.address),
    bcc_emails: msg.bcc?.map((b) => b.address),
    snippet: msg.intro,
    received_at: msg.date,
    is_read: flags.includes('\\Seen'),
    is_starred: flags.includes('\\Flagged'),
    is_archived: !labels.includes('\\Inbox'),
    label_ids: labels,
    attachments: msg.attachments?.map((a) => ({
      id: a.id,
      filename: a.filename,
      contentType: a.contentType,
      size: a.encodedSize,
    })),
    created_at: msg.date,
    updated_at: msg.date,
    gmail_accounts: {
      email: accountEmail,
      account_email: accountEmail,
    },
  };
}

/**
 * Transform an EmailEngine full message to frontend Email format (includes body).
 */
export function transformFullMessage(
  msg: EEMessage,
  gmailAccountId: string,
  accountEmail: string,
): Email {
  const base = transformListMessage(msg, gmailAccountId, accountEmail);
  return {
    ...base,
    body_html: msg.text?.html,
    body_text: msg.text?.plain,
    headers: msg.headers,
  };
}
