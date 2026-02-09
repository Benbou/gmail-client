import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { authenticate } from '../../lib/auth';
import { ApiError, sendError } from '../../lib/errors';
import { gmailSyncService } from '../../services/gmail-sync';

/**
 * POST /api/accounts/[id]/sync
 * Trigger manual sync for account
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check method
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Authenticate user
    const authResult = await authenticate(req);
    if (authResult.error || !authResult.userId) {
      throw ApiError.unauthorized(authResult.error || 'Unauthorized');
    }

    const userId = authResult.userId;
    const { id } = req.query;

    // Validate UUID
    const uuidSchema = z.string().uuid();
    const validation = uuidSchema.safeParse(id);
    if (!validation.success) {
      throw ApiError.badRequest('Invalid account ID');
    }

    const accountId = validation.data;
    const { syncType = 'delta' } = req.body;

    // Verify ownership and get account details
    const { data: account, error } = await supabase
      .from('gmail_accounts')
      .select('id, user_id, email, sync_enabled')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      throw ApiError.notFound('Gmail account');
    }

    if (account.user_id !== userId) {
      throw ApiError.forbidden('You do not have access to this account');
    }

    if (!account.sync_enabled) {
      throw ApiError.badRequest('Sync is disabled for this account');
    }

    // Trigger sync in background
    gmailSyncService
      .syncAccount({ accountId, syncType })
      .catch((err) => console.error('Manual sync failed:', err));

    res.status(200).json({
      message: 'Sync started',
      accountId,
      email: account.email,
    });
  } catch (error) {
    sendError(res, error as Error);
  }
}
