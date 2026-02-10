import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import * as ee from '../lib/emailengine.js';
import { transformMailboxes } from '../adapters/labelAdapter.js';
import { ApiError } from '../middleware/errorHandler.js';

export const labelsRouter = Router();

/**
 * GET /api/labels
 * List labels (mailboxes) for a specific account or all accounts.
 */
labelsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const accountId = req.query.accountId as string | undefined;

    let query = supabase
      .from('gmail_accounts')
      .select('id, email, emailengine_account_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('emailengine_account_id', 'is', null);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error } = await query;
    if (error) throw error;
    if (!accounts?.length) {
      res.json({ labels: [] });
      return;
    }

    const allLabels = await Promise.all(
      accounts.map(async (account) => {
        try {
          const mailboxes = await ee.getMailboxes(account.emailengine_account_id);
          return transformMailboxes(mailboxes, account.id);
        } catch {
          return [];
        }
      }),
    );

    res.json({ labels: allLabels.flat() });
  } catch (err) {
    next(err);
  }
});
