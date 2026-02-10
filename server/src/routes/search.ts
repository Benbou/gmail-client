import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import * as ee from '../lib/emailengine.js';
import { transformListMessage } from '../adapters/emailAdapter.js';
import { ApiError } from '../middleware/errorHandler.js';

export const searchRouter = Router();

/**
 * POST /api/search
 * Search emails across one or all accounts.
 */
searchRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { query, account_id, page = 1, limit = 50 } = req.body;

    if (!query) throw ApiError.badRequest('query is required');

    let dbQuery = supabase
      .from('gmail_accounts')
      .select('id, email, emailengine_account_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('emailengine_account_id', 'is', null);

    if (account_id) {
      dbQuery = dbQuery.eq('id', account_id);
    }

    const { data: accounts, error } = await dbQuery;
    if (error) throw error;
    if (!accounts?.length) {
      res.json({ emails: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      return;
    }

    const results = await Promise.all(
      accounts.map(async (account) => {
        try {
          const data = await ee.searchMessages(
            account.emailengine_account_id,
            query,
            { page: page - 1, pageSize: limit },
          );
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

    const emails = results.flatMap(({ account, messages }) =>
      messages.map((msg) => transformListMessage(msg, account.id, account.email)),
    );

    // Sort by date descending
    emails.sort((a, b) => {
      const da = new Date(a.received_at || 0).getTime();
      const db = new Date(b.received_at || 0).getTime();
      return db - da;
    });

    const totalMessages = results.reduce((sum, r) => sum + r.total, 0);

    res.json({
      emails,
      pagination: {
        page,
        limit,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});
