import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { authenticate } from '../../lib/auth';
import { ApiError, sendError } from '../../lib/errors';
import { syncTriggerSchema, SyncTriggerBody } from '../../lib/validations';
import { gmailSyncService } from '../../services/gmail-sync';

/**
 * POST /api/sync/[accountId]
 * Trigger manual sync for an account
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
    const { accountId } = req.query;

    // Validate UUID
    const uuidSchema = z.string().uuid();
    const validation = uuidSchema.safeParse(accountId);
    if (!validation.success) {
      throw ApiError.badRequest('Invalid account ID');
    }

    const validAccountId = validation.data;

    // Validate body
    const bodyValidation = syncTriggerSchema.safeParse(req.body);
    const { syncType } = bodyValidation.success
      ? (bodyValidation.data as SyncTriggerBody)
      : { syncType: 'delta' as const };

    // Verify account exists and belongs to user
    const { data: account, error } = await supabase
      .from('gmail_accounts')
      .select('id, user_id, email, sync_enabled')
      .eq('id', validAccountId)
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

    // Trigger sync in background (don't wait for completion)
    gmailSyncService
      .syncAccount({ accountId: validAccountId, syncType })
      .catch((err) => console.error('Sync failed:', err));

    res.status(200).json({
      message: 'Sync started',
      accountId: validAccountId,
      email: account.email,
      syncType,
    });
  } catch (error) {
    sendError(res, error as Error);
  }
}
