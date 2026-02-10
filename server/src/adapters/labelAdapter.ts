import type { EEMailbox } from '../lib/emailengine.js';

/**
 * Frontend Label interface (must stay in sync with frontend/src/types/index.ts)
 */
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

// Gmail system mailbox paths
const SYSTEM_MAILBOXES = new Set([
  'INBOX',
  '[Gmail]/All Mail',
  '[Gmail]/Drafts',
  '[Gmail]/Important',
  '[Gmail]/Sent Mail',
  '[Gmail]/Spam',
  '[Gmail]/Starred',
  '[Gmail]/Trash',
]);

/**
 * Transform an EmailEngine mailbox to frontend Label format.
 */
export function transformMailbox(
  mailbox: EEMailbox,
  gmailAccountId: string,
): Label {
  const isSystem = SYSTEM_MAILBOXES.has(mailbox.path) || !!mailbox.specialUse;
  const now = new Date().toISOString();

  return {
    id: `${gmailAccountId}:${mailbox.path}`,
    gmail_account_id: gmailAccountId,
    gmail_label_id: mailbox.path,
    name: mailbox.name,
    type: isSystem ? 'system' : 'user',
    is_visible: mailbox.listed,
    message_count: mailbox.status?.messages ?? 0,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Transform all mailboxes for a given account.
 */
export function transformMailboxes(
  mailboxes: EEMailbox[],
  gmailAccountId: string,
): Label[] {
  return mailboxes.map((mb) => transformMailbox(mb, gmailAccountId));
}
