import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { authenticate } from '../../lib/auth';
import { ApiError, sendError } from '../../lib/errors';

/**
 * GET /api/sync/status/[accountId]
 * Get current sync status for an account
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check method
    if (req.method !== 'GET') {
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

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('gmail_accounts')
      .select('id, user_id, last_sync_at, sync_enabled')
      .eq('id', validAccountId)
      .single();

    if (accountError || !account) {
      throw ApiError.notFound('Gmail account');
    }

    if (account.user_id !== userId) {
      throw ApiError.forbidden('You do not have access to this account');
    }

    // Check if there's a running sync
    const { data: runningSync } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('gmail_account_id', validAccountId)
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Get last completed sync
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('gmail_account_id', validAccountId)
      .in('status', ['success', 'failed'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    res.status(200).json({
      status: {
        isRunning: !!runningSync,
        currentSync: runningSync || null,
        lastSync: lastSync || null,
        lastSyncAt: account.last_sync_at,
        syncEnabled: account.sync_enabled,
      },
    });
  } catch (error) {
    sendError(res, error as Error);
  }
}
