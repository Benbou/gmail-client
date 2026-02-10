import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import * as ee from '../lib/emailengine.js';
import { transformListMessage, transformFullMessage } from '../adapters/emailAdapter.js';
import { ApiError } from '../middleware/errorHandler.js';

export const emailsRouter = Router();

// Map frontend filter labels to EE mailbox paths
const LABEL_TO_PATH: Record<string, string> = {
  SENT: '[Gmail]/Sent Mail',
  SPAM: '[Gmail]/Spam',
  TRASH: '[Gmail]/Trash',
  SNOOZED: 'INBOX', // snoozed handled separately
  DRAFTS: '[Gmail]/Drafts',
};

interface GmailAccount {
  id: string;
  email: string;
  emailengine_account_id: string;
}

/**
 * Resolve active EE accounts for the current user.
 * Optionally filter to a single account.
 */
async function resolveAccounts(
  userId: string,
  accountId?: string,
): Promise<GmailAccount[]> {
  let query = supabase
    .from('gmail_accounts')
    .select('id, email, emailengine_account_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .not('emailengine_account_id', 'is', null);

  if (accountId) {
    query = query.eq('id', accountId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as GmailAccount[];
}

/**
 * GET /api/emails
 * List emails, optionally filtered by account, label, flags.
 * Merges across accounts by date when no account_id is specified.
 */
emailsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const {
      account_id,
      page = '1',
      limit = '50',
      label_id,
      is_read,
      is_starred,
      is_archived,
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSize = Math.min(100, parseInt(limit || '50', 10));
    const eePageIndex = pageNum - 1; // EE is 0-indexed

    const accounts = await resolveAccounts(userId, account_id);

    if (accounts.length === 0) {
      res.json({ emails: [], pagination: { page: pageNum, limit: pageSize, total: 0, totalPages: 0 } });
      return;
    }

    // Determine mailbox path
    let path = 'INBOX';
    if (label_id && LABEL_TO_PATH[label_id]) {
      path = LABEL_TO_PATH[label_id];
    } else if (label_id) {
      path = label_id; // custom label
    } else if (is_archived === 'true' || is_archived === undefined && label_id === undefined && is_starred === undefined) {
      // Default inbox = not archived
    }

    // Fetch from all accounts
    const results = await Promise.all(
      accounts.map(async (account) => {
        try {
          const data = await ee.listMessages(account.emailengine_account_id, {
            path,
            page: eePageIndex,
            pageSize,
          });
          return {
            account,
            messages: data.messages || [],
            total: data.total || 0,
          };
        } catch {
          return { account, messages: [], total: 0 };
        }
      }),
    );

    // Transform and merge
    let allEmails = results.flatMap(({ account, messages }) =>
      messages.map((msg) => transformListMessage(msg, account.id, account.email)),
    );

    // Apply client-side filters that EE doesn't support natively
    if (is_starred === 'true') {
      allEmails = allEmails.filter((e) => e.is_starred);
    }
    if (is_read === 'true') {
      allEmails = allEmails.filter((e) => e.is_read);
    } else if (is_read === 'false') {
      allEmails = allEmails.filter((e) => !e.is_read);
    }
    if (is_archived === 'false') {
      allEmails = allEmails.filter((e) => !e.is_archived);
    }

    // Sort by date descending
    allEmails.sort((a, b) => {
      const da = new Date(a.received_at || 0).getTime();
      const db = new Date(b.received_at || 0).getTime();
      return db - da;
    });

    // Total across accounts (approximate for unified)
    const totalMessages = results.reduce((sum, r) => sum + r.total, 0);

    res.json({
      emails: allEmails,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emails/:id
 * Get full email detail. Requires ?account_id= query param.
 */
emailsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const messageId = req.params.id as string;
    const accountId = req.query.account_id as string | undefined;

    if (!accountId) {
      throw ApiError.badRequest('account_id query parameter is required');
    }

    const accounts = await resolveAccounts(userId, accountId);
    if (accounts.length === 0) {
      throw ApiError.notFound('Account not found');
    }
    const account = accounts[0];

    const msg = await ee.getMessage(account.emailengine_account_id, messageId);
    const email = transformFullMessage(msg, account.id, account.email);

    res.json(email);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emails/send
 * Send an email via EmailEngine.
 */
emailsRouter.post('/send', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const {
      gmail_account_id,
      to_emails,
      cc_emails,
      bcc_emails,
      subject,
      body_html,
      in_reply_to,
    } = req.body;

    if (!gmail_account_id || !to_emails?.length || !subject) {
      throw ApiError.badRequest('gmail_account_id, to_emails, and subject are required');
    }

    const accounts = await resolveAccounts(userId, gmail_account_id);
    if (accounts.length === 0) {
      throw ApiError.notFound('Account not found');
    }
    const account = accounts[0];

    const message: Parameters<typeof ee.submitMessage>[1] = {
      to: to_emails.map((addr: string) => ({ address: addr })),
      subject,
      html: body_html,
    };

    if (cc_emails?.length) {
      message.cc = cc_emails.map((addr: string) => ({ address: addr }));
    }
    if (bcc_emails?.length) {
      message.bcc = bcc_emails.map((addr: string) => ({ address: addr }));
    }
    if (in_reply_to) {
      message.reference = { message: in_reply_to, action: 'reply' };
    }

    const result = await ee.submitMessage(account.emailengine_account_id, message);

    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    next(err);
  }
});
