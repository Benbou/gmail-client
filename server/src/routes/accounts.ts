import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import * as ee from '../lib/emailengine.js';
import { ApiError } from '../middleware/errorHandler.js';

export const accountsRouter = Router();

/**
 * GET /api/accounts
 * List all Gmail accounts for the authenticated user.
 */
accountsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;

    const { data: accounts, error } = await supabase
      .from('gmail_accounts')
      .select('id, user_id, email, emailengine_account_id, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Enrich with EE connection status
    const enriched = await Promise.all(
      (accounts || []).map(async (account) => {
        let sync_status = 'unknown';
        if (account.emailengine_account_id) {
          try {
            const info = await ee.getAccount(account.emailengine_account_id);
            sync_status = info.state || 'connected';
          } catch {
            sync_status = 'disconnected';
          }
        }
        return { ...account, sync_status };
      }),
    );

    res.json({ accounts: enriched });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/accounts/:id
 * Disconnect and delete a Gmail account.
 */
accountsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const accountId = req.params.id;

    // Verify ownership
    const { data: account, error: fetchErr } = await supabase
      .from('gmail_accounts')
      .select('id, emailengine_account_id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !account) {
      throw ApiError.notFound('Account not found');
    }

    // Delete from EmailEngine
    if (account.emailengine_account_id) {
      try {
        await ee.deleteAccount(account.emailengine_account_id);
      } catch {
        // Account may already be removed from EE, continue
      }
    }

    // Delete from our DB (cascades scheduled_actions, drafts)
    const { error: deleteErr } = await supabase
      .from('gmail_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteErr) throw deleteErr;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
